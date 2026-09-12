package transfer

import "context"

// Publish writes only fresh, generated file paths after SQL validation but before
// commit. Files are retained on an ambiguous commit error to avoid data loss.
type Repository interface {
	ExportScope(context.Context, string, string) (*Archive, error)
	ImportScope(context.Context, *Archive, Options, func(map[string][]byte) error) (*Result, error)
}
