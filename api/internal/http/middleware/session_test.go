package middleware

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"github.com/golang-jwt/jwt/v5"
	userpkg "kollab/api/internal/user"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestLocalSessionRevocation(t *testing.T) {
	ctx := context.Background()
	repo := userpkg.NewInMemoryUserRepository()
	secret := "test-local-session-secret-at-least-32-bytes"
	service := userpkg.NewAuthService(repo, secret)
	u, err := service.CreateLocalUser(ctx, "alice", "SecurePassword123", "alice@example.test", "Alice")
	if err != nil {
		t.Fatal(err)
	}
	token, err := service.Login(ctx, "alice", "SecurePassword123")
	if err != nil {
		t.Fatal(err)
	}
	handler := AuthMiddleware([]byte(secret), nil, repo)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) }))
	request := func() int {
		r := httptest.NewRequest("GET", "/api/teams", nil)
		r.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w.Code
	}
	if request() != 200 {
		t.Fatal("active session rejected")
	}
	current, _ := repo.GetByID(ctx, u.ID)
	if current.Email != "alice@example.test" || current.DisplayName != "Alice" {
		t.Fatal("profile overwritten by token")
	}
	if err = service.SetLocalUserPassword(ctx, u.ID, "DifferentPassword456"); err != nil {
		t.Fatal(err)
	}
	if request() != 401 {
		t.Fatal("password change did not revoke session")
	}
	token, _ = service.Login(ctx, "alice", "DifferentPassword456")
	if err = repo.SetActive(ctx, u.ID, false); err != nil {
		t.Fatal(err)
	}
	if request() != 401 {
		t.Fatal("disabled account retained access")
	}
	if err = repo.Delete(ctx, u.ID); err != nil {
		t.Fatal(err)
	}
	if request() != 401 {
		t.Fatal("deleted account retained access")
	}
	if _, err = repo.GetByID(ctx, u.ID); err == nil {
		t.Fatal("deleted account resurrected")
	}
}

func TestOIDCDisabledAccountCannotReestablishSession(t *testing.T) {
	ctx := context.Background()
	repo := userpkg.NewInMemoryUserRepository()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	cache := &JWKSCache{issuer: "https://identity.example.test", audience: "api://kollab", requiredScope: "kollab.access", keys: map[string]any{"test": &key.PublicKey}}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{"sub": "oidc-user", "iss": cache.issuer, "aud": cache.audience, "scp": cache.requiredScope, "exp": time.Now().Add(time.Hour).Unix()})
	token.Header["kid"] = "test"
	raw, err := token.SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	handler := AuthMiddleware(nil, cache, repo)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) }))
	request := func() int {
		r := httptest.NewRequest("GET", "/api/me", nil)
		r.Header.Set("Authorization", "Bearer "+raw)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w.Code
	}
	if request() != 200 {
		t.Fatal("initial provisioning failed")
	}
	if err = repo.SetActive(ctx, "oidc-user", false); err != nil {
		t.Fatal(err)
	}
	if request() != 401 {
		t.Fatal("disabled OIDC account retained access")
	}
	current, err := repo.GetByID(ctx, "oidc-user")
	if err != nil || current.IsActive {
		t.Fatal("disabled OIDC account was reactivated")
	}
}
