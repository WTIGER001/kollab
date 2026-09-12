package permissions

import "context"

func (e *AccessEvaluator) SetImageOwner(ctx context.Context, imageID, userID string) error {
	if e.db == nil {
		return nil
	}
	_, err := e.db.Exec(ctx, "UPDATE images SET uploaded_by=$2 WHERE id=$1", imageID, userID)
	return err
}

func (e *AccessEvaluator) EvaluateLibraryImageAccess(ctx context.Context, userID, id, action string) bool {
	if e.db == nil {
		return true
	}
	var scope, team, project, owner string
	if err := e.db.QueryRow(ctx, "SELECT scope,COALESCE(team_id,''),COALESCE(project_id,''),COALESCE(user_id,'') FROM library_images WHERE id=$1", id).Scan(&scope, &team, &project, &owner); err != nil {
		return false
	}
	target := owner
	if scope == "team" {
		target = team
	}
	if scope == "project" {
		target = project
	}
	return CanAccessScope(ctx, userID, scope, target, action)
}

func (e *AccessEvaluator) EvaluateImageAccess(ctx context.Context, userID, id, action string) bool {
	if e.db == nil {
		return true
	}
	if action == "read" {
		// Only explicitly selected site branding is public. Document images retain
		// their page or library permissions even when their URL is known.
		var public bool
		if err := e.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM workspace_themes WHERE logo_url LIKE '%/api/images/'||$1||'/%')
   OR EXISTS(SELECT 1 FROM system_settings WHERE key='auth_logo_url' AND value LIKE '%/api/images/'||$1||'/%')`, id).Scan(&public); err == nil && public {
			return true
		}
	}
	if userID == "" {
		return false
	}
	if CanAccessScope(ctx, userID, "system", "", "write") {
		return true
	}
	var owner string
	if err := e.db.QueryRow(ctx, "SELECT COALESCE(uploaded_by,'') FROM images WHERE id=$1", id).Scan(&owner); err != nil {
		return false
	}
	if owner == userID {
		return true
	}
	if action == "read" {
		containers, err := e.db.Query(ctx, `SELECT 'team',id FROM teams WHERE logo_url LIKE '%/api/images/'||$1||'/%'
  UNION ALL SELECT 'project',id FROM projects WHERE logo_url LIKE '%/api/images/'||$1||'/%'`, id)
		if err == nil {
			type scopeRef struct{ scope, id string }
			refs := []scopeRef{}
			for containers.Next() {
				var ref scopeRef
				if containers.Scan(&ref.scope, &ref.id) == nil {
					refs = append(refs, ref)
				}
			}
			containers.Close()
			for _, ref := range refs {
				if CanAccessScope(ctx, userID, ref.scope, ref.id, "read") {
					return true
				}
			}
		}
	}

	rows, err := e.db.Query(ctx, "SELECT id FROM library_images WHERE image_id=$1", id)
	if err != nil {
		return false
	}
	ids := []string{}
	for rows.Next() {
		var v string
		if rows.Scan(&v) != nil {
			rows.Close()
			return false
		}
		ids = append(ids, v)
	}
	rows.Close()
	for _, v := range ids {
		if e.EvaluateLibraryImageAccess(ctx, userID, v, action) {
			return true
		}
	}
	if action != "read" {
		return false
	}
	rows, err = e.db.Query(ctx, "SELECT d.id FROM documents d LEFT JOIN collaborative_states cs ON cs.document_id=d.id WHERE d.deleted_at IS NULL AND strpos(COALESCE(cs.content,d.content)::text,$1)>0", id)
	if err != nil {
		return false
	}
	ids = nil
	for rows.Next() {
		var v string
		if rows.Scan(&v) != nil {
			rows.Close()
			return false
		}
		ids = append(ids, v)
	}
	rows.Close()
	for _, v := range ids {
		allowed, _, err := e.EvaluateDocumentAccess(ctx, userID, v, "read", "", "")
		if err == nil && allowed {
			return true
		}
	}
	return false
}
