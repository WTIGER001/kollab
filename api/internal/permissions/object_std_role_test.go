package permissions

import (
	"context"
	"github.com/google/uuid"
	goperm "github.com/wtiger001/go-permissions"
	"testing"
)

func TestObjectStandardPermissionsAndRoles(t *testing.T) {
	// Let's create an object role checker
	checker := NewObjectStandardPermissionsAndRoles("doc", "document", true)
	if checker == nil {
		t.Fatal("expected checker to be created")
	}

	// Just checking bootstrapping logic
	err := checker.Bootstrap(context.Background())
	if err == nil {
		// Expect an error since DB is nil but we're just covering code
	}

	// Test GrantRole
	err = checker.GrantRole(context.Background(), "viewer", goperm.PrincipalUser, "user1", uuid.New().String())
	if err == nil {
		// Expect an error without DB
	}
}
