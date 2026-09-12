package postgres

import (
	"fmt"
	"kollab/api/internal/permissions"
	"kollab/api/internal/transfer"
	"testing"
)

func TestScopeTransferCreatesNewDestinationAtomically(t *testing.T) {
	db, ctx := setupTestDB(t)
	if err := permissions.InitPermissions(ctx, db); err != nil {
		t.Fatal(err)
	}
	repo := NewPostgresSystemRepository(db)
	if _, err := db.Exec(ctx, "INSERT INTO team_members(team_id,user_id) VALUES('team_eng','sh4ag0cxowti') ON CONFLICT DO NOTHING"); err != nil {
		t.Fatal(err)
	}
	// Source fixtures exercise pages, versions, files, comments and global tags.
	_, err := db.Exec(ctx, `INSERT INTO documents(id,title,content,team_id,project_id,created_at,updated_at,slug,created_by) VALUES('transfer-root','Root','{"type":"doc","content":[]}','team_eng','proj_wiki',now(),now(),'transfer-root','sh4ag0cxowti');
 INSERT INTO documents(id,title,content,team_id,project_id,parent_id,created_at,updated_at) VALUES('transfer-child','Child','{"type":"doc","content":[]}','team_eng','proj_wiki','transfer-root',now(),now());
 INSERT INTO document_versions(id,document_id,content,version_number,created_at) VALUES('transfer-version','transfer-root','{"type":"doc","content":[]}',1,now());
 INSERT INTO comments(id,document_id,content,created_by,created_name,created_at,updated_at) VALUES('transfer-comment','transfer-root','Hello','sh4ag0cxowti','Old author',now(),now());
 INSERT INTO attachments(id,document_id,filename,mime_type,file_size,storage_key) VALUES('transfer-file','transfer-root','note.txt','text/plain',5,'attachments/source_note.txt');
 INSERT INTO tags(id,name) VALUES('transfer-tag','Transfer label');
 INSERT INTO document_tags(document_id,tag_id) VALUES('transfer-root','transfer-tag');`)
	if err != nil {
		t.Fatal(err)
	}
	a, err := repo.ExportScope(ctx, "project", "proj_wiki")
	if err != nil {
		t.Fatal(err)
	}
	a.Files["attachments/source_note.txt"] = []byte("hello")
	o := transfer.Options{Name: "Imported project", Abbreviation: "imported", TeamName: "Imported team", TeamAbbreviation: "imported-team", OwnerID: "sh4ag0cxowti"}
	published := false
	result, err := repo.ImportScope(ctx, a, o, func(files map[string][]byte) error {
		published = true
		if len(files) != 1 {
			t.Fatalf("wrong files: %d", len(files))
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if !published || result.TeamID == "team_eng" || result.ProjectID == "proj_wiki" {
		t.Fatal("destination was not created")
	}
	var n int
	if err = db.QueryRow(ctx, "SELECT count(*) FROM documents WHERE project_id=$1", result.ProjectID).Scan(&n); err != nil || n != len(a.Tables["documents"]) {
		t.Fatalf("missing imported pages: %d %v", n, err)
	}
	if err = db.QueryRow(ctx, "SELECT count(*) FROM documents c JOIN documents p ON c.parent_id=p.id WHERE c.project_id=$1 AND c.title='Child' AND p.title='Root'", result.ProjectID).Scan(&n); err != nil || n != 1 {
		t.Fatalf("parent remapping failed: %v", err)
	}
	if err = db.QueryRow(ctx, "SELECT count(*) FROM principal_roles WHERE principal_id=$1 AND role_id='builtin.wiki.project.owner' AND binding_values->>'id'=$2", o.OwnerID, result.ProjectID).Scan(&n); err != nil || n != 1 {
		t.Fatal("owner grant missing")
	}
	if err = db.QueryRow(ctx, "SELECT count(*) FROM tags WHERE name='Transfer label'").Scan(&n); err != nil || n != 1 {
		t.Fatal("tags duplicated")
	}
	if _, err = repo.ImportScope(ctx, a, o, func(map[string][]byte) error { t.Fatal("published despite conflict"); return nil }); err == nil {
		t.Fatal("duplicate name accepted")
	}
	o.Name = "Existing parent import"
	o.Abbreviation = "existing-parent"
	o.TeamID = "team_eng"
	if _, err = repo.ImportScope(ctx, a, o, func(map[string][]byte) error { return nil }); err != nil {
		t.Fatal(err)
	}
	o.Name = "Failed import"
	o.Abbreviation = "failed"
	if _, err = repo.ImportScope(ctx, a, o, func(map[string][]byte) error { return fmt.Errorf("disk full") }); err == nil {
		t.Fatal("publish failure ignored")
	}
	db.QueryRow(ctx, "SELECT count(*) FROM projects WHERE abbreviation='failed'").Scan(&n)
	if n != 0 {
		t.Fatal("failed import left a partial project")
	}
	o.OwnerID = "missing"
	if _, err = repo.ImportScope(ctx, a, o, func(map[string][]byte) error { t.Fatal("published with missing owner"); return nil }); err == nil {
		t.Fatal("missing owner accepted")
	}
	// Team import includes projects and creates a fresh parent without prerequisites.
	a, err = repo.ExportScope(ctx, "team", "team_mkt")
	if err != nil {
		t.Fatal(err)
	}
	o = transfer.Options{Name: "Imported marketing", Abbreviation: "new-marketing", OwnerID: "sh4ag0cxowti"}
	result, err = repo.ImportScope(ctx, a, o, func(map[string][]byte) error { return nil })
	if err != nil {
		t.Fatal(err)
	}
	if result.ProjectID != "" || result.TeamID == "team_mkt" {
		t.Fatal("wrong team destination")
	}
}

func TestScopeTransferBetweenSeparateDatabases(t *testing.T) {
	source, ctx := setupTestDB(t)
	target, _ := setupTestDB(t)
	if err := permissions.InitPermissions(ctx, target); err != nil {
		t.Fatal(err)
	}
	_, err := source.Exec(ctx, `INSERT INTO users(id,username,display_name) VALUES('remote-author','remote.author','Remote Author');
 INSERT INTO teams(id,name,abbreviation) VALUES('team_remote_only','Remote team','remote-only');
 INSERT INTO team_members(team_id,user_id) VALUES('team_remote_only','remote-author');
 INSERT INTO projects(id,team_id,name,abbreviation) VALUES('proj_remote_only','team_remote_only','Remote project','remote-project');
 INSERT INTO documents(id,team_id,project_id,title,content,created_at,updated_at,created_by) VALUES('remote-page','team_remote_only','proj_remote_only','Portable page','{"type":"doc","content":[]}',now(),now(),'remote-author');`)
	if err != nil {
		t.Fatal(err)
	}
	a, err := NewPostgresSystemRepository(source).ExportScope(ctx, "team", "team_remote_only")
	if err != nil {
		t.Fatal(err)
	}
	wire, err := transfer.Encode(a)
	if err != nil {
		t.Fatal(err)
	}
	a, err = transfer.Decode(wire)
	if err != nil {
		t.Fatal(err)
	}
	o := transfer.Options{Name: "From another server", Abbreviation: "from-another-server", OwnerID: "sh4ag0cxowti", UserMap: map[string]string{"remote-author": "sh4ag0cxowti"}}
	result, err := NewPostgresSystemRepository(target).ImportScope(ctx, a, o, func(map[string][]byte) error { return nil })
	if err != nil {
		t.Fatal(err)
	}
	var author string
	if err = target.QueryRow(ctx, "SELECT created_by FROM documents WHERE team_id=$1", result.TeamID).Scan(&author); err != nil || author != "sh4ag0cxowti" {
		t.Fatalf("local author mapping failed: %s %v", author, err)
	}
	var n int
	target.QueryRow(ctx, "SELECT count(*) FROM teams WHERE id='team_remote_only'").Scan(&n)
	if n != 0 {
		t.Fatal("source IDs reused")
	}
	target.QueryRow(ctx, "SELECT count(*) FROM users WHERE id='remote-author'").Scan(&n)
	if n != 0 {
		t.Fatal("source account imported")
	}
	target.QueryRow(ctx, "SELECT count(*) FROM teams WHERE id='team_eng'").Scan(&n)
	if n != 1 {
		t.Fatal("unrelated destination removed")
	}
}
