package domain

import "fmt"

type SyncConflict struct {
	ID              string `json:"id"`
	Table           string `json:"table"`
	Key             string `json:"key"`
	Local           any    `json:"local"`
	Incoming        any    `json:"incoming"`
	LocalDeleted    bool   `json:"localDeleted"`
	IncomingDeleted bool   `json:"incomingDeleted"`
}
type SyncConflictError struct{ Conflict SyncConflict }

func (e *SyncConflictError) Error() string {
	return fmt.Sprintf("conflicting changes in %s; no changes were imported", e.Conflict.Table)
}
