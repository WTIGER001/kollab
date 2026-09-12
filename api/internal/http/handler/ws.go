package handler

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gorilla/websocket"

	"kollab/api/internal/domain"
	"kollab/api/internal/http/middleware"
	"kollab/api/internal/permissions"
	"kollab/api/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	Subprotocols:    []string{"kollab"},
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true
		}
		u, err := url.Parse(origin)
		return err == nil && u.Host == r.Host
	},
}

type WSHandler struct {
	jwtSecret []byte
	userRepo  domain.UserRepository
	jwksCache *middleware.JWKSCache
	hub       *ws.Hub
	evaluator *permissions.AccessEvaluator
}

func NewWSHandler(jwtSecret []byte, jwksCache *middleware.JWKSCache, hub *ws.Hub, evaluator *permissions.AccessEvaluator) *WSHandler {
	return &WSHandler{
		jwtSecret: jwtSecret,
		jwksCache: jwksCache,
		hub:       hub,
		evaluator: evaluator,
	}
}

func (h *WSHandler) SetUserRepository(repo domain.UserRepository) { h.userRepo = repo }

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

	var share struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	for _, protocol := range websocket.Subprotocols(r) {
		if strings.HasPrefix(protocol, "share.") && len(protocol) < 4096 {
			data, err := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(protocol, "share."))
			if err == nil {
				_ = json.Unmarshal(data, &share)
			}
		}
	}

	userID, username, err := h.validateToken(r.Context(), tokenString)
	if err != nil {
		log.Printf("WebSocket auth validation failed: %v", err)
		http.Error(w, "Unauthorized: invalid token", http.StatusUnauthorized)
		return
	}
	allowed, _, err := h.evaluator.EvaluateDocumentAccess(r.Context(), userID, docID, "read", share.Token, share.Password)
	if err != nil {
		http.Error(w, "Unable to verify document access", http.StatusInternalServerError)
		return
	}
	if !allowed {
		http.Error(w, "Forbidden", http.StatusForbidden)
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
		Send:     make(chan []byte, 8),
		Hub:      h.hub,
		Authorize: func(action string) bool {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if _, _, err := h.validateToken(ctx, tokenString); err != nil {
				return false
			}
			allowed, _, err := h.evaluator.EvaluateDocumentAccess(ctx, userID, docID, action, share.Token, share.Password)
			return err == nil && allowed
		},
	}

	h.hub.Register <- client

	go client.WritePump()
	go client.ReadPump()
}

func (h *WSHandler) validateToken(ctx context.Context, tokenString string) (string, string, error) {
	claims, err := middleware.ValidateToken(ctx, tokenString, h.jwtSecret, h.jwksCache)
	if err != nil {
		return "", "", err
	}

	var userID, username string
	if sub, ok := claims["sub"].(string); ok {
		userID = sub
	} else if uid, ok := claims["user_id"].(string); ok {
		userID = uid
	}

	if name, ok := claims["name"].(string); ok {
		username = name
	} else if uName, ok := claims["username"].(string); ok {
		username = uName
	} else if prefName, ok := claims["preferred_username"].(string); ok {
		username = prefName
	}

	if userID == "" {
		return "", "", fmt.Errorf("user ID claim not found")
	}

	if username == "" {
		username = userID
	}

	if h.userRepo != nil {
		u, err := h.userRepo.GetByID(ctx, userID)
		version, _ := claims["credential_version"].(string)
		if err != nil || u == nil || !u.IsActive || (h.jwksCache.AllowsLocalCredentials() && version != domain.CredentialVersion(u.PasswordHash)) {
			return "", "", fmt.Errorf("session expired")
		}
		username = u.Username
	}
	return userID, username, nil
}
