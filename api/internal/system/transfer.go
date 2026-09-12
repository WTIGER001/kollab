package system

import (
	"context"
	"fmt"
	"kollab/api/internal/transfer"
)

func (s *SystemService) ExportScope(ctx context.Context, kind, id string) (*transfer.Archive, error) {
	r, ok := s.repo.(transfer.Repository)
	if !ok {
		return nil, fmt.Errorf("team/project transfer requires PostgreSQL")
	}
	return r.ExportScope(ctx, kind, id)
}
func (s *SystemService) ImportScope(ctx context.Context, a *transfer.Archive, o transfer.Options, publish func(map[string][]byte) error) (*transfer.Result, error) {
	r, ok := s.repo.(transfer.Repository)
	if !ok {
		return nil, fmt.Errorf("team/project transfer requires PostgreSQL")
	}
	return r.ImportScope(ctx, a, o, publish)
}
