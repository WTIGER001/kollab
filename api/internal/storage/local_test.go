package storage

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestLocalStorage(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "kollab-storage-test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	storage, err := NewLocalStorage(tmpDir)
	if err != nil {
		t.Fatalf("failed to create storage: %v", err)
	}

	ctx := context.Background()
	key := "testfolder/testfile.txt"
	data := []byte("hello world")

	// 1. Save
	if err := storage.Save(ctx, key, data); err != nil {
		t.Fatalf("expected no err on save, got %v", err)
	}

	// 2. Get
	fetched, err := storage.Get(ctx, key)
	if err != nil {
		t.Fatalf("expected no err on get, got %v", err)
	}
	if string(fetched) != string(data) {
		t.Errorf("expected %s, got %s", string(data), string(fetched))
	}

	// 3. Delete
	if err := storage.Delete(ctx, key); err != nil {
		t.Fatalf("expected no err on delete, got %v", err)
	}

	// 4. Get after delete
	_, err = storage.Get(ctx, key)
	if err == nil {
		t.Errorf("expected error getting deleted file")
	}

	// 5. DeleteFolder
	folderKey := "testfolder"
	if err := storage.Save(ctx, filepath.Join(folderKey, "file2.txt"), data); err != nil {
		t.Fatalf("expected no err on save, got %v", err)
	}
	if err := storage.DeleteFolder(ctx, folderKey); err != nil {
		t.Fatalf("expected no err on delete folder, got %v", err)
	}
}

func TestLocalStorageRejectsTraversal(t *testing.T) {
	s, err := NewLocalStorage(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"../outside", "/tmp/outside", "", "."} {
		if err := s.Save(context.Background(), key, []byte("bad")); err == nil {
			t.Fatalf("accepted unsafe key %q", key)
		}
		if err := s.DeleteFolder(context.Background(), key); err == nil {
			t.Fatalf("accepted unsafe deletion %q", key)
		}
	}
}
