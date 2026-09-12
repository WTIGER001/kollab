package domain

import (
	"context"
)

type User struct {
	ID           string `json:"id"`
	Username     string `json:"username"`
	PasswordHash string `json:"-"`
	Email        string `json:"email"`
	DisplayName  string `json:"displayName"`
	IsActive     bool   `json:"isActive"`
}

type UserRepository interface {
	GetByUsername(ctx context.Context, username string) (*User, error)
	GetByID(ctx context.Context, id string) (*User, error)
	List(ctx context.Context) ([]*User, error)
	Create(ctx context.Context, user *User) error
	Upsert(ctx context.Context, user *User) error
	SetActive(ctx context.Context, id string, active bool) error
	UpdatePassword(ctx context.Context, id, passwordHash string) error
	UpdateProfile(ctx context.Context, id, email, displayName string) (*User, error)
	Delete(ctx context.Context, id string) error
	CreateInitialLocalAdmin(ctx context.Context, user *User) (bool, error)
}

type AuthService interface {
	Register(ctx context.Context, username, password string) (*User, error)
	Login(ctx context.Context, username, password string) (string, error) // Returns signed JWT token string
	CreateLocalUser(ctx context.Context, username, password, email, displayName string) (*User, error)
	ListLocalUsers(ctx context.Context) ([]*User, error)
	SetLocalUserActive(ctx context.Context, id string, active bool) error
	SetLocalUserPassword(ctx context.Context, id, password string) error
	UpdateLocalUser(ctx context.Context, id, email, displayName string) (*User, error)
	DeleteLocalUser(ctx context.Context, id string) error
	CreateInitialLocalAdmin(ctx context.Context, username, password, email, displayName string) (*User, bool, error)
}
