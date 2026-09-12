package postgres

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"kollab/api/internal/domain"
	"kollab/api/internal/ws"
	"testing"
	"time"
)

func TestClusterMaintenanceAndSharedIdentity(t *testing.T) {
	db, ctx := setupTestDB(t)
	a, err := NewClusterCoordinator(ctx, db)
	if err != nil {
		t.Fatal(err)
	}
	defer a.Close()
	b, err := NewClusterCoordinator(ctx, db)
	if err != nil {
		t.Fatal(err)
	}
	defer b.Close()
	ak, err := a.MediaKey(ctx)
	if err != nil {
		t.Fatal(err)
	}
	bk, err := b.MediaKey(ctx)
	if err != nil || !bytes.Equal(ak, bk) {
		t.Fatal("media capabilities cannot cross replicas", err)
	}
	release, err := a.Acquire(ctx, false)
	if err != nil {
		t.Fatal(err)
	}
	other, err := b.Acquire(ctx, false)
	if err != nil {
		t.Fatal(err)
	}
	other()
	blocked, cancel := context.WithTimeout(ctx, 100*time.Millisecond)
	if unlock, e := b.Acquire(blocked, true); e == nil {
		unlock()
		t.Fatal("maintenance overlapped a live request")
	}
	cancel()
	if err = db.Ping(ctx); err != nil {
		t.Fatal("lock wait exhausted query pool", err)
	}
	release()
	release, err = b.Acquire(ctx, true)
	if err != nil {
		t.Fatal(err)
	}
	release()
	first, err := a.State(ctx)
	if err != nil {
		t.Fatal(err)
	}
	epoch, err := b.Changed(ctx, true)
	if err != nil {
		t.Fatal(err)
	}
	next, err := a.State(ctx)
	if err != nil || epoch == first.Epoch || next.Epoch != epoch {
		t.Fatal("reset not shared", err)
	}
	_, err = a.Members(ctx, "doc", []domain.ClusterMember{{ConnectionID: "one", UserID: "alice", CursorVersion: 1, Position: 3}})
	if err != nil {
		t.Fatal(err)
	}
	members, err := b.Members(ctx, "doc", []domain.ClusterMember{{ConnectionID: "two", UserID: "bob"}})
	if err != nil || len(members) != 2 {
		t.Fatal("presence not shared", err)
	}
	if _, err = db.Exec(ctx, "UPDATE cluster_presence SET seen_at=now()-interval '20 seconds' WHERE connection_id='one'"); err != nil {
		t.Fatal(err)
	}
	members, err = b.Members(ctx, "doc", []domain.ClusterMember{{ConnectionID: "two", UserID: "bob"}})
	if err != nil || len(members) != 1 {
		t.Fatal("dead replica presence not expired", err)
	}
}

