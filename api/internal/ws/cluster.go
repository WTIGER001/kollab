package ws

import (
	"context"
	"encoding/json"
	"github.com/google/uuid"
	"kollab/api/internal/domain"
	"kollab/api/internal/lifecycle"
	"time"
)

// checkCluster is called with the hub lock and distributed maintenance read lock.
func (h *Hub) checkCluster(ctx context.Context) bool {
	if h.Cluster == nil {
		return true
	}
	state, err := h.Cluster.State(ctx)
	if err != nil {
		return false
	}
	if h.clusterEpoch != "" && state.Epoch != h.clusterEpoch {
		h.resetLocal()
	}
	h.clusterEpoch = state.Epoch
	if state.TreeVersion != h.treeVersion {
		h.treeVersion = state.TreeVersion
		for _, room := range h.Rooms {
			for client := range room.Clients {
				h.sendControl(client, WSMessage{Type: "document-tree-updated"})
			}
		}
	}
	return true
}
func (h *Hub) pollCluster(ctx context.Context) {
	release, err := lifecycle.Enter(ctx, false)
	if err != nil {
		return
	}
	defer release()
	h.Lock()
	defer h.Unlock()
	if !h.checkCluster(ctx) {
		return
	}
	for id, room := range h.Rooms {
		state, err := h.Store.LoadState(ctx, id)
		if err != nil {
			continue
		}
		if state.Version != room.Version {
			room.Version = state.Version
			room.Updates = []string{state.Update}
			for client := range room.Clients {
				h.sendControl(client, WSMessage{Type: "sync", Snapshot: true, DocID: id, Version: state.Version, Update: state.Update, Epoch: h.clusterEpoch})
			}
		}
		local := []domain.ClusterMember{}
		for client := range room.Clients {
			local = append(local, domain.ClusterMember{ConnectionID: client.connectionID, UserID: client.UserID, Username: client.Username, Color: client.Color, Position: client.position, Anchor: client.anchor, CursorVersion: client.cursorVersion})
		}
		members, err := h.Cluster.Members(ctx, id, local)
		if err != nil {
			continue
		}
		encoded, _ := json.Marshal(members)
		if string(encoded) == room.presence {
			continue
		}
		room.presence = string(encoded)
		users := []UserPresence{}
		seen := map[string]bool{}
		for _, member := range members {
			if !seen[member.UserID] {
				users = append(users, UserPresence{UserID: member.UserID, Username: member.Username, Color: member.Color})
				seen[member.UserID] = true
			}
		}
		for client := range room.Clients {
			h.sendControl(client, WSMessage{Type: "presence", Users: users})
			for _, member := range members {
				if member.UserID != client.UserID && member.CursorVersion > 0 {
					h.sendControl(client, WSMessage{Type: "cursor", DocID: id, UserID: member.UserID, Username: member.Username, Color: member.Color, Position: member.Position, Anchor: member.Anchor})
				}
			}
		}
	}
}
func (h *Hub) RunContext(ctx context.Context) {
	ticker := time.NewTicker(250 * time.Millisecond)
	defer ticker.Stop()
	for {
		var action func()
		var failed func()
		select {
		case <-ctx.Done():
			h.Lock()
			h.resetLocal()
			h.Unlock()
			return
		case <-ticker.C:
			if h.Cluster != nil && h.Store != nil {
				pollCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
				h.pollCluster(pollCtx)
				cancel()
			}
			continue
		case client := <-h.Register:
			if client.connectionID == "" {
				client.connectionID = uuid.NewString()
			}
			action = func() { h.handleRegister(client) }
			failed = func() {
				if client.Conn != nil {
					client.Conn.Close()
				}
			}
		case client := <-h.Unregister:
			// Removing a socket is local bookkeeping, never a content write.
			h.handleUnregister(client)
			continue
		case msg := <-h.Broadcast:
			action = func() { h.handleBroadcast(msg) }
			failed = func() {
				h.sendControl(msg.Exclude, WSMessage{Type: "sync-error", Error: "Coordination unavailable. Keep this page open and reconnect."})
			}
		}
		gateCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		release, err := lifecycle.Enter(gateCtx, false)
		if err == nil {
			action()
			release()
		} else if failed != nil {
			failed()
		}
		cancel()
	}
}
