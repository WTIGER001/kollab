package ws

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"arkollab/api/internal/domain"
)

type Client struct {
	UserID   string          `json:"userId"`
	Username string          `json:"username"`
	Color    string          `json:"color"`
	DocID    string          `json:"docId"`
	Conn     *websocket.Conn `json:"-"`
	Send     chan []byte     `json:"-"`
	Hub      *Hub            `json:"-"`
}

type BroadcastMessage struct {
	DocID      string
	Payload    []byte
	Exclude    *Client
	IsSync     bool
	SyncUpdate string
}

type Room struct {
	Clients map[*Client]bool
	Updates []string // Accumulated base64 Yjs updates
}

type Hub struct {
	sync.RWMutex
	Rooms      map[string]*Room
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan BroadcastMessage
	docService domain.DocumentService
}

type UserPresence struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	Color    string `json:"color"`
}

type WSMessage struct {
	Type     string         `json:"type"` // "join", "leave", "cursor", "presence", "sync", "sync-history"
	DocID    string         `json:"docId,omitempty"`
	Position int            `json:"position,omitempty"`
	Anchor   int            `json:"anchor,omitempty"`
	UserID   string         `json:"userId,omitempty"`
	Username string         `json:"username,omitempty"`
	Color    string         `json:"color,omitempty"`
	Users    []UserPresence `json:"users,omitempty"`
	Update   string         `json:"update,omitempty"`  // Base64 Yjs update blob
	Updates  []string       `json:"updates,omitempty"` // For sync-history
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

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.handleRegister(client)
		case client := <-h.Unregister:
			h.handleUnregister(client)
		case msg := <-h.Broadcast:
			h.handleBroadcast(msg)
		}
	}
}

func (h *Hub) handleRegister(client *Client) {
	h.Lock()
	defer h.Unlock()

	room, ok := h.Rooms[client.DocID]
	if !ok {
		room = &Room{
			Clients: make(map[*Client]bool),
			Updates: make([]string, 0),
		}
		h.Rooms[client.DocID] = room
	}
	room.Clients[client] = true

	// Always send sync-history to the new client to coordinate initial content population
	historyMsg := WSMessage{
		Type:    "sync-history",
		DocID:   client.DocID,
		Updates: room.Updates,
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
				// Spawn session ended auto-save if docService is configured
				if h.docService != nil {
					go h.autoSaveSession(client.DocID, client.UserID)
				}
			} else {
				h.broadcastPresenceList(client.DocID)
			}
		}
	}
}

func (h *Hub) autoSaveSession(docID string, userID string) {
	// Wait 10 seconds to buffer normal refreshes/reconnects
	time.Sleep(10 * time.Second)

	h.RLock()
	room, active := h.Rooms[docID]
	h.RUnlock()

	// If the room has been re-created or clients rejoined, abort the autosave
	if active && room != nil && len(room.Clients) > 0 {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check if there are live unsaved changes
	doc, err := h.docService.GetDocument(ctx, docID)
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

	room, ok := h.Rooms[msg.DocID]
	if !ok {
		return
	}

	// If the message is a collaborative sync update, store it in the room history
	if msg.IsSync && msg.SyncUpdate != "" {
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
