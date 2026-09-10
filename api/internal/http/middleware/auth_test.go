package middleware

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"kollab/api/internal/domain"
)

func TestJWKSCacheFetchesAndCachesSupportedKeys(t *testing.T) {
	curve := elliptic.P256()
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		if r.URL.Path != "/keys" {
			http.NotFound(w, r)
			return
		}
		fmt.Fprintf(w, `{"keys":[
			{"kty":"RSA","kid":"rsa-1","n":"%s","e":"AQAB"},
			{"kty":"EC","kid":"ec-1","crv":"P-256","x":"%s","y":"%s"},
			{"kty":"EC","kid":"unsupported","crv":"P-999","x":"AQ","y":"AQ"}
		]}`,
			base64.RawURLEncoding.EncodeToString([]byte{1, 0, 1}),
			base64.RawURLEncoding.EncodeToString(curve.Params().Gx.Bytes()),
			base64.RawURLEncoding.EncodeToString(curve.Params().Gy.Bytes()),
		)
	}))
	defer server.Close()

	cache := NewJWKSCache(server.URL + "/keys")
	rsaKey, err := cache.GetKey(context.Background(), "rsa-1")
	if err != nil {
		t.Fatalf("fetch RSA key: %v", err)
	}
	if _, ok := rsaKey.(*rsa.PublicKey); !ok {
		t.Fatalf("expected RSA public key, got %T", rsaKey)
	}

	ecKey, err := cache.GetKey(context.Background(), "ec-1")
	if err != nil {
		t.Fatalf("fetch cached EC key: %v", err)
	}
	if _, ok := ecKey.(*ecdsa.PublicKey); !ok {
		t.Fatalf("expected ECDSA public key, got %T", ecKey)
	}
	if requests != 1 {
		t.Fatalf("expected one JWKS request, got %d", requests)
	}

	if _, err := cache.GetKey(context.Background(), "unknown"); err == nil {
		t.Fatal("expected an error for an unknown key ID")
	}
	if requests != 2 {
		t.Fatalf("expected cache refresh for unknown key, got %d requests", requests)
	}
}

func TestNewOIDCJWKSCacheRejectsIncompleteOrInsecureConfiguration(t *testing.T) {
	for _, test := range []struct {
		name, issuer, audience, scope string
	}{
		{"missing audience", "https://identity.example.test", "", "kollab.access"},
		{"non-HTTPS issuer", "http://identity.example.test", "api://kollab", "kollab.access"},
		{"relative issuer", "/issuer", "api://kollab", "kollab.access"},
	} {
		t.Run(test.name, func(t *testing.T) {
			if _, err := NewOIDCJWKSCache(context.Background(), test.issuer, test.audience, test.scope); err == nil {
				t.Fatal("expected invalid OIDC configuration to be rejected")
			}
		})
	}
}

