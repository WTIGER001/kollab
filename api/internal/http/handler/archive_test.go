package handler

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"kollab/api/internal/domain"
	"mime/multipart"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

type archiveService struct {
	domain.SystemService
	fail  bool
	calls int
}

func (s *archiveService) ApplySyncOperations(_ context.Context, _ []map[string]interface{}) error {
	s.calls++
	if s.fail {
		return &domain.SyncConflictError{Conflict: domain.SyncConflict{ID: "database-conflict", Table: "documents", Key: "page"}}
	}
	return nil
}

func TestSyncArchiveRequiresReviewAndRetainsLosingFile(t *testing.T) {
	const key = "only-for-local-tests-32-byte-key-value"
	for _, decision := range []string{"keep-local", "use-incoming"} {
		t.Run(decision, func(t *testing.T) {
			t.Chdir(t.TempDir())
			t.Setenv("SYNC_SIGNING_KEY", key)
			if err := os.Mkdir("uploads", 0700); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile("uploads/file.txt", []byte("local"), 0600); err != nil {
				t.Fatal(err)
			}
			build := func(signature string) []byte {
				var buf bytes.Buffer
				zw := zip.NewWriter(&buf)
				f, _ := zw.Create("sync_operations.json")
				f.Write([]byte(`{"format":"kollab.sync.v3","operations":[]}`))
				f, _ = zw.Create("uploads/file.txt")
				f.Write([]byte("incoming"))
				if signature != "" {
					f, _ = zw.Create("signature.txt")
					f.Write([]byte(signature))
				}
				zw.Close()
				return buf.Bytes()
			}
			unsigned := build("")
			reader, err := zip.NewReader(bytes.NewReader(unsigned), int64(len(unsigned)))
			if err != nil {
				t.Fatal(err)
			}
			signature, err := archiveSignature(*reader, key, "sync_operations.json")
			if err != nil {
				t.Fatal(err)
			}
			signed := build(hex.EncodeToString(signature))
			service := &archiveService{}
			handler := NewSystemHandler(service, nil)
			request := func(choices map[string]string) *httptest.ResponseRecorder {
				var body bytes.Buffer
				mw := multipart.NewWriter(&body)
				part, _ := mw.CreateFormFile("sync", "sync.zip")
				part.Write(signed)
				raw, _ := json.Marshal(choices)
				mw.WriteField("resolutions", string(raw))
				mw.Close()
				req := httptest.NewRequest("POST", "/api/system/sync/import", &body)
				req.Header.Set("Content-Type", mw.FormDataContentType())
				res := httptest.NewRecorder()
				handler.restoreArchive(res, req, true)
				return res
			}
			first := request(nil)
			if first.Code != 409 || service.calls != 0 {
				t.Fatalf("unreviewed import: %d %s", first.Code, first.Body.String())
			}
			var response struct {
				Conflict domain.SyncConflict `json:"conflict"`
			}
			if err = json.Unmarshal(first.Body.Bytes(), &response); err != nil {
				t.Fatal(err)
			}
			// Even after file review, a database conflict must restore the original tree.
			service.fail = true
			failed := request(map[string]string{response.Conflict.ID: decision})
			if failed.Code != 409 {
				t.Fatal(failed.Body.String())
			}
			original, _ := os.ReadFile("uploads/file.txt")
			if string(original) != "local" {
				t.Fatal("database conflict failed to roll back files")
			}
			service.fail = false
			accepted := request(map[string]string{response.Conflict.ID: decision})
			if accepted.Code != 200 {
				t.Fatalf("reviewed import: %d %s", accepted.Code, accepted.Body.String())
			}
			actual, _ := os.ReadFile("uploads/file.txt")
			expected, loser := "local", "incoming"
			if decision == "use-incoming" {
				expected, loser = "incoming", "local"
			}
			if string(actual) != expected {
				t.Fatalf("wrong file selected: %s", actual)
			}
			found := false
			filepath.WalkDir("uploads/.kollab-sync-conflicts", func(path string, entry os.DirEntry, err error) error {
				if err == nil && !entry.IsDir() {
					raw, _ := os.ReadFile(path)
					if string(raw) == loser {
						found = true
					}
				}
				return err
			})
			if !found {
				t.Fatal("losing file not preserved for recovery")
			}
		})
	}
}

func (s *archiveService) RestoreBackup(_ context.Context, _ map[string]interface{}) error {
	s.calls++
	if s.fail {
		return errors.New("database failed")
	}
	return nil
}
func TestRestoreValidatesPathsAndRollsBackFiles(t *testing.T) {
	for _, tt := range []struct {
		name, path string
		fail       bool
		status     int
	}{{"success", "uploads/new.txt", false, 200}, {"rollback", "uploads/new.txt", true, 400}, {"traversal", "uploads/../../escaped.txt", false, 400}} {
		t.Run(tt.name, func(t *testing.T) {
			t.Chdir(t.TempDir())
			if err := os.Mkdir("uploads", 0700); err != nil {
				t.Fatal(err)
			}
			os.WriteFile("uploads/old.txt", []byte("keep"), 0600)
			var archive bytes.Buffer
			zw := zip.NewWriter(&archive)
			f, _ := zw.Create("database_seed.json")
			f.Write([]byte(`{"_format":"test"}`))
			f, _ = zw.Create(tt.path)
			f.Write([]byte("new"))
			zw.Close()
			var body bytes.Buffer
			mw := multipart.NewWriter(&body)
			part, _ := mw.CreateFormFile("backup", "backup.zip")
			part.Write(archive.Bytes())
			mw.Close()
			req := httptest.NewRequest("POST", "/api/system/restore", &body)
			req.Header.Set("Content-Type", mw.FormDataContentType())
			res := httptest.NewRecorder()
			service := &archiveService{fail: tt.fail}
			NewSystemHandler(service, nil).Restore(res, req)
			if res.Code != tt.status {
				t.Fatalf("status=%d body=%s", res.Code, res.Body.String())
			}
			if tt.status == 200 {
				data, err := os.ReadFile("uploads/new.txt")
				if err != nil || string(data) != "new" {
					t.Fatal("new files not installed")
				}
				if _, err := os.Stat("uploads/old.txt"); !os.IsNotExist(err) {
					t.Fatal("old files retained after full restore")
				}
			} else {
				data, err := os.ReadFile("uploads/old.txt")
				if err != nil || string(data) != "keep" {
					t.Fatal("old files lost")
				}
			}
			if _, err := os.Stat("escaped.txt"); !os.IsNotExist(err) {
				t.Fatal("archive escaped uploads")
			}
			entries, _ := os.ReadDir("uploads")
			for _, entry := range entries {
				if entry.IsDir() {
					t.Fatal("staging files left behind")
				}
			}
		})
	}
}
