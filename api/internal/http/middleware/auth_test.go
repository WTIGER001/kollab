package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"arkollab/api/internal/domain"
)

type mockUserRepository struct {
	mu      sync.Mutex
	upserts []*domain.User
}

func (m *mockUserRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	return nil, nil
}

func (m *mockUserRepository) Create(ctx context.Context, user *domain.User) error {
	return nil
}

func (m *mockUserRepository) Upsert(ctx context.Context, user *domain.User) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.upserts = append(m.upserts, user)
	return nil
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
