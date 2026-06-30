package permissions

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	goperm "github.com/wtiger001/go-permissions"
)

// KollabIdentityProvider implements the permissions.IdentityProvider interface
// using the local PostgreSQL database (team_members table).
type KollabIdentityProvider struct {
	db *pgxpool.Pool
}

var _ goperm.IdentityProvider = (*KollabIdentityProvider)(nil)

// NewKollabIdentityProvider creates a new KollabIdentityProvider.
func NewKollabIdentityProvider(db *pgxpool.Pool) *KollabIdentityProvider {
	return &KollabIdentityProvider{db: db}
}

// GetUserGroups resolves all team IDs the user is a member of.
func (p *KollabIdentityProvider) GetUserGroups(ctx context.Context, userID string) ([]string, error) {
	rows, err := p.db.Query(ctx, "SELECT team_id FROM team_members WHERE user_id = $1", userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user groups: %w", err)
	}
	defer rows.Close()

	var groups []string
	for rows.Next() {
		var groupID string
		if err := rows.Scan(&groupID); err != nil {
			return nil, fmt.Errorf("failed to scan group ID: %w", err)
		}
		groups = append(groups, groupID)
	}
	return groups, nil
}

// GetGroupMembers resolves all user IDs in a team.
func (p *KollabIdentityProvider) GetGroupMembers(ctx context.Context, groupID string) ([]string, error) {
	rows, err := p.db.Query(ctx, "SELECT user_id FROM team_members WHERE team_id = $1", groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to query group members: %w", err)
	}
	defer rows.Close()

	var users []string
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			return nil, fmt.Errorf("failed to scan user ID: %w", err)
		}
		users = append(users, userID)
	}
	return users, nil
}

// IsUserInGroup checks if a user is a member of a team.
func (p *KollabIdentityProvider) IsUserInGroup(ctx context.Context, userID, groupID string) (bool, error) {
	var exists bool
	err := p.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM team_members WHERE user_id = $1 AND team_id = $2)", userID, groupID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check user group membership: %w", err)
	}
	return exists, nil
}
