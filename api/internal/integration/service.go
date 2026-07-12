package integration

import (
	"context"
	"fmt"

	"kollab/api/internal/domain"
)

type service struct {
	repo domain.IntegrationRepository
}

func NewService(repo domain.IntegrationRepository) domain.IntegrationService {
	return &service{repo: repo}
}

func (s *service) Create(ctx context.Context, integration *domain.Integration) error {
	// Simple validation
	if integration.Scope == "" {
		return fmt.Errorf("scope is required")
	}
	if integration.Provider == "" {
		return fmt.Errorf("provider is required")
	}
	if integration.Name == "" {
		return fmt.Errorf("name is required")
	}
	if integration.Scope != domain.IntegrationScopeSystem && integration.EntityID == "" {
		return fmt.Errorf("entityID is required for non-system scopes")
	}

	return s.repo.Create(ctx, integration)
}

func (s *service) GetByID(ctx context.Context, id string) (*domain.Integration, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *service) GetByScope(ctx context.Context, scope domain.IntegrationScope, entityID string) ([]*domain.Integration, error) {
	return s.repo.GetByScope(ctx, scope, entityID)
}

func (s *service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
