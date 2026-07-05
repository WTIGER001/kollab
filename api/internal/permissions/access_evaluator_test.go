package permissions

import (
	"context"
	"testing"
)

func TestAccessEvaluator(t *testing.T) {
	err := InitPermissions(context.Background(), nil)
	if err != nil {
		t.Fatalf("failed to initialize permissions: %v", err)
	}

	// When initialized without DB, it should bypass document access
	evaluator := NewAccessEvaluator(nil)
	ctx := context.Background()

	allowed, reason, err := evaluator.EvaluateDocumentAccess(ctx, "user1", "doc1", "read", "", "")
	if err != nil {
		t.Errorf("expected no error for in-memory bypass, got: %v", err)
	}
	if !allowed {
		t.Error("expected access to be allowed in in-memory bypass mode")
	}
	if reason != "In-memory test bypass allowed" {
		t.Errorf("expected bypass reason, got: %s", reason)
	}

	// Test invalid action
	allowed, _, err = evaluator.EvaluateDocumentAccess(ctx, "user1", "doc1", "invalid_action", "", "")
	if err == nil {
		t.Error("expected error for invalid action")
	}
	if allowed {
		t.Error("expected access to be denied for invalid action")
	}
}
