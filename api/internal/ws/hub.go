package ws

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"kollab/api/internal/domain"
	"kollab/api/internal/lifecycle"
)

type Client struct {
	connectionID  string
	position      int
	anchor        int
	cursorVersion int64
	UserID        string                   `json:"userId"`
	Username      string                   `json:"username"`
	Color         string                   `json:"color"`
	DocID         string                   `json:"docId"`
	Conn          *websocket.Conn          `json:"-"`
	Send          chan []byte              `json:"-"`
	Hub           *Hub                     `json:"-"`
	Authorize     func(action string) bool `json:"-"`
}

type BroadcastMessage struct {
	DocID      string
	Payload    []byte
	Exclude    *Client
	IsSync     bool
	Content    string
	SyncUpdate string
	Version    int64
	Snapshot   bool
	RequestID  int64
}

type Room struct {
	presence string
	Clients  map[*Client]bool
	Version  int64
	Updates  []string // Accumulated base64 Yjs updates
}

type Hub struct {
	Cluster      domain.CollaborationCluster
	clusterEpoch string
	treeVersion  int64
	sync.RWMutex
	Rooms      map[string]*Room
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan BroadcastMessage
	docService domain.DocumentService
	Store      domain.CollaborationRepository
	generation uint64
}

type UserPresence struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	Color    string `json:"color"`
}

type WSMessage struct {
	Epoch     string         `json:"epoch,omitempty"`
	Content   string         `json:"content,omitempty"`
	Version   int64          `json:"version,omitempty"`
	RequestID int64          `json:"requestId,omitempty"`
	Snapshot  bool           `json:"snapshot,omitempty"`
	Error     string         `json:"error,omitempty"`
	Type      string         `json:"type"` // "join", "leave", "cursor", "presence", "sync", "sync-history"
	DocID     string         `json:"docId,omitempty"`
	Position  int            `json:"position,omitempty"`
	Anchor    int            `json:"anchor,omitempty"`
	UserID    string         `json:"userId,omitempty"`
	Username  string         `json:"username,omitempty"`
	Color     string         `json:"color,omitempty"`
	Users     []UserPresence `json:"users,omitempty"`
	Update    string         `json:"update,omitempty"`  // Base64 Yjs update blob
	Updates   []string       `json:"updates,omitempty"` // For sync-history
}

func NewHub(docService domain.DocumentService) *Hub {
	return &Hub{
		Rooms:      make(map[string]*Room),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan BroadcastMessage),
		docService: docService,
	}
}

func (h *Hub) Run() { h.RunContext(context.Background()) }

func (h *Hub) handleRegister(client *Client) {
	h.Lock()
	defer h.Unlock()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if !h.checkCluster(ctx) {
		if client.Conn != nil {
			client.Conn.Close()
		}
		return
	}

	room, ok := h.Rooms[client.DocID]
	if !ok {
		room = &Room{
			Clients: make(map[*Client]bool),
			Updates: make([]string, 0),
		}
		h.Rooms[client.DocID] = room
	}
	if h.Store != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		state, err := h.Store.LoadState(ctx, client.DocID)
		cancel()
		if err != nil {
			if client.Conn != nil {
				client.Conn.Close()
			}
			return
		}
		room.Version = state.Version
		room.Updates = nil
		if state.Update != "" {
			room.Updates = []string{state.Update}
		}
	}

	room.Clients[client] = true

	// Always send sync-history to the new client to coordinate initial content population
	historyMsg := WSMessage{
		Type:     "sync-history",
		Epoch:    h.clusterEpoch,
		Version:  room.Version,
		Snapshot: h.Store != nil,
		DocID:    client.DocID,
		Updates:  room.Updates,
	}
	if historyMsg.Updates == nil {
		historyMsg.Updates = make([]string, 0)
	}
	payload, err := json.Marshal(historyMsg)
	if err == nil {
		select {
		case client.Send <- payload:
		default:
			// channel blocked
		}
	}

	h.broadcastPresenceList(client.DocID)
}

