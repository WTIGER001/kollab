package domain

import (
	"context"
	"time"
)

type IntegrationScope string

const (
	IntegrationScopeSystem  IntegrationScope = "system"
	IntegrationScopeTeam    IntegrationScope = "team"
	IntegrationScopeProject IntegrationScope = "project"
	IntegrationScopeUser    IntegrationScope = "user"
)

type IntegrationProvider string

const (
	ProviderGitLab    IntegrationProvider = "gitlab"
	ProviderJiraCloud IntegrationProvider = "jira-cloud"
	ProviderJiraDC    IntegrationProvider = "jira-dc"
	ProviderGitHub    IntegrationProvider = "github"
	ProviderPlane     IntegrationProvider = "plane"
)

type Integration struct {
	ID          string              `json:"id"`
	Scope       IntegrationScope    `json:"scope"`
	EntityID    string              `json:"entityId"` // Can be empty for system scope
	Provider    IntegrationProvider `json:"provider"`
	Name        string              `json:"name"`
	URL         string              `json:"url"`
	Credentials map[string]string   `json:"credentials,omitempty"`
	CreatedAt   time.Time           `json:"createdAt"`
	UpdatedAt   time.Time           `json:"updatedAt"`
}

type IntegrationRepository interface {
	Create(ctx context.Context, integration *Integration) error
	GetByID(ctx context.Context, id string) (*Integration, error)
	GetByScope(ctx context.Context, scope IntegrationScope, entityID string) ([]*Integration, error)
	Delete(ctx context.Context, id string) error
}

type IntegrationService interface {
	Create(ctx context.Context, integration *Integration) error
	GetByID(ctx context.Context, id string) (*Integration, error)
	GetByScope(ctx context.Context, scope IntegrationScope, entityID string) ([]*Integration, error)
	Delete(ctx context.Context, id string) error
}
