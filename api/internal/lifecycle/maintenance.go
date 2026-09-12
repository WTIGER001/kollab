// Package lifecycle coordinates maintenance within and between API processes.
package lifecycle

import (
	"context"
	"errors"
	"golang.org/x/sync/semaphore"
	"os"
	"strings"
)

const readerCapacity int64 = 1 << 20

var maintenance = semaphore.NewWeighted(readerCapacity)
var ErrRecoveryRequired = errors.New("An interrupted archive operation requires administrator recovery before this workspace can be used")

func CheckRecovery() error {
	entries, err := os.ReadDir("uploads")
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), ".kollab-restore-") {
			return ErrRecoveryRequired
		}
	}
	return nil
}

// Configure once at startup, before serving requests or starting workers.
var Coordinator interface {
	Acquire(context.Context, bool) (func(), error)
}

func Enter(ctx context.Context, exclusive bool) (func(), error) {
	weight := int64(1)
	if exclusive {
		weight = readerCapacity
	}
	if err := maintenance.Acquire(ctx, weight); err != nil {
		return nil, err
	}
	localRelease := func() { maintenance.Release(weight) }
	if Coordinator == nil {
		if err := CheckRecovery(); err != nil {
			localRelease()
			return nil, err
		}
		return localRelease, nil
	}
	release, err := Coordinator.Acquire(ctx, exclusive)
	if err != nil {
		localRelease()
		return nil, err
	}
	if err := CheckRecovery(); err != nil {
		release()
		localRelease()
		return nil, err
	}
	return func() { release(); localRelease() }, nil
}
