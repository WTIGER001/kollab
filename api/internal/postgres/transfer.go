package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"kollab/api/internal/transfer"
)

func (r *PostgresSystemRepository) ExportScope(ctx context.Context, kind, id string) (*transfer.Archive, error) {
	snapshot, err := r.ExportBackup(ctx)
	if err != nil {
		return nil, err
	}
	return transfer.FromSnapshot(snapshot, kind, id)
}
func (r *PostgresSystemRepository) ImportScope(ctx context.Context, a *transfer.Archive, o transfer.Options, publish func(map[string][]byte) error) (*transfer.Result, error) {
	p, err := transfer.BuildPlan(a, o)
	if err != nil {
		return nil, err
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	// Serialize name checks with other imports. Unique indexes also protect against
	// ordinary creation requests outside the maintenance coordinator.
	if _, err = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext('kollab:scope-import'))"); err != nil {
		return nil, err
	}
	users := map[string]bool{o.OwnerID: true}
	if o.ActorID != "" {
		users[o.ActorID] = true
	}
	for _, id := range o.UserMap {
		if id != "" {
			users[id] = true
		}
	}
	for id := range users {
		var exists bool
		if err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE id=$1 AND is_active)", id).Scan(&exists); err != nil {
			return nil, err
		}
		if !exists {
			return nil, fmt.Errorf("mapped user or owner no longer exists or is inactive")
		}
	}
	if o.TeamID != "" {
		var exists bool
		if err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM teams WHERE id=$1 AND id NOT LIKE 'personal_%')", o.TeamID).Scan(&exists); err != nil {
			return nil, err
		}
		if !exists {
			return nil, fmt.Errorf("destination team no longer exists")
		}
		// Membership in an existing team has broader effects than project access.
		// Require selected members to already belong; this import never widens it.
		for _, id := range p.Members {
			if err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM team_members WHERE team_id=$1 AND user_id=$2)", o.TeamID, id).Scan(&exists); err != nil {
				return nil, err
			}
			if !exists {
				return nil, fmt.Errorf("owner and mapped members must already belong to the destination team")
			}
		}
	}
	for _, team := range p.Tables["teams"] {
		var exists bool
		err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM teams WHERE lower(name)=lower($1) OR lower(abbreviation)=lower($2))", transfer.Text(team, "name"), transfer.Text(team, "abbreviation")).Scan(&exists)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, fmt.Errorf("team name or abbreviation already exists; choose another")
		}
	}
	for _, project := range p.Tables["projects"] {
		var exists bool
		err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM projects WHERE team_id=$1 AND (lower(name)=lower($2) OR lower(abbreviation)=lower($3)))", p.Result.TeamID, transfer.Text(project, "name"), transfer.Text(project, "abbreviation")).Scan(&exists)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, fmt.Errorf("project name or abbreviation already exists in this team; choose another")
		}
	}
	// Reuse global tags by name without modifying destination tag metadata.
	keepTags := []transfer.Row{}
	for _, tag := range p.Tables["tags"] {
		var id string
		err = tx.QueryRow(ctx, "SELECT id FROM tags WHERE name=$1", transfer.Text(tag, "name")).Scan(&id)
		if err == pgx.ErrNoRows {
			keepTags = append(keepTags, tag)
		} else if err != nil {
			return nil, err
		} else {
			for _, link := range p.Tables["document_tags"] {
				if transfer.Text(link, "tag_id") == transfer.Text(tag, "id") {
					link["tag_id"] = id
				}
			}
		}
	}
	p.Tables["tags"] = keepTags
	parents := map[string]map[string]string{}
	for _, table := range []string{"documents", "comments"} {
		parents[table] = map[string]string{}
		for _, row := range p.Tables[table] {
			if id := transfer.Text(row, "parent_id"); id != "" {
				parents[table][transfer.Text(row, "id")] = id
				row["parent_id"] = nil
			}
		}
	}
	for _, table := range transfer.Order {
		for _, row := range p.Tables[table] {
			// Fixed allowlist selects columns; identifiers never come from archive input.
			cols := []string{}
			args := []any{}
			places := []string{}
			for _, column := range strings.Fields(transfer.Columns[table]) {
				if value, ok := row[column]; ok {
					cols = append(cols, pgx.Identifier{column}.Sanitize())
					args = append(args, value)
					places = append(places, fmt.Sprintf("$%d", len(args)))
				}
			}
			_, err = tx.Exec(ctx, "INSERT INTO "+pgx.Identifier{table}.Sanitize()+" ("+strings.Join(cols, ",")+") VALUES ("+strings.Join(places, ",")+")", args...)
			if err != nil {
				if pgerr, ok := err.(*pgconn.PgError); ok && pgerr.Code == "23505" {
					return nil, fmt.Errorf("a name or abbreviation conflicts with existing data; choose another")
				}
				return nil, fmt.Errorf("invalid %s record: import rolled back", table)
			}
		}
	}
	for table, rows := range parents {
		for id, parent := range rows {
			if _, err = tx.Exec(ctx, "UPDATE "+pgx.Identifier{table}.Sanitize()+" SET parent_id=$2 WHERE id=$1", id, parent); err != nil {
				return nil, err
			}
		}
	}
	if o.TeamID == "" {
		for _, id := range p.Members {
			if _, err = tx.Exec(ctx, "INSERT INTO team_members(team_id,user_id) VALUES($1,$2)", p.Result.TeamID, id); err != nil {
				return nil, err
			}
		}
	}
	grant := func(kind, object, user, role string) error {
		bindings, _ := json.Marshal(map[string]string{"id": object})
		_, err := tx.Exec(ctx, "INSERT INTO principal_roles(principal_kind,principal_id,role_id,binding_values) VALUES('user',$1,$2,$3::jsonb) ON CONFLICT DO NOTHING", user, "builtin.wiki."+kind+"."+role, string(bindings))
		return err
	}
	if o.TeamID == "" {
		if err = grant("team", p.Result.TeamID, o.OwnerID, "owner"); err != nil {
			return nil, err
		}
		for _, id := range p.Members {
			if id != o.OwnerID {
				if err = grant("team", p.Result.TeamID, id, "editor"); err != nil {
					return nil, err
				}
			}
		}
	}
	for _, project := range p.Tables["projects"] {
		for _, id := range p.Members {
			role := "editor"
			if id == o.OwnerID {
				role = "owner"
			}
			if err = grant("project", transfer.Text(project, "id"), id, role); err != nil {
				return nil, err
			}
		}
	}
	if _, err = tx.Exec(ctx, "UPDATE comments c SET created_name=COALESCE(NULLIF(u.display_name,''),u.username) FROM users u WHERE c.created_by=u.id AND c.document_id=ANY($1)", documentIDs(p)); err != nil {
		return nil, err
	}
	if _, err = tx.Exec(ctx, "UPDATE cluster_control SET tree_version=tree_version+1 WHERE id"); err != nil {
		return nil, err
	}
	if err = publish(p.Files); err != nil {
		return nil, fmt.Errorf("unable to publish imported files; database import rolled back: %w", err)
	}
	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("import commit could not be confirmed; check the teams directory before retrying (new files retained)")
	}
	return &p.Result, nil
}
func documentIDs(p *transfer.Plan) []string {
	ids := []string{}
	for _, r := range p.Tables["documents"] {
		ids = append(ids, transfer.Text(r, "id"))
	}
	return ids
}