func TestValidateTokenEnforcesOIDCBinding(t *testing.T) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate test key: %v", err)
	}
	cache := &JWKSCache{
		issuer:        "https://identity.example.test",
		audience:      "api://kollab",
		requiredScope: "kollab.access",
		keys:          map[string]any{"key-1": &privateKey.PublicKey},
	}

	makeToken := func(claims jwt.MapClaims) string {
		token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
		token.Header["kid"] = "key-1"
		raw, err := token.SignedString(privateKey)
		if err != nil {
			t.Fatalf("sign test token: %v", err)
		}
		return raw
	}

	valid := makeToken(jwt.MapClaims{
		"sub": "user-1", "iss": "https://identity.example.test", "aud": "api://kollab", "scp": "kollab.access",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	if _, err := ValidateToken(context.Background(), valid, nil, cache); err != nil {
		t.Fatalf("valid OIDC token rejected: %v", err)
	}

	wrongAudience := makeToken(jwt.MapClaims{
		"sub": "user-1", "iss": "https://identity.example.test", "aud": "another-client", "scp": "kollab.access",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	if _, err := ValidateToken(context.Background(), wrongAudience, nil, cache); err == nil {
		t.Fatal("token for another audience was accepted")
	}

	hmacToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": "user-1", "iss": "https://identity.example.test", "aud": "api://kollab", "scp": "kollab.access",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	rawHMAC, err := hmacToken.SignedString([]byte("not-a-production-token-secret"))
	if err != nil {
		t.Fatalf("sign HMAC token: %v", err)
	}
	if _, err := ValidateToken(context.Background(), rawHMAC, []byte("not-a-production-token-secret"), cache); err == nil {
		t.Fatal("HMAC token was accepted in OIDC mode")
	}

	missingScope := makeToken(jwt.MapClaims{
		"sub": "user-1", "iss": "https://identity.example.test", "aud": "api://kollab",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	if _, err := ValidateToken(context.Background(), missingScope, nil, cache); err == nil {
		t.Fatal("access token without the API scope was accepted")
	}
}

type mockUserRepository struct {
	mu      sync.Mutex
	upserts []*domain.User
}

func (m *mockUserRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	return nil, nil
}
func (m *mockUserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	return nil, nil
}
func (m *mockUserRepository) List(ctx context.Context) ([]*domain.User, error) { return nil, nil }

func (m *mockUserRepository) Create(ctx context.Context, user *domain.User) error {
	return nil
}

func (m *mockUserRepository) Upsert(ctx context.Context, user *domain.User) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.upserts = append(m.upserts, user)
	return nil
}
func (m *mockUserRepository) SetActive(ctx context.Context, id string, active bool) error { return nil }
func (m *mockUserRepository) UpdatePassword(ctx context.Context, id, passwordHash string) error {
	return nil
}
func (m *mockUserRepository) CreateInitialLocalAdmin(ctx context.Context, user *domain.User) (bool, error) {
	return true, nil
}

func TestAuthMiddlewareUpsert(t *testing.T) {
	jwtSecret := []byte("test-jwt-secret-key-123456")
	mockRepo := &mockUserRepository{}

	// Create a dummy next handler
	dummyNext := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Wrap next handler with AuthMiddleware
	middlewareFunc := AuthMiddleware(jwtSecret, nil, mockRepo)
	authHandler := middlewareFunc(dummyNext)

	// Create a signed token with all claims (sub, username, email, name)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":      "user_123",
		"username": "jbauer",
		"email":    "john.bauer@example.com",
		"name":     "John Bauer",
		"exp":      time.Now().Add(time.Hour).Unix(),
	})
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		t.Fatalf("Failed to sign token: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "http://localhost:8080/api/teams", nil)
	req.Header.Set("Authorization", "Bearer "+tokenString)
	rr := httptest.NewRecorder()

	authHandler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	// Wait up to 1 second for the background upsert goroutine to execute
	deadline := time.Now().Add(1 * time.Second)
	var upsertedUser *domain.User
	for time.Now().Before(deadline) {
		mockRepo.mu.Lock()
		if len(mockRepo.upserts) > 0 {
			upsertedUser = mockRepo.upserts[0]
			mockRepo.mu.Unlock()
			break
		}
		mockRepo.mu.Unlock()
		time.Sleep(10 * time.Millisecond)
	}

	if upsertedUser == nil {
		t.Fatal("Expected background upsert to be executed, but no user upserted")
	}

	if upsertedUser.ID != "user_123" {
		t.Errorf("Expected upserted ID to be 'user_123', got %q", upsertedUser.ID)
	}

	if upsertedUser.Email != "john.bauer@example.com" {
		t.Errorf("Expected upserted Email to be 'john.bauer@example.com', got %q", upsertedUser.Email)
	}

	if upsertedUser.DisplayName != "John Bauer" {
		t.Errorf("Expected upserted DisplayName to be 'John Bauer', got %q", upsertedUser.DisplayName)
	}

	if upsertedUser.Username != "jbauer" {
		t.Errorf("Expected upserted Username to be 'jbauer', got %q", upsertedUser.Username)
	}
}
