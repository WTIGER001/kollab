package handler

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	goperm "github.com/wtiger001/go-permissions"
	"golang.org/x/crypto/bcrypt"
	"kollab/api/internal/permissions"
	pg "kollab/api/internal/postgres"
	"kollab/api/internal/system"
)

// TestKollabShowcaseArchive builds the maintained example using the real schema,
// permissions bootstrap, export handler, and restore handler. It never accepts a
// DATABASE_URL: all database and file mutations target disposable test resources.
// Set KOLLAB_SHOWCASE_OUTPUT to an absolute directory to retain the verified ZIP
// and a freshly generated private demo password alongside it.
func TestKollabShowcaseArchive(t *testing.T) {
	if testing.Short() {
		t.Skip("requires disposable PostgreSQL")
	}
	sourceDir, err := filepath.Abs("../../../../examples/kollab-team")
	if err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(filepath.Join(sourceDir, "generated/content.json"))
	if err != nil {
		t.Fatal("build examples/kollab-team content first: ", err)
	}
	var input struct {
		Format string                                     `json:"format"`
		Admin  struct{ ID, Username, DisplayName string } `json:"admin"`
		Tables map[string][]map[string]any                `json:"tables"`
		Assets []struct {
			Source, StorageKey, SHA256 string
			Size                       int64
		} `json:"assets"`
	}
	if err = json.Unmarshal(raw, &input); err != nil {
		t.Fatal(err)
	}
	if input.Format != "kollab.showcase.content.v1" || len(input.Tables["documents"]) < 50 || len(input.Tables["projects"]) < 2 {
		t.Fatal("incomplete showcase source")
	}
	output := os.Getenv("KOLLAB_SHOWCASE_OUTPUT")
	if output != "" && !filepath.IsAbs(output) {
		t.Fatal("KOLLAB_SHOWCASE_OUTPUT must be absolute")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()
	container, err := tcpostgres.Run(ctx, "pgvector/pgvector:pg16", tcpostgres.WithDatabase("kollab_showcase"), tcpostgres.WithUsername("postgres"), tcpostgres.WithPassword("disposable-test-only"), testcontainers.WithWaitStrategy(wait.ForLog("database system is ready to accept connections").WithOccurrence(2)))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := container.Terminate(context.Background()); err != nil {
			t.Error(err)
		}
	})
	dsn, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatal(err)
	}
	db, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	for _, init := range []func(context.Context, *pgxpool.Pool) error{pg.Migrate, permissions.InitPermissions, pg.EnableSyncTracking} {
		if err = init(ctx, db); err != nil {
			t.Fatal(err)
		}
	}
	passwordBytes := make([]byte, 24)
	if _, err = rand.Read(passwordBytes); err != nil {
		t.Fatal(err)
	}
	password := "Kollab9-" + hex.EncodeToString(passwordBytes)
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(ctx, `INSERT INTO users(id,username,password_hash,display_name,email,is_active) VALUES($1,$2,$3,$4,'demo@example.invalid',true)`, input.Admin.ID, input.Admin.Username, string(passwordHash), input.Admin.DisplayName); err != nil {
		t.Fatal(err)
	}
	// This list is intentionally closed: source content cannot write arbitrary
	// application tables or supply credentials, integrations, or global settings.
	order := []string{"teams", "projects", "team_members", "documents", "document_versions", "document_properties", "document_reviews", "tags", "document_tags", "comments", "tasks", "attachments", "templates", "images", "library_images"}
	if len(input.Tables) != len(order) {
		t.Fatal("unexpected source table set")
	}
	for _, table := range order {
		rows, ok := input.Tables[table]
		if !ok {
			t.Fatalf("missing source table %s", table)
		}
		for _, row := range rows {
			keys := make([]string, 0, len(row))
			for key := range row {
				keys = append(keys, key)
			}
			sort.Strings(keys)
			columns := make([]string, len(keys))
			for i, key := range keys {
				columns[i] = pgx.Identifier{key}.Sanitize()
			}
			data, err := json.Marshal(row)
			if err != nil {
				t.Fatal(err)
			}
			name := pgx.Identifier{"public", table}.Sanitize()
			cols := strings.Join(columns, ",")
			// Select only authored columns so all omitted columns get current DB defaults.
			query := "INSERT INTO " + name + " (" + cols + ") SELECT " + cols + " FROM jsonb_populate_record(NULL::" + name + ",$1::jsonb)"
			if _, err = db.Exec(ctx, query, string(data)); err != nil {
				t.Fatalf("insert %s: %v", table, err)
			}
		}
	}
	if err = permissions.Service.AssignRoleToUser(ctx, input.Admin.ID, "builtin.admin", nil); err != nil {
		t.Fatal(err)
	}
	for _, row := range input.Tables["teams"] {
		if err = permissions.TeamPermissions.GrantRole(ctx, "builtin.wiki.team.owner", goperm.PrincipalUser, input.Admin.ID, row["id"].(string)); err != nil {
			t.Fatal(err)
		}
	}
	for _, row := range input.Tables["projects"] {
		if err = permissions.ProjectPermissions.GrantRole(ctx, "builtin.wiki.project.owner", goperm.PrincipalUser, input.Admin.ID, row["id"].(string)); err != nil {
			t.Fatal(err)
		}
	}
	for _, row := range input.Tables["documents"] {
		if err = permissions.DocumentPermissions.GrantRole(ctx, "builtin.wiki.document.owner", goperm.PrincipalUser, input.Admin.ID, row["id"].(string)); err != nil {
			t.Fatal(err)
		}
	}
	t.Chdir(t.TempDir())
	for _, asset := range input.Assets {
		if filepath.IsAbs(asset.Source) || !filepath.IsLocal(asset.Source) || !filepath.IsLocal(asset.StorageKey) {
			t.Fatal("unsafe asset path")
		}
		data, err := os.ReadFile(filepath.Join(sourceDir, asset.Source))
		if err != nil {
			t.Fatal(err)
		}
		sum := sha256.Sum256(data)
		if hex.EncodeToString(sum[:]) != asset.SHA256 || int64(len(data)) != asset.Size {
			t.Fatal("asset changed; rebuild content: ", asset.Source)
		}
		dest := filepath.Join("uploads", asset.StorageKey)
		if err = os.MkdirAll(filepath.Dir(dest), 0700); err != nil {
			t.Fatal(err)
		}
		if err = os.WriteFile(dest, data, 0600); err != nil {
			t.Fatal(err)
		}
	}
	repo := pg.NewPostgresSystemRepository(db)
	handler := NewSystemHandler(system.NewSystemService(repo), nil)
	before, err := repo.ExportBackup(ctx)
	if err != nil {
		t.Fatal(err)
	}
	exported := httptest.NewRecorder()
	handler.Backup(exported, httptest.NewRequest("GET", "/api/system/backup", nil).WithContext(ctx))
	if exported.Code != 200 || exported.Header().Get("Content-Type") != "application/zip" {
		t.Fatalf("export: %d %s", exported.Code, exported.Body.String())
	}
	archive := append([]byte(nil), exported.Body.Bytes()...)
	// Mutate both resources before restoring, proving replacement actually occurs.
	if _, err = db.Exec(ctx, `UPDATE documents SET title='Changed after export'`); err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile("uploads/unrelated.txt", []byte("must disappear on full restore"), 0600); err != nil {
		t.Fatal(err)
	}
	var body bytes.Buffer
	form := multipart.NewWriter(&body)
	part, err := form.CreateFormFile("backup", "kollab-handbook.zip")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = part.Write(archive); err != nil {
		t.Fatal(err)
	}
	if err = form.Close(); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest("POST", "/api/system/restore", &body).WithContext(ctx)
	req.Header.Set("Content-Type", form.FormDataContentType())
	restored := httptest.NewRecorder()
	handler.Restore(restored, req)
	if restored.Code != 200 {
		t.Fatalf("restore: %d %s", restored.Code, restored.Body.String())
	}
	after, err := repo.ExportBackup(ctx)
	if err != nil {
		t.Fatal(err)
	}
	canonical := func(value any) []string {
		data, err := json.Marshal(value)
		if err != nil {
			t.Fatal(err)
		}
		var rows []json.RawMessage
		if err = json.Unmarshal(data, &rows); err != nil {
			t.Fatal(err)
		}
		values := make([]string, 0, len(rows))
		for _, row := range rows {
			var decoded any
			json.Unmarshal(row, &decoded)
			v, _ := json.Marshal(decoded)
			values = append(values, string(v))
		}
		sort.Strings(values)
		return values
	}
	for table, rows := range before {
		if table == "_format" {
			continue
		}
		if !reflect.DeepEqual(canonical(rows), canonical(after[table])) {
			t.Errorf("round trip changed table %s", table)
		}
	}
	if _, err = os.Stat("uploads/unrelated.txt"); !os.IsNotExist(err) {
		t.Fatal("restore did not replace upload tree")
	}
	for _, asset := range input.Assets {
		data, err := os.ReadFile(filepath.Join("uploads", asset.StorageKey))
		if err != nil {
			t.Fatal(err)
		}
		sum := sha256.Sum256(data)
		if hex.EncodeToString(sum[:]) != asset.SHA256 {
			t.Fatal("restored attachment differs: ", asset.Source)
		}
	}
	var restoredHash string
	if err = db.QueryRow(ctx, `SELECT password_hash FROM users WHERE id=$1`, input.Admin.ID).Scan(&restoredHash); err != nil {
		t.Fatal(err)
	}
	if err = bcrypt.CompareHashAndPassword([]byte(restoredHash), []byte(password)); err != nil {
		t.Fatal("restored admin cannot authenticate")
	}
	allowed, err := permissions.Service.HasPermission(ctx, goperm.Request{UserID: input.Admin.ID, Perm: "system.admin"})
	if err != nil || !allowed {
		t.Fatal("restored administrator role missing", err)
	}
	if t.Failed() {
		return
	}
	if output != "" {
		if err = os.MkdirAll(output, 0700); err != nil {
			t.Fatal(err)
		}
		sum := sha256.Sum256(archive)
		files := map[string][]byte{"kollab-handbook.zip": archive, "credentials.txt": []byte(fmt.Sprintf("Disposable Kollab handbook instance\nUsername: %s\nPassword: %s\n\nFull-server restore replaces destination data and accounts.\nUse local authentication mode. Keep this file private and outside Git.\n", input.Admin.Username, password)), "SHA256SUMS": []byte(fmt.Sprintf("%x  kollab-handbook.zip\n", sum))}
		for name, data := range files {
			dest := filepath.Join(output, name)
			if err = os.WriteFile(dest, data, 0600); err != nil {
				t.Fatal(err)
			}
			if err = os.Chmod(dest, 0600); err != nil {
				t.Fatal(err)
			}
		}
		t.Logf("Verified archive: %s (%d pages, %d projects, %d uploaded files)", filepath.Join(output, "kollab-handbook.zip"), len(input.Tables["documents"]), len(input.Tables["projects"]), len(input.Assets))
	}
}
