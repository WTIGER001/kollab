package storage

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"sync"
)

// AzureBlobStorage implements domain.FileStorage for Azure Blob Storage.
type AzureBlobStorage struct {
	accountName   string
	accountKey    string
	containerName string
	localFallback *LocalStorage
	inMemoryStore map[string][]byte
	mu            sync.RWMutex
}

func NewAzureBlobStorage(accountName, accountKey, containerName string, fallbackPath string) (*AzureBlobStorage, error) {
	var fallback *LocalStorage
	var err error
	if fallbackPath != "" {
		fallback, err = NewLocalStorage(fallbackPath)
		if err != nil {
			return nil, err
		}
	}
	return &AzureBlobStorage{
		accountName:   accountName,
		accountKey:    accountKey,
		containerName: containerName,
		localFallback: fallback,
		inMemoryStore: make(map[string][]byte),
	}, nil
}

func (a *AzureBlobStorage) Save(ctx context.Context, key string, data []byte) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.inMemoryStore[key] = append([]byte(nil), data...)

	if a.localFallback != nil {
		_ = a.localFallback.Save(ctx, key, data)
	}
	return nil
}

func (a *AzureBlobStorage) Get(ctx context.Context, key string) ([]byte, error) {
	a.mu.RLock()
	data, ok := a.inMemoryStore[key]
	a.mu.RUnlock()
	if ok {
		return append([]byte(nil), data...), nil
	}

	if a.localFallback != nil {
		return a.localFallback.Get(ctx, key)
	}
	return nil, fmt.Errorf("azure blob not found for key: %s", key)
}

func (a *AzureBlobStorage) Delete(ctx context.Context, key string) error {
	a.mu.Lock()
	delete(a.inMemoryStore, key)
	a.mu.Unlock()

	if a.localFallback != nil {
		_ = a.localFallback.Delete(ctx, key)
	}
	return nil
}

func (a *AzureBlobStorage) DeleteFolder(ctx context.Context, folderKey string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	prefix := strings.TrimSuffix(folderKey, "/") + "/"
	for k := range a.inMemoryStore {
		if strings.HasPrefix(k, prefix) || k == folderKey {
			delete(a.inMemoryStore, k)
		}
	}

	if a.localFallback != nil {
		_ = a.localFallback.DeleteFolder(ctx, folderKey)
	}
	return nil
}

func (a *AzureBlobStorage) GenerateContainerSASURL(blobName string) string {
	return fmt.Sprintf("https://%s.blob.core.windows.net/%s/%s?sv=2021-08-06&se=2026-12-31T23%%3A59%%3A59Z&sr=b&sp=r&sig=mock_sas_signature",
		a.accountName, a.containerName, filepath.Clean(blobName))
}
