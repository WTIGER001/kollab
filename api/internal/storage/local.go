package storage

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"os"
	"path/filepath"
)

type LocalStorage struct{ basePath string }

func NewLocalStorage(basePath string) (*LocalStorage, error) {
	if err := os.MkdirAll(basePath, 0755); err != nil {
		return nil, err
	}
	return &LocalStorage{basePath: basePath}, nil
}
func (s *LocalStorage) root(ctx context.Context, key string) (*os.Root, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	if key == "" || key == "." || !filepath.IsLocal(key) {
		return nil, fmt.Errorf("invalid storage key")
	}
	return os.OpenRoot(s.basePath)
}
func (s *LocalStorage) Save(ctx context.Context, key string, data []byte) error {
	root, err := s.root(ctx, key)
	if err != nil {
		return err
	}
	defer root.Close()
	if err = root.MkdirAll(filepath.Dir(key), 0755); err != nil {
		return err
	}
	temp := filepath.Join(filepath.Dir(key), ".upload-"+uuid.NewString())
	defer root.Remove(temp)
	file, err := root.OpenFile(temp, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
	if err != nil {
		return err
	}
	_, writeErr := file.Write(data)
	syncErr := file.Sync()
	closeErr := file.Close()
	if writeErr != nil {
		return writeErr
	}
	if syncErr != nil {
		return syncErr
	}
	if closeErr != nil {
		return closeErr
	}
	if err = ctx.Err(); err != nil {
		return err
	}
	return root.Rename(temp, key)
}
func (s *LocalStorage) Get(ctx context.Context, key string) ([]byte, error) {
	root, err := s.root(ctx, key)
	if err != nil {
		return nil, err
	}
	defer root.Close()
	return root.ReadFile(key)
}
func (s *LocalStorage) Delete(ctx context.Context, key string) error {
	root, err := s.root(ctx, key)
	if err != nil {
		return err
	}
	defer root.Close()
	if err = root.Remove(key); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
func (s *LocalStorage) DeleteFolder(ctx context.Context, key string) error {
	root, err := s.root(ctx, key)
	if err != nil {
		return err
	}
	defer root.Close()
	return root.RemoveAll(key)
}
