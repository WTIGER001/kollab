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
	if err == nil || !strings.Contains(err.Error(), "password must be at least 12 characters") {
		t.Errorf("expected error for short password, got %v", err)
	}

	// 2. Register successful
	user, err := service.Register(ctx, "testuser1", "SecurePassword123")
	if err != nil {
		t.Fatalf("expected no error during register, got %v", err)
	}
	if user.Username != "testuser1" {
		t.Errorf("expected testuser1, got %s", user.Username)
	}

	// 3. Login with invalid username
	_, err = service.Login(ctx, "unknown_user", "SecurePassword123")
	if err == nil {
		t.Error("expected error for invalid username")
	}

	// 4. Login with invalid password
	_, err = service.Login(ctx, "testuser1", "WrongPassword123")
	if err == nil {
		t.Error("expected error for wrong password")
	}

	// 5. Login successful
	token, err := service.Login(ctx, "testuser1", "SecurePassword123")
	if err != nil {
		t.Fatalf("expected no error during login, got %v", err)
	}
	if token == "" {
		t.Error("expected non-empty token")
	}

	if err := service.SetLocalUserActive(ctx, user.ID, false); err != nil {
		t.Fatalf("disable user: %v", err)
	}
	if _, err := service.Login(ctx, "testuser1", "SecurePassword123"); err == nil {
		t.Error("disabled user was allowed to sign in")
	}
}

func TestAuthServiceLocalUserLifecycle(t *testing.T) {
	ctx := context.Background()
	repo := NewInMemoryUserRepository()
	service := NewAuthService(repo, "secret123")

	if _, err := service.CreateLocalUser(ctx, "", "SecurePassword123", "user@example.test", "User"); err == nil {
		t.Fatal("expected an empty username to be rejected")
	}
	user, err := service.CreateLocalUser(ctx, "local-user", "SecurePassword123", "user@example.test", "Local User")
	if err != nil {
		t.Fatalf("create local user: %v", err)
	}
	if user.Email != "user@example.test" || user.DisplayName != "Local User" || !user.IsActive {
		t.Fatalf("unexpected local user: %#v", user)
	}
	users, err := service.ListLocalUsers(ctx)
	if err != nil || len(users) != 1 {
		t.Fatalf("list local users: %#v, %v", users, err)
	}
	if err := service.SetLocalUserPassword(ctx, user.ID, "weak"); err == nil {
		t.Fatal("expected weak password to be rejected")
	}
	if err := service.SetLocalUserPassword(ctx, user.ID, "ReplacementPassword123"); err != nil {
		t.Fatalf("set local password: %v", err)
	}
	if _, err := service.Login(ctx, user.Username, "ReplacementPassword123"); err != nil {
		t.Fatalf("login with replacement password: %v", err)
	}
	if err := service.SetLocalUserActive(ctx, user.ID, false); err != nil {
		t.Fatalf("disable local user: %v", err)
	}
	if _, err := service.Login(ctx, user.Username, "ReplacementPassword123"); err == nil {
		t.Fatal("disabled local user was allowed to sign in")
	}
	updated, err := service.UpdateLocalUser(ctx, user.ID, "renamed@example.test", "Renamed User")
	if err != nil || updated.Email != "renamed@example.test" || updated.DisplayName != "Renamed User" {
		t.Fatalf("update local user: %#v, %v", updated, err)
	}
	if err := service.DeleteLocalUser(ctx, user.ID); err != nil {
		t.Fatalf("delete local user: %v", err)
	}
	if users, err := service.ListLocalUsers(ctx); err != nil || len(users) != 0 {
		t.Fatalf("expected deleted user to be absent: %#v, %v", users, err)
	}
}

func TestAuthServiceCreatesOnlyOneInitialAdmin(t *testing.T) {
	ctx := context.Background()
	service := NewAuthService(NewInMemoryUserRepository(), "secret123")
	admin, created, err := service.CreateInitialLocalAdmin(ctx, " admin ", "SecurePassword123", " admin@example.test ", " Admin ")
	if err != nil || !created {
		t.Fatalf("create initial admin: %#v, %t, %v", admin, created, err)
	}
	if admin.Username != "admin" || admin.Email != "admin@example.test" || admin.DisplayName != "Admin" {
		t.Fatalf("expected normalized administrator values, got %#v", admin)
	}
	if _, created, err := service.CreateInitialLocalAdmin(ctx, "other", "SecurePassword123", "", ""); err != nil || created {
		t.Fatalf("expected second setup to be refused, got created=%t err=%v", created, err)
	}
}
