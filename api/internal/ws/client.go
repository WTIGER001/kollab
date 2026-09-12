package ws

import (
	"encoding/base64"
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(34 * 1024 * 1024) // bounded CRDT snapshot plus readable projection
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNormalClosure, websocket.CloseNoStatusReceived) {
				log.Printf("Unexpected WebSocket close error: %v", err)
			}
			break
		}

		var wsMsg WSMessage
		if err := json.Unmarshal(message, &wsMsg); err != nil {
			log.Printf("Error unmarshalling ws message: %v", err)
			continue
		}

		switch wsMsg.Type {
		case "join":
			if wsMsg.DocID != c.DocID {
				return
			}
		case "cursor":
			wsMsg.UserID = c.UserID
			wsMsg.Username = c.Username
			wsMsg.Color = c.Color
			payload, err := json.Marshal(wsMsg)
			if err == nil {
				c.Hub.Broadcast <- BroadcastMessage{
					DocID:   c.DocID,
					Payload: payload,
					Exclude: c,
				}
			}
		case "sync":
			if _, err := base64.StdEncoding.DecodeString(wsMsg.Update); err != nil {
				continue
			}
			if c.Authorize != nil && !c.Authorize("write") {
				continue
			}
			wsMsg.DocID = c.DocID
			payload, err := json.Marshal(wsMsg)
			if err == nil {
				c.Hub.Broadcast <- BroadcastMessage{
					DocID:      c.DocID,
					Payload:    payload,
					Exclude:    c,
					IsSync:     true,
					SyncUpdate: wsMsg.Update,
					Content:    wsMsg.Content,
					Version:    wsMsg.Version, Snapshot: wsMsg.Snapshot, RequestID: wsMsg.RequestID,
				}
			}
		case "leave":
			c.Hub.Unregister <- c
		}
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			if c.Authorize != nil && !c.Authorize("read") {
				return
			}
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			if c.Authorize != nil && !c.Authorize("read") {
				return
			}
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