func (h *Hub) handleUnregister(client *Client) {
	h.Lock()
	defer h.Unlock()

	if room, ok := h.Rooms[client.DocID]; ok {
		if _, exists := room.Clients[client]; exists {
			delete(room.Clients, client)
			cConn := client.Conn
			if cConn != nil {
				cConn.Close()
			}
			if len(room.Clients) == 0 {
				delete(h.Rooms, client.DocID)
				if h.Cluster != nil {
					ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
					_, _ = h.Cluster.Members(ctx, client.DocID, nil)
					cancel()
				}
				// Spawn session ended auto-save if docService is configured
				if h.docService != nil {
					go h.autoSaveSession(client.DocID, client.UserID, h.generation)
				}
			} else {
				h.broadcastPresenceList(client.DocID)
			}
		}
	}
}

func (h *Hub) autoSaveSession(docID string, userID string, generation uint64) {
	// Wait 10 seconds to buffer normal refreshes/reconnects
	time.Sleep(10 * time.Second)
	gateCtx, gateCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer gateCancel()
	// Serialize end-of-session snapshots across replicas as well as REST saves.
	release, gateErr := lifecycle.Enter(gateCtx, true)
	if gateErr != nil {
		return
	}
	defer release()

	h.RLock()
	room, active := h.Rooms[docID]
	hasClients := generation != h.generation || active && room != nil && len(room.Clients) > 0
	h.RUnlock()

	// If the room has been re-created or clients rejoined, abort the autosave
	if hasClients {
		return
	}
	if h.Cluster != nil {
		members, err := h.Cluster.Members(gateCtx, docID, nil)
		if err != nil || len(members) > 0 {
			return
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check if there are live unsaved changes
	doc, _, err := h.docService.GetDocument(ctx, docID)
	if err != nil {
		log.Printf("Session autosave: failed to fetch document %s: %v", docID, err)
		return
	}

	versions, err := h.docService.GetDocumentVersions(ctx, docID)
	if err != nil {
		log.Printf("Session autosave: failed to fetch versions for %s: %v", docID, err)
		return
	}

	latestContent := `{"type":"doc","content":[{"type":"paragraph"}]}`
	for _, v := range versions {
		if v.VersionNumber != -1 {
			latestContent = v.Content
			break
		}
	}

	if doc.Content != latestContent {
		log.Printf("Session autosave: Saving snapshot for document %s (Session ended)", docID)
		_, err = h.docService.CreateManualMilestone(ctx, docID, "Auto-saved snapshot (Session ended)", userID)
		if err != nil {
			log.Printf("Session autosave: failed to create manual milestone for %s: %v", docID, err)
		}
	}
}

func (h *Hub) handleBroadcast(msg BroadcastMessage) {
	h.Lock() // Write lock as we might mutate room.Updates
	defer h.Unlock()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if !h.checkCluster(ctx) {
		h.sendControl(msg.Exclude, WSMessage{Type: "sync-error", Error: "Coordination unavailable. Keep this page open."})
		return
	}

	room, ok := h.Rooms[msg.DocID]
	if !ok {
		return
	}

	if msg.Exclude != nil && !room.Clients[msg.Exclude] {
		return
	}

	if !msg.IsSync && msg.Exclude != nil {
		var cursor WSMessage
		if json.Unmarshal(msg.Payload, &cursor) == nil && cursor.Type == "cursor" {
			msg.Exclude.position = cursor.Position
			msg.Exclude.anchor = cursor.Anchor
			msg.Exclude.cursorVersion++
		}
	}
	if msg.IsSync && h.Store != nil {
		if !msg.Snapshot || len(msg.SyncUpdate) > 16<<20 || len(msg.Content) > 16<<20 || !json.Valid([]byte(msg.Content)) {
			h.sendControl(msg.Exclude, WSMessage{Type: "sync-error", Error: "Refresh this page or reduce its size before synchronizing."})
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		state, applied, err := h.Store.SaveState(ctx, msg.DocID, msg.Version, msg.SyncUpdate, msg.Content)
		cancel()
		if err != nil {
			h.sendControl(msg.Exclude, WSMessage{Type: "sync-error", Error: "Changes could not be synchronized. Keep this page open and retry."})
			return
		}
		room.Version = state.Version
		room.Updates = []string{state.Update}
		if !applied {
			h.sendControl(msg.Exclude, WSMessage{Type: "sync-history", Epoch: h.clusterEpoch, DocID: msg.DocID, Version: state.Version, Snapshot: true, Updates: room.Updates})
			return
		}
		h.sendControl(msg.Exclude, WSMessage{Type: "sync-ack", Version: state.Version, RequestID: msg.RequestID})
		msg.Payload, _ = json.Marshal(WSMessage{Type: "sync", DocID: msg.DocID, Version: state.Version, Snapshot: true, Update: state.Update})
	} else if msg.IsSync && msg.SyncUpdate != "" {
		if len(room.Updates) >= 10000 {
			h.sendControl(msg.Exclude, WSMessage{Type: "sync-error", Error: "Collaboration history limit reached; save and reopen the page."})
			return
		}
		room.Updates = append(room.Updates, msg.SyncUpdate)
	}

	for c := range room.Clients {
		if c == msg.Exclude {
			continue
		}
		select {
		case c.Send <- msg.Payload:
		default:
			go h.UnregisterClient(c)
		}
	}
}

func (h *Hub) UnregisterClient(c *Client) {
	h.Unregister <- c
}

// BroadcastToAll sends a message to all connected clients across all active rooms.
func (h *Hub) BroadcastToAll(msg WSMessage) {
	if h.Cluster != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		_, _ = h.Cluster.Changed(ctx, false)
		cancel()
	}
	h.RLock()
	defer h.RUnlock()

	payload, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshalling BroadcastToAll message: %v", err)
		return
	}

	for _, room := range h.Rooms {
		for c := range room.Clients {
			select {
			case c.Send <- payload:
			default:
				// client blocked, it will be cleaned up in its own pumps or unregister
			}
		}
	}
}

// broadcastPresenceList helper sends the active user presence list to all room clients.
// Assumes Lock is already held by caller.
func (h *Hub) broadcastPresenceList(docID string) {
	if h.Cluster != nil {
		return
	}
	room := h.Rooms[docID]
	if room == nil || len(room.Clients) == 0 {
		return
	}

	presenceUsers := make([]UserPresence, 0, len(room.Clients))
	for c := range room.Clients {
		presenceUsers = append(presenceUsers, UserPresence{
			UserID:   c.UserID,
			Username: c.Username,
			Color:    c.Color,
		})
	}

	msg := WSMessage{
		Type:  "presence",
		DocID: docID,
		Users: presenceUsers,
	}

	payload, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshalling presence list: %v", err)
		return
	}

	for c := range room.Clients {
		select {
		case c.Send <- payload:
		default:
			// client unresponsive
			cConn := c.Conn
			if cConn != nil {
				cConn.Close()
			}
			delete(room.Clients, c)
		}
	}
}

