package ws

import (
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

	c.Conn.SetReadLimit(512 * 1024) // 512 KB max message size
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
			if c.DocID != wsMsg.DocID && wsMsg.DocID != "" {
				c.Hub.Unregister <- c
				c.DocID = wsMsg.DocID
				c.Hub.Register <- c
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
			payload, err := json.Marshal(wsMsg)
			if err == nil {
				c.Hub.Broadcast <- BroadcastMessage{
					DocID:      c.DocID,
					Payload:    payload,
					Exclude:    c,
					IsSync:     true,
					SyncUpdate: wsMsg.Update,
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
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
