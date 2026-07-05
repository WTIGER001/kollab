package user

import (
	"context"
	"strings"
	"testing"
)

func TestAuthService(t *testing.T) {
	repo := NewInMemoryUserRepository()
	service := NewAuthService(repo, "secret123")
	ctx := context.Background()

	// 1. Register with short password
	_, err := service.Register(ctx, "testuser1", "short")
	if err == nil || !strings.Contains(err.Error(), "password must be at least 6 characters") {
		t.Errorf("expected error for short password, got %v", err)
	}

	// 2. Register successful
	user, err := service.Register(ctx, "testuser1", "password123")
	if err != nil {
		t.Fatalf("expected no error during register, got %v", err)
	}
	if user.Username != "testuser1" {
		t.Errorf("expected testuser1, got %s", user.Username)
	}

	// 3. Login with invalid username
	_, err = service.Login(ctx, "unknown_user", "password123")
	if err == nil {
		t.Error("expected error for invalid username")
	}

	// 4. Login with invalid password
	_, err = service.Login(ctx, "testuser1", "wrongpassword")
	if err == nil {
		t.Error("expected error for wrong password")
	}

	// 5. Login successful
	token, err := service.Login(ctx, "testuser1", "password123")
	if err != nil {
		t.Fatalf("expected no error during login, got %v", err)
	}
	if token == "" {
		t.Error("expected non-empty token")
	}
}
