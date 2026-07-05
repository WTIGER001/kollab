package user

import (
	"context"
	"testing"
	"kollab/api/internal/domain"
)

func TestInMemoryUserRepository(t *testing.T) {
	repo := NewInMemoryUserRepository()
	ctx := context.Background()

	// Create user
	newUser := &domain.User{
		ID: "new_user_1",
		Username: "newuser",
		PasswordHash: "hash123",
	}
	err := repo.Create(ctx, newUser)
	if err != nil {
		t.Fatalf("expected no error creating user, got %v", err)
	}

	// Get by username
	fetched, err := repo.GetByUsername(ctx, "newuser")
	if err != nil {
		t.Fatalf("expected to find created user, got error: %v", err)
	}
	if fetched.ID != "new_user_1" {
		t.Errorf("expected fetched user ID new_user_1, got %s", fetched.ID)
	}

	// Get missing user
	_, err = repo.GetByUsername(ctx, "missing_user")
	if err == nil {
		t.Error("expected error getting missing user")
	}
}
