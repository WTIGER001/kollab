package domain

import "context"

type CollaborativeState struct {
	Version int64
	Update  string
}
type CollaborationRepository interface {
	LoadState(context.Context, string) (CollaborativeState, error)
	SaveState(context.Context, string, int64, string, ...string) (CollaborativeState, bool, error)
}
