package system

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"time"

	"arkollab/api/internal/domain"
)

type SystemService struct {
	repo domain.SystemRepository
}

func NewSystemService(repo domain.SystemRepository) *SystemService {
	return &SystemService{repo: repo}
}

func (s *SystemService) GetSettings(ctx context.Context) (*domain.SystemSettings, error) {
	return s.repo.GetSettings(ctx)
}

func (s *SystemService) UpdateSettings(ctx context.Context, settings *domain.SystemSettings) error {
	// First update the settings
	err := s.repo.UpdateSettings(ctx, settings)
	if err != nil {
		return err
	}

	// Trigger immediate maintenance: ensure partitions, prune partitions, prune trash
	// This helps apply the retention change immediately for a responsive experience.
	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if err := s.EnsurePartitions(bgCtx); err != nil {
			log.Printf("Background EnsurePartitions failed: %v", err)
		}
		if err := s.PrunePartitions(bgCtx); err != nil {
			log.Printf("Background PrunePartitions failed: %v", err)
		}
		if err := s.PruneTrash(bgCtx); err != nil {
			log.Printf("Background PruneTrash failed: %v", err)
		}
	}()

	return nil
}

func (s *SystemService) RecordAuditLog(ctx context.Context, documentID string, userID string, action string) error {
	auditLog := &domain.AuditLog{
		ID:         newUUID(),
		DocumentID: documentID,
		UserID:     userID,
		Action:     action,
		CreatedAt:  time.Now(),
	}
	return s.repo.RecordAuditLog(ctx, auditLog)
}

func (s *SystemService) GetAuditLogsForPage(ctx context.Context, docID string) ([]*domain.AuditLog, error) {
	return s.repo.GetAuditLogsForPage(ctx, docID)
}

func (s *SystemService) EnsurePartitions(ctx context.Context) error {
	return s.repo.EnsurePartitions(ctx)
}

func (s *SystemService) PrunePartitions(ctx context.Context) error {
	return s.repo.PrunePartitions(ctx)
}

func (s *SystemService) PruneTrash(ctx context.Context) error {
	return s.repo.PruneTrash(ctx)
}

func (s *SystemService) StartCleanupWorker(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				log.Println("Stopping System Cleanup Worker...")
				return
			case <-ticker.C:
				log.Println("Running System Settings maintenance worker...")
				workerCtx, cancel := context.WithTimeout(context.Background(), 1*time.Minute)
				
				if err := s.repo.EnsurePartitions(workerCtx); err != nil {
					log.Printf("Worker EnsurePartitions failed: %v", err)
				}
				if err := s.repo.PrunePartitions(workerCtx); err != nil {
					log.Printf("Worker PrunePartitions failed: %v", err)
				}
				if err := s.repo.PruneTrash(workerCtx); err != nil {
					log.Printf("Worker PruneTrash failed: %v", err)
				}
				
				cancel()
			}
		}
	}()
	log.Printf("System settings cleanup worker started with interval: %v", interval)
}

func newUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}
