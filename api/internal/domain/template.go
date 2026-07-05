package domain

import (
	"context"
	"time"
)

type TemplateScope string

const (
	TemplateScopeSystem   TemplateScope = "system"
	TemplateScopeTeam     TemplateScope = "team"
	TemplateScopePersonal TemplateScope = "personal"
)

type TemplateType string

const (
	TemplateTypePage  TemplateType = "page"
	TemplateTypeBlock TemplateType = "block"
)

type Template struct {
	ID           string        `json:"id"`
	Title        string        `json:"title"`
	Description  string        `json:"description"`
	Content      string        `json:"content"`
	Scope        TemplateScope `json:"scope"`
	TemplateType TemplateType  `json:"templateType"`
	TeamID       *string       `json:"teamId,omitempty"`
	UserID       *string       `json:"userId,omitempty"`
	CreatedAt    time.Time     `json:"createdAt"`
}

type TemplateRepository interface {
	Create(ctx context.Context, template *Template) error
	GetByID(ctx context.Context, id string) (*Template, error)
	GetByContext(ctx context.Context, scope *TemplateScope, templateType *TemplateType, teamID *string, userID *string) ([]*Template, error)
	Update(ctx context.Context, template *Template) error
	Delete(ctx context.Context, id string) error
}
