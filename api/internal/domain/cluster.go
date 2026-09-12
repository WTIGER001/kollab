package domain

import "context"

type ClusterMember struct {
	ConnectionID  string `json:"connectionId"`
	UserID        string `json:"userId"`
	Username      string `json:"username"`
	Color         string `json:"color"`
	Position      int    `json:"position"`
	Anchor        int    `json:"anchor"`
	CursorVersion int64  `json:"cursorVersion"`
}
type ClusterState struct {
	Epoch       string
	TreeVersion int64
}
type CollaborationCluster interface {
	State(context.Context) (ClusterState, error)
	Members(context.Context, string, []ClusterMember) ([]ClusterMember, error)
	Changed(context.Context, bool) (string, error)
}