// GetUserColor deterministically selects a color based on User ID
func GetUserColor(userID string) string {
	colors := []string{"#8b5cf6", "#3b82f6", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#6366f1", "#14b8a6"}
	var sum int
	for _, char := range userID {
		sum += int(char)
	}
	return colors[sum%len(colors)]
}

func (h *Hub) sendControl(client *Client, msg WSMessage) {
	if client == nil {
		return
	}
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	select {
	case client.Send <- data:
	default:
		if client.Conn != nil {
			client.Conn.Close()
		}
	}
}

// Reset disconnects clients before replacing data. Close code 1012 asks the SPA
// to reload instead of merging pre-restore local state into restored documents.
func (h *Hub) Reset() {
	h.Lock()
	defer h.Unlock()
	h.resetLocal()
}
func (h *Hub) resetLocal() {
	h.generation++
	for _, room := range h.Rooms {
		for client := range room.Clients {
			if client.Conn != nil {
				_ = client.Conn.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseServiceRestart, "Data restored; reload required"), time.Now().Add(time.Second))
				_ = client.Conn.Close()
			}
		}
	}
	h.Rooms = make(map[string]*Room)
}

// ResetDocument invalidates connected clients after an authoritative version restore.
func (h *Hub) ResetDocument(id string) {
	h.Lock()
	defer h.Unlock()
	h.generation++
	if room := h.Rooms[id]; room != nil {
		for client := range room.Clients {
			if client.Conn != nil {
				_ = client.Conn.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseServiceRestart, "Page restored; reload required"), time.Now().Add(time.Second))
				_ = client.Conn.Close()
			}
		}
		delete(h.Rooms, id)
	}
}