func TestTwoHubsFiveEditorsAndReplicaRecovery(t *testing.T) {
	db, ctx := setupTestDB(t)
	var id string
	if err := db.QueryRow(ctx, "SELECT id FROM documents LIMIT 1").Scan(&id); err != nil {
		t.Fatal(err)
	}
	hubs := []*ws.Hub{ws.NewHub(nil), ws.NewHub(nil)}
	stops := []context.CancelFunc{}
	done := []chan struct{}{}
	for _, hub := range hubs {
		coordinator, err := NewClusterCoordinator(ctx, db)
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(coordinator.Close)
		hub.Cluster = coordinator
		hub.Store = NewCollaborationRepository(db)
		runCtx, cancel := context.WithCancel(ctx)
		stops = append(stops, cancel)
		finished := make(chan struct{})
		done = append(done, finished)
		go func(h *ws.Hub) { defer close(finished); h.RunContext(runCtx) }(hub)
	}
	t.Cleanup(func() {
		for _, stop := range stops {
			stop()
		}
		for _, finished := range done {
			select {
			case <-finished:
			case <-time.After(5 * time.Second):
				t.Error("hub did not stop")
			}
		}
	})
	clients := []*ws.Client{}
	waitFor := func(client *ws.Client, predicate func(ws.WSMessage) bool) ws.WSMessage {
		t.Helper()
		timer := time.NewTimer(5 * time.Second)
		defer timer.Stop()
		for {
			select {
			case raw := <-client.Send:
				var msg ws.WSMessage
				if err := json.Unmarshal(raw, &msg); err != nil {
					t.Fatal(err)
				}
				if predicate(msg) {
					return msg
				}
			case <-timer.C:
				t.Fatal("timed out awaiting replica update")
				return ws.WSMessage{}
			}
		}
	}
	for i := 0; i < 5; i++ {
		h := hubs[i%2]
		c := &ws.Client{UserID: fmt.Sprint(i), Username: fmt.Sprint(i), DocID: id, Hub: h, Send: make(chan []byte, 256)}
		clients = append(clients, c)
		h.Register <- c
		waitFor(c, func(m ws.WSMessage) bool { return m.Type == "sync-history" })
	}
	for _, client := range clients {
		waitFor(client, func(m ws.WSMessage) bool { return m.Type == "presence" && len(m.Users) == 5 })
	}
	hubs[0].Broadcast <- ws.BroadcastMessage{DocID: id, Exclude: clients[0], IsSync: true, Snapshot: true, Version: 0, RequestID: 1, SyncUpdate: "AA==", Content: `{"type":"doc","content":[]}`}
	waitFor(clients[0], func(m ws.WSMessage) bool { return m.Type == "sync-ack" && m.Version == 1 })
	for _, client := range clients[1:] {
		waitFor(client, func(m ws.WSMessage) bool { return m.Type == "sync" && m.Version == 1 && m.Update == "AA==" })
	}
	// A stale write on another API receives the accepted snapshot for client merge.
	hubs[1].Broadcast <- ws.BroadcastMessage{DocID: id, Exclude: clients[1], IsSync: true, Snapshot: true, Version: 0, RequestID: 1, SyncUpdate: "AQ==", Content: `{"type":"doc","content":[]}`}
	waitFor(clients[1], func(m ws.WSMessage) bool { return m.Type == "sync-history" && m.Version == 1 && m.Updates[0] == "AA==" })
	hubs[1].Broadcast <- ws.BroadcastMessage{DocID: id, Exclude: clients[1], IsSync: true, Snapshot: true, Version: 1, RequestID: 2, SyncUpdate: "Ag==", Content: `{"type":"doc","content":[]}`}
	waitFor(clients[0], func(m ws.WSMessage) bool { return m.Type == "sync" && m.Version == 2 })
	cursor, _ := json.Marshal(ws.WSMessage{Type: "cursor", Position: 9, Anchor: 7, UserID: clients[1].UserID})
	hubs[1].Broadcast <- ws.BroadcastMessage{DocID: id, Exclude: clients[1], Payload: cursor}
	waitFor(clients[0], func(m ws.WSMessage) bool {
		return m.Type == "cursor" && m.UserID == clients[1].UserID && m.Position == 9 && m.Anchor == 7
	})
	stops[0]()
	<-done[0]
	reconnect := &ws.Client{UserID: "0", DocID: id, Hub: hubs[1], Send: make(chan []byte, 256)}
	hubs[1].Register <- reconnect
	waitFor(reconnect, func(m ws.WSMessage) bool { return m.Type == "sync-history" && m.Version == 2 && m.Updates[0] == "Ag==" })
	// Transactional restore invalidation is observed by the surviving API.
	if _, err := db.Exec(ctx, "UPDATE cluster_control SET epoch=gen_random_uuid()::text WHERE id"); err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		hubs[1].RLock()
		empty := len(hubs[1].Rooms) == 0
		hubs[1].RUnlock()
		if empty {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("replica kept pre-restore rooms")
}
