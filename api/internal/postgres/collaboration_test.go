package postgres

import (
	"encoding/json"
	"github.com/google/uuid"
	"kollab/api/internal/domain"
	"testing"
	"time"
)

func TestCollaborativeStateRejectsStaleWritesAndSurvivesNewRepository(t *testing.T) {
	db, ctx := setupTestDB(t)
	var id string
	if err := db.QueryRow(ctx, "SELECT id FROM documents LIMIT 1").Scan(&id); err != nil {
		t.Fatal(err)
	}
	repo := NewCollaborationRepository(db)
	state, applied, err := repo.SaveState(ctx, id, 0, "first")
	if err != nil || !applied || state.Version != 1 {
		t.Fatalf("initial save: %+v %v %v", state, applied, err)
	}
	state, applied, err = repo.SaveState(ctx, id, 0, "stale")
	if err != nil || applied || state.Update != "first" {
		t.Fatalf("stale save overwrote state: %+v %v %v", state, applied, err)
	}
	state, applied, err = repo.SaveState(ctx, id, 1, "merged")
	if err != nil || !applied || state.Version != 2 {
		t.Fatalf("merged save: %+v %v %v", state, applied, err)
	}
	state, err = NewCollaborationRepository(db).LoadState(ctx, id)
	if err != nil || state.Update != "merged" || state.Version != 2 {
		t.Fatalf("reloaded state: %+v %v", state, err)
	}
}

func TestVersionRestoreInvalidatesPersistedCollaboration(t *testing.T) {
	db, ctx := setupTestDB(t)
	var id string
	if err := db.QueryRow(ctx, "SELECT id FROM documents LIMIT 1").Scan(&id); err != nil {
		t.Fatal(err)
	}
	repo := NewPostgresDocumentRepository(db)
	doc, err := repo.GetByID(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	collab := NewCollaborationRepository(db)
	if _, _, err = collab.SaveState(ctx, id, 0, "old-state"); err != nil {
		t.Fatal(err)
	}
	snapshot := &domain.DocumentVersion{ID: uuid.NewString(), DocumentID: id, Content: doc.Content, VersionNumber: 9999, CreatedAt: time.Now()}
	doc.Content = `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"restored"}]}]}`
	if err = repo.RestoreSnapshot(ctx, doc, snapshot); err != nil {
		t.Fatal(err)
	}
	state, err := collab.LoadState(ctx, id)
	if err != nil || state.Version != 0 || state.Update != "" {
		t.Fatalf("stale CRDT state survived: %+v %v", state, err)
	}
	loaded, err := repo.GetByID(ctx, id)
	if err != nil || loaded.Content != doc.Content {
		t.Fatal("restored content missing")
	}
	if _, err = repo.GetVersionByID(ctx, snapshot.ID); err != nil {
		t.Fatal("recovery snapshot missing", err)
	}
}

func TestCollaborativeProjectionSurvivesWithoutRESTSave(t *testing.T) {
	db, ctx := setupTestDB(t)
	var id string
	if err := db.QueryRow(ctx, "SELECT id FROM documents LIMIT 1").Scan(&id); err != nil {
		t.Fatal(err)
	}
	repo := NewPostgresDocumentRepository(db)
	doc, err := repo.GetByID(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	projection := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"durable projection regression"}]}]}`
	collab := NewCollaborationRepository(db)
	_, applied, err := collab.SaveState(ctx, id, 0, "accepted-state", projection)
	if err != nil || !applied {
		t.Fatal("snapshot failed", err)
	}
	_, applied, err = collab.SaveState(ctx, id, 0, "stale-state", `{"type":"doc","content":[]}`)
	if err != nil || applied {
		t.Fatal("stale snapshot accepted", err)
	}
	// Simulate a delayed REST save from before the accepted CRDT update.
	if err = repo.Update(ctx, doc); err != nil {
		t.Fatal(err)
	}
	loaded, err := NewPostgresDocumentRepository(db).GetByID(ctx, id)
	if err != nil || loaded.Content != projection {
		t.Fatalf("projection lost after delayed save: %+v %v", loaded, err)
	}
	results, err := repo.Search(ctx, "durable projection regression", "all", nil)
	if err != nil || len(results) != 1 || results[0].ID != id {
		t.Fatalf("search missed durable projection: %v count=%d", err, len(results))
	}
}

func TestPortalDocumentEscapesNames(t *testing.T) {
	name := "Quoted \"team\"\nwith tabs\tand slash\\"
	var content map[string]any
	if err := json.Unmarshal([]byte(portalDocumentContent(name)), &content); err != nil {
		t.Fatal(err)
	}
	text := content["content"].([]any)[0].(map[string]any)["content"].([]any)[0].(map[string]any)["text"]
	if text != name {
		t.Fatalf("portal name changed: %q", text)
	}
}
