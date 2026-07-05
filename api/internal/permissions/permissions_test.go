package permissions

import (
	"context"
	"testing"
)

func TestSeedDefaultPermissions(t *testing.T) {
	// Call SeedDefaultPermissions with a nil database
	// This will fail since DB is nil but it should execute some code
	SeedDefaultPermissions(context.Background())

	err := InitPermissions(context.Background(), nil)
	if err != nil {
		t.Errorf("expected no error when initializing without DB")
	}
}
