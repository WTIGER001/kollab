package storage

import (
	"context"
	"os"
	"testing"
)

func TestAzureBlobStorage(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "azure-storage-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	store, err := NewAzureBlobStorage("testaccount", "testkey", "backups", tempDir)
	if err != nil {
		t.Fatalf("Failed to create Azure storage: %v", err)
	}

	ctx := context.Background()
	key := "docs/file1.txt"
	content := []byte("Hello Azure Blob Backup")

	if err := store.Save(ctx, key, content); err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	got, err := store.Get(ctx, key)
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if string(got) != string(content) {
		t.Fatalf("Expected %s, got %s", content, got)
	}

	sas := store.GenerateContainerSASURL(key)
	if sas == "" {
		t.Errorf("Expected SAS URL, got empty string")
	}

	if err := store.Delete(ctx, key); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}
}
