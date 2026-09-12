package user

import (
	"context"
	"errors"
	"sync"

	"kollab/api/internal/domain"
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

func (r *InMemoryUserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	u, ok := r.users[id]
	if !ok {
		return nil, errors.New("user not found")
	}
	copy := *u
	return &copy, nil
}

func (r *InMemoryUserRepository) List(ctx context.Context) ([]*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	users := make([]*domain.User, 0, len(r.users))
	for _, u := range r.users {
		copy := *u
		users = append(users, &copy)
	}
	return users, nil
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

	copy := *user
	if !copy.IsActive {
		copy.IsActive = true
	}
	r.users[user.ID] = &copy
	return nil
}

func (r *InMemoryUserRepository) SetActive(ctx context.Context, id string, active bool) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	u, ok := r.users[id]
	if !ok {
		return errors.New("user not found")
	}
	u.IsActive = active
	return nil
}

func (r *InMemoryUserRepository) UpdatePassword(ctx context.Context, id, passwordHash string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	u, ok := r.users[id]
	if !ok {
		return errors.New("user not found")
	}
	u.PasswordHash = passwordHash
	return nil
}

func (r *InMemoryUserRepository) UpdateProfile(ctx context.Context, id, email, displayName string) (*domain.User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	u, ok := r.users[id]
	if !ok {
		return nil, errors.New("user not found")
	}
	u.Email = email
	u.DisplayName = displayName
	copy := *u
	return &copy, nil
}

func (r *InMemoryUserRepository) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.users[id]; !ok {
		return errors.New("user not found")
	}
	delete(r.users, id)
	return nil
}

func (r *InMemoryUserRepository) CreateInitialLocalAdmin(ctx context.Context, user *domain.User) (bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, existing := range r.users {
		if existing != nil {
			return false, nil
		}
	}
	copy := *user
	copy.IsActive = true
	r.users[user.ID] = &copy
	return true, nil
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
		copy := *user
		if !copy.IsActive {
			copy.IsActive = true
		}
		r.users[user.ID] = &copy
	}
	return nil
}
