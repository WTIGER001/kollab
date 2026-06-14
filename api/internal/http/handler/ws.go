package handler

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"

	"arkollab/api/internal/http/middleware"
	"arkollab/api/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow standard local development origins
		return true
	},
}

type WSHandler struct {
	jwtSecret []byte
	jwksCache *middleware.JWKSCache
	hub       *ws.Hub
}

func NewWSHandler(jwtSecret []byte, jwksCache *middleware.JWKSCache, hub *ws.Hub) *WSHandler {
	return &WSHandler{
		jwtSecret: jwtSecret,
		jwksCache: jwksCache,
		hub:       hub,
	}
}

func (h *WSHandler) ServeWS(w http.ResponseWriter, r *http.Request) {
	tokenString := r.URL.Query().Get("token")
	if tokenString == "" {
		http.Error(w, "Unauthorized: token is required", http.StatusUnauthorized)
		return
	}

	docID := r.URL.Query().Get("docId")
	if docID == "" {
		http.Error(w, "Bad Request: docId is required", http.StatusBadRequest)
		return
	}

	userID, username, err := h.validateToken(r.Context(), tokenString)
	if err != nil {
		log.Printf("WebSocket auth validation failed: %v", err)
		http.Error(w, "Unauthorized: invalid token", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket connection upgrade failed: %v", err)
		return
	}

	client := &ws.Client{
		UserID:   userID,
		Username: username,
		Color:    ws.GetUserColor(userID),
		DocID:    docID,
		Conn:     conn,
		Send:     make(chan []byte, 256),
		Hub:      h.hub,
	}

	h.hub.Register <- client

	go client.WritePump()
	go client.ReadPump()
}

func (h *WSHandler) validateToken(ctx context.Context, tokenString string) (string, string, error) {
	claims := jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); ok {
			return h.jwtSecret, nil
		}

		kidVal, ok := token.Header["kid"]
		if !ok {
			return nil, fmt.Errorf("missing kid in token header")
		}

		kid, ok := kidVal.(string)
		if !ok {
			return nil, fmt.Errorf("invalid kid header type")
		}

		if h.jwksCache == nil {
			return nil, fmt.Errorf("JWKS cache is not initialized")
		}

		return h.jwksCache.GetKey(ctx, kid)
	})

	if err != nil || !token.Valid {
		return "", "", fmt.Errorf("invalid token: %w", err)
	}

	var userID, username string
	if sub, ok := claims["sub"].(string); ok {
		userID = sub
	} else if uid, ok := claims["user_id"].(string); ok {
		userID = uid
	}

	if uName, ok := claims["username"].(string); ok {
		username = uName
	} else if prefName, ok := claims["preferred_username"].(string); ok {
		username = prefName
	} else if name, ok := claims["name"].(string); ok {
		username = name
	}

	if userID == "" {
		return "", "", fmt.Errorf("user ID claim not found")
	}

	if username == "" {
		username = userID
	}

	return userID, username, nil
}
