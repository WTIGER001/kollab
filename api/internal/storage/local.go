package storage

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
)

type LocalStorage struct {
	basePath string
}

func NewLocalStorage(basePath string) (*LocalStorage, error) {
	if err := os.MkdirAll(basePath, 0755); err != nil {
		return nil, err
	}
	return &LocalStorage{basePath: basePath}, nil
}

func (s *LocalStorage) Save(ctx context.Context, key string, data []byte) error {
	filePath := filepath.Join(s.basePath, key)
	return os.WriteFile(filePath, data, 0644)
}

func (s *LocalStorage) Get(ctx context.Context, key string) ([]byte, error) {
	filePath := filepath.Join(s.basePath, key)
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}
	return data, nil
}

func (s *LocalStorage) Delete(ctx context.Context, key string) error {
	filePath := filepath.Join(s.basePath, key)
	if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
