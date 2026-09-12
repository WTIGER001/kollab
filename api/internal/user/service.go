package user

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/google/uuid"

	"kollab/api/internal/domain"
)

func validatePassword(password string) error {
	if len(password) < 12 {
		return errors.New("password must be at least 12 characters")
	}
	var upper, lower, digit bool
	for _, r := range password {
		upper = upper || unicode.IsUpper(r)
		lower = lower || unicode.IsLower(r)
		digit = digit || unicode.IsDigit(r)
	}
	if !upper || !lower || !digit {
		return errors.New("password must include uppercase, lowercase, and numeric characters")
	}
	return nil
}

type AuthService struct {
	repo      domain.UserRepository
	jwtSecret []byte
}

func NewAuthService(repo domain.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{
		repo:      repo,
		jwtSecret: []byte(jwtSecret),
	}
}

func (s *AuthService) Register(ctx context.Context, username, password string) (*domain.User, error) {
	if err := validatePassword(password); err != nil {
		return nil, err
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &domain.User{
		ID:           uuid.New().String(),
		Username:     username,
		PasswordHash: string(hashed),
		IsActive:     true,
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *AuthService) CreateLocalUser(ctx context.Context, username, password, email, displayName string) (*domain.User, error) {
	if username == "" {
		return nil, errors.New("username is required")
	}
	if err := validatePassword(password); err != nil {
		return nil, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	user := &domain.User{ID: uuid.NewString(), Username: username, PasswordHash: string(hash), Email: email, DisplayName: displayName, IsActive: true}
	if err := s.repo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	return user, nil
}

func (s *AuthService) CreateInitialLocalAdmin(ctx context.Context, username, password, email, displayName string) (*domain.User, bool, error) {
	if username = strings.TrimSpace(username); username == "" {
		return nil, false, errors.New("username is required")
	}
	if err := validatePassword(password); err != nil {
		return nil, false, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, false, err
	}
	user := &domain.User{ID: uuid.NewString(), Username: username, PasswordHash: string(hash), Email: strings.TrimSpace(email), DisplayName: strings.TrimSpace(displayName), IsActive: true}
	created, err := s.repo.CreateInitialLocalAdmin(ctx, user)
	if err != nil || !created {
		return nil, created, err
	}
	return user, true, nil
}

func (s *AuthService) ListLocalUsers(ctx context.Context) ([]*domain.User, error) {
	return s.repo.List(ctx)
}
func (s *AuthService) SetLocalUserActive(ctx context.Context, id string, active bool) error {
	return s.repo.SetActive(ctx, id, active)
}
func (s *AuthService) SetLocalUserPassword(ctx context.Context, id, password string) error {
	if err := validatePassword(password); err != nil {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.repo.UpdatePassword(ctx, id, string(hash))
}

func (s *AuthService) UpdateLocalUser(ctx context.Context, id, email, displayName string) (*domain.User, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("user ID is required")
	}
	return s.repo.UpdateProfile(ctx, id, strings.TrimSpace(email), strings.TrimSpace(displayName))
}

func (s *AuthService) DeleteLocalUser(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("user ID is required")
	}
	return s.repo.Delete(ctx, id)
}

func (s *AuthService) Login(ctx context.Context, username, password string) (string, error) {
	user, err := s.repo.GetByUsername(ctx, username)
	if err != nil {
		return "", errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", errors.New("invalid credentials")
	}
	if !user.IsActive {
		return "", errors.New("invalid credentials")
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":            user.ID,
		"username":           user.Username,
		"credential_version": domain.CredentialVersion(user.PasswordHash),
		"exp":                time.Now().Add(time.Hour * 24).Unix(), // 24 hours
	})

	return token.SignedString(s.jwtSecret)
}
