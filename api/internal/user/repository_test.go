package user

import (
	"context"
	"kollab/api/internal/domain"
	"testing"
)

func TestInMemoryUserRepository(t *testing.T) {
	repo := NewInMemoryUserRepository()
	ctx := context.Background()

	// Create user
	newUser := &domain.User{
		ID:           "new_user_1",
		Username:     "newuser",
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

func TestInMemoryUserRepositoryLifecycleAndCopies(t *testing.T) {
	ctx := context.Background()
	repo := NewInMemoryUserRepository()
	user := &domain.User{ID: "user-1", Username: "first", PasswordHash: "original"}
	if err := repo.Create(ctx, user); err != nil {
		t.Fatalf("create user: %v", err)
	}
	if err := repo.Create(ctx, &domain.User{ID: "user-2", Username: "first"}); err == nil {
		t.Fatal("expected duplicate username rejection")
	}
	fetched, err := repo.GetByID(ctx, "user-1")
	if err != nil {
		t.Fatalf("get by ID: %v", err)
	}
	fetched.Username = "mutated copy"
	again, err := repo.GetByID(ctx, "user-1")
	if err != nil || again.Username != "first" {
		t.Fatalf("repository returned mutable backing value: %#v, %v", again, err)
	}
	if err := repo.SetActive(ctx, "missing", false); err == nil {
		t.Fatal("expected missing user activation error")
	}
	if err := repo.UpdatePassword(ctx, "missing", "hash"); err == nil {
		t.Fatal("expected missing user password error")
	}
	if err := repo.Upsert(ctx, &domain.User{ID: "user-1", Username: "renamed", Email: "new@example.test"}); err != nil {
		t.Fatalf("upsert existing user: %v", err)
	}
	updated, err := repo.GetByID(ctx, "user-1")
	if err != nil || updated.Username != "renamed" || updated.PasswordHash != "original" {
		t.Fatalf("existing upsert did not preserve password: %#v, %v", updated, err)
	}
	if err := repo.Upsert(ctx, &domain.User{ID: "user-3", Username: "new"}); err != nil {
		t.Fatalf("upsert new user: %v", err)
	}
	newUser, err := repo.GetByID(ctx, "user-3")
	if err != nil || !newUser.IsActive {
		t.Fatalf("new upsert should enable user: %#v, %v", newUser, err)
	}
}
