package permissions

import (
	"context"
	"fmt"
	goperm "github.com/wtiger001/go-permissions"
	"strings"
)

// CanAccessScope is the common boundary for non-document resources. Membership
// is resolved by the permission service, never trusted from a client-supplied ID.
func CanAccessScope(ctx context.Context, userID, scope, id, action string) bool {
	if userID == "" {
		return false
	}
	if scope == "personal" || scope == "user" {
		return id == userID || id == "personal_"+userID
	}
	if Service == nil {
		return false
	}
	allowed, err := Service.HasPermission(ctx, goperm.Request{UserID: userID, Perm: "system.admin"})
	if err == nil && allowed {
		return true
	}
	if scope == "system" || scope == "global" {
		return action == "read"
	}
	if scope != "team" && scope != "project" {
		return false
	}
	if scope == "team" && strings.HasPrefix(id, "personal_") {
		return id == "personal_"+userID
	}
	if id == "" {
		return false
	}
	allowed, err = Service.HasPermission(ctx, goperm.Request{UserID: userID, Object: id, Perm: "wiki." + scope + "." + action})
	if err == nil && allowed {
		return true
	}
	if scope == "project" && scopeDatabase != nil {
		var teamID string
		if err := scopeDatabase.QueryRow(ctx, "SELECT team_id FROM projects WHERE id=$1", id).Scan(&teamID); err == nil {
			return CanAccessScope(ctx, userID, "team", teamID, action)
		}
	}
	return false
}

// ResolveDestination binds supplied container IDs to one authorized space.
func (e *AccessEvaluator) ResolveDestination(ctx context.Context, userID, teamID, projectID string, parentID *string) (string, string, error) {
	if e.db == nil {
		return teamID, projectID, nil
	}
	if parentID != nil {
		var parentTeam, parentProject string
		if err := e.db.QueryRow(ctx, "SELECT team_id,COALESCE(project_id,'') FROM documents WHERE id=$1 AND deleted_at IS NULL", *parentID).Scan(&parentTeam, &parentProject); err != nil {
			return "", "", fmt.Errorf("parent not found")
		}
		if teamID != "" && teamID != parentTeam || projectID != "" && projectID != parentProject {
			return "", "", fmt.Errorf("parent must belong to the destination space")
		}
		allowed, _, err := e.EvaluateDocumentAccess(ctx, userID, *parentID, "write", "", "")
		if err != nil || !allowed {
			return "", "", fmt.Errorf("forbidden: parent write access required")
		}
		teamID, projectID = parentTeam, parentProject
	}
	if projectID != "" {
		var ownerTeam string
		if err := e.db.QueryRow(ctx, "SELECT team_id FROM projects WHERE id=$1", projectID).Scan(&ownerTeam); err != nil {
			return "", "", fmt.Errorf("project not found")
		}
		if teamID != "" && teamID != ownerTeam {
			return "", "", fmt.Errorf("project does not belong to team")
		}
		teamID = ownerTeam
	}
	allowed := CanAccessScope(ctx, userID, "team", teamID, "write")
	if projectID != "" {
		allowed = allowed || CanAccessScope(ctx, userID, "project", projectID, "write")
	}
	if !allowed {
		return "", "", fmt.Errorf("forbidden: destination write access required")
	}
	return teamID, projectID, nil
}

// CanAccessSubtree protects hidden descendants from destructive parent actions.
func (e *AccessEvaluator) CanAccessSubtree(ctx context.Context, userID, id, action string) bool {
	if e.db == nil {
		return true
	}
	rows, err := e.db.Query(ctx, `WITH RECURSIVE subtree AS(SELECT id FROM documents WHERE id=$1 UNION SELECT d.id FROM documents d JOIN subtree p ON d.parent_id=p.id) SELECT id FROM subtree`, id)
	if err != nil {
		return false
	}
	ids := []string{}
	for rows.Next() {
		var child string
		if rows.Scan(&child) != nil {
			rows.Close()
			return false
		}
		ids = append(ids, child)
	}
	rows.Close()
	if rows.Err() != nil {
		return false
	}
	for _, child := range ids {
		allowed, _, err := e.EvaluateDocumentAccess(ctx, userID, child, action, "", "")
		if err != nil || !allowed {
			return false
		}
	}
	return len(ids) > 0
}
