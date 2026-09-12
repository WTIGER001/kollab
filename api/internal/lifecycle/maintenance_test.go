package lifecycle

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"
)

func TestMaintenanceCancellationAndRecoveryFence(t *testing.T) {
	t.Chdir(t.TempDir())
	release, err := Enter(context.Background(), true)
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()
	if unlock, err := Enter(ctx, false); err == nil {
		unlock()
		t.Fatal("request bypassed maintenance")
	}
	release()
	if err = os.MkdirAll("uploads/.kollab-restore-interrupted", 0700); err != nil {
		t.Fatal(err)
	}
	if unlock, err := Enter(context.Background(), false); !errors.Is(err, ErrRecoveryRequired) {
		if unlock != nil {
			unlock()
		}
		t.Fatalf("interrupted filesystem operation not fenced: %v", err)
	}
	if err = os.Remove("uploads/.kollab-restore-interrupted"); err != nil {
		t.Fatal(err)
	}
	release, err = Enter(context.Background(), false)
	if err != nil {
		t.Fatal(err)
	}
	release()
}
