package user

import (
	"context"
	"errors"
	"sync"

	"arkollab/api/internal/domain"
)

type InMemoryUserRepository struct {
	mu    sync.RWMutex
	users map[string]*domain.User
}

func NewInMemoryUserRepository() *InMemoryUserRepository {
	return &InMemoryUserRepository{
		users: make(map[string]*domain.User),
	}
}

func (r *InMemoryUserRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, u := range r.users {
		if u.Username == username {
			return u, nil
		}
	}
	return nil, errors.New("user not found")
}

func (r *InMemoryUserRepository) Create(ctx context.Context, user *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.users[user.ID]; exists {
		return errors.New("user already exists")
	}

	for _, u := range r.users {
		if u.Username == user.Username {
			return errors.New("username already taken")
		}
	}

	r.users[user.ID] = user
	return nil
}

func (r *InMemoryUserRepository) Upsert(ctx context.Context, user *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, exists := r.users[user.ID]
	if exists {
		existing.Username = user.Username
		existing.Email = user.Email
		existing.DisplayName = user.DisplayName
		if user.PasswordHash != "" {
			existing.PasswordHash = user.PasswordHash
		}
	} else {
		r.users[user.ID] = user
	}
	return nil
}
