package ws

import (
	"encoding/json"
	"testing"
	"time"
)

func TestHub_RegisterAndUnregister(t *testing.T) {
	hub := NewHub(nil)
	go hub.Run()

	client := &Client{
		UserID: "user1",
		DocID:  "doc1",
		Send:   make(chan []byte, 256),
		Hub:    hub,
	}

	// Test register
	hub.Register <- client
	time.Sleep(10 * time.Millisecond) // Wait for go routine

	hub.RLock()
	room := hub.Rooms["doc1"]
	if room == nil {
		t.Fatalf("expected room doc1 to be created")
	}
	if !room.Clients[client] {
		t.Errorf("expected client in room")
	}
	hub.RUnlock()

	// Test Unregister
	hub.Unregister <- client
	time.Sleep(10 * time.Millisecond)

	hub.RLock()
	if hub.Rooms["doc1"] != nil {
		t.Errorf("expected room to be deleted when empty")
	}
	hub.RUnlock()
}

func TestHub_Broadcast(t *testing.T) {
	hub := NewHub(nil)
	go hub.Run()

	client1 := &Client{
		UserID: "user1",
		DocID:  "doc1",
		Send:   make(chan []byte, 256),
		Hub:    hub,
	}
	client2 := &Client{
		UserID: "user2",
		DocID:  "doc1",
		Send:   make(chan []byte, 256),
		Hub:    hub,
	}

	hub.Register <- client1
	hub.Register <- client2
	time.Sleep(10 * time.Millisecond)

	// Flush registration presence/sync-history messages
	for len(client1.Send) > 0 {
		<-client1.Send
	}
	for len(client2.Send) > 0 {
		<-client2.Send
	}

	// Broadcast
	msg := BroadcastMessage{
		DocID:   "doc1",
		Payload: []byte("test message"),
		Exclude: client1,
	}
	hub.Broadcast <- msg
	time.Sleep(10 * time.Millisecond)

	if len(client1.Send) > 0 {
		t.Errorf("client1 should be excluded from broadcast")
	}
	if len(client2.Send) != 1 {
		t.Fatalf("expected client2 to get 1 message, got %d", len(client2.Send))
	}
	got := <-client2.Send
	if string(got) != "test message" {
		t.Errorf("expected 'test message', got %s", string(got))
	}
}

func TestGetUserColor(t *testing.T) {
	color1 := GetUserColor("user1")
	color2 := GetUserColor("user1")
	if color1 != color2 {
		t.Errorf("expected same color for same user id, got %s and %s", color1, color2)
	}
}

func TestBroadcastToAll(t *testing.T) {
	hub := NewHub(nil)
	go hub.Run()
	client := &Client{
		UserID: "user1",
		DocID:  "doc1",
		Send:   make(chan []byte, 256),
		Hub:    hub,
	}
	hub.Register <- client
	time.Sleep(10 * time.Millisecond)
	for len(client.Send) > 0 {
		<-client.Send
	} // clear channel

	hub.BroadcastToAll(WSMessage{Type: "test"})
	time.Sleep(10 * time.Millisecond)

	if len(client.Send) == 0 {
		t.Errorf("expected message from BroadcastToAll")
	} else {
		payload := <-client.Send
		var msg WSMessage
		if err := json.Unmarshal(payload, &msg); err != nil {
			t.Fatalf("failed to decode: %v", err)
		}
		if msg.Type != "test" {
			t.Errorf("expected type 'test', got %s", msg.Type)
		}
	}
}
