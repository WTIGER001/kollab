package postgres

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"arkollab/api/internal/domain"
)

type PostgresSystemRepository struct {
	db *pgxpool.Pool
}

func NewPostgresSystemRepository(db *pgxpool.Pool) *PostgresSystemRepository {
	return &PostgresSystemRepository{db: db}
}

func (r *PostgresSystemRepository) GetSettings(ctx context.Context) (*domain.SystemSettings, error) {
	rows, err := r.db.Query(ctx, "SELECT key, value FROM system_settings")
	if err != nil {
		return nil, fmt.Errorf("failed to query system_settings: %w", err)
	}
	defer rows.Close()

	settings := &domain.SystemSettings{
		AuditRetentionPolicy:     "forever",
		AuditRetentionCustomDays: 30,
		AuditLogDestination:      "postgres",
		TrashRetentionPolicy:     "forever",
		TrashRetentionCustomDays: 30,
		AIRateLimit:              10,
		WelcomeTitle:             "Welcome to Arkollab",
		WelcomeText:              "A premium block-based document workspace. Connect with Logto Single-Sign-On (SSO) to synchronize your team workspaces.",
		AsposeEnabled:            true,
	}

	for rows.Next() {
		var key, val string
		if err := rows.Scan(&key, &val); err != nil {
			return nil, fmt.Errorf("failed to scan system_setting row: %w", err)
		}
		switch key {
		case "audit_retention_policy":
			settings.AuditRetentionPolicy = val
		case "audit_retention_custom_days":
			if days, err := strconv.Atoi(val); err == nil {
				settings.AuditRetentionCustomDays = days
			}
		case "audit_log_destination":
			settings.AuditLogDestination = val
		case "trash_retention_policy":
			settings.TrashRetentionPolicy = val
		case "trash_retention_custom_days":
			if days, err := strconv.Atoi(val); err == nil {
				settings.TrashRetentionCustomDays = days
			}
		case "ai_rate_limit":
			if limit, err := strconv.Atoi(val); err == nil {
				settings.AIRateLimit = limit
			}
		case "welcome_title":
			settings.WelcomeTitle = val
		case "welcome_text":
			settings.WelcomeText = val
		case "aspose_enabled":
			settings.AsposeEnabled = val == "true"
		case "aspose_license":
			settings.AsposeLicense = val
		}
	}

	return settings, nil
}

func (r *PostgresSystemRepository) UpdateSettings(ctx context.Context, settings *domain.SystemSettings) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	queries := []struct {
		key, val string
	}{
		{"audit_retention_policy", settings.AuditRetentionPolicy},
		{"audit_retention_custom_days", strconv.Itoa(settings.AuditRetentionCustomDays)},
		{"audit_log_destination", settings.AuditLogDestination},
		{"trash_retention_policy", settings.TrashRetentionPolicy},
		{"trash_retention_custom_days", strconv.Itoa(settings.TrashRetentionCustomDays)},
		{"ai_rate_limit", strconv.Itoa(settings.AIRateLimit)},
		{"welcome_title", settings.WelcomeTitle},
		{"welcome_text", settings.WelcomeText},
		{"aspose_enabled", strconv.FormatBool(settings.AsposeEnabled)},
		{"aspose_license", settings.AsposeLicense},
	}

	for _, q := range queries {
		_, err := tx.Exec(ctx,
			"INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
			q.key, q.val,
		)
		if err != nil {
			return fmt.Errorf("failed to update system setting %s: %w", q.key, err)
		}
	}

	return tx.Commit(ctx)
}

func (r *PostgresSystemRepository) RecordAuditLog(ctx context.Context, l *domain.AuditLog) error {
	_, err := r.db.Exec(ctx,
		"INSERT INTO document_audit_logs (id, document_id, user_id, action, created_at) VALUES ($1, $2, $3, $4, $5)",
		l.ID, l.DocumentID, l.UserID, l.Action, l.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert audit log: %w", err)
	}
	return nil
}

func (r *PostgresSystemRepository) EnsurePartitions(ctx context.Context) error {
	now := time.Now().UTC()
	months := []time.Time{
		now,
		now.AddDate(0, 1, 0),
	}

	for _, m := range months {
		year := m.Year()
		month := m.Month()
		partitionName := fmt.Sprintf("document_audit_logs_y%04dm%02d", year, month)

		startBound := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
		endBound := time.Date(year, month+1, 1, 0, 0, 0, 0, time.UTC)

		// Strict validation of partitionName format to prevent SQL injection
		if match, _ := regexp.MatchString(`^document_audit_logs_y\d{4}m\d{2}$`, partitionName); !match {
			return fmt.Errorf("invalid partition table name: %s", partitionName)
		}

		query := fmt.Sprintf(
			"CREATE TABLE IF NOT EXISTS %s PARTITION OF document_audit_logs FOR VALUES FROM ('%s') TO ('%s')",
			partitionName,
			startBound.Format("2006-01-02 15:04:05"),
			endBound.Format("2006-01-02 15:04:05"),
		)

		if _, err := r.db.Exec(ctx, query); err != nil {
			return fmt.Errorf("failed to create partition %s: %w", partitionName, err)
		}
		log.Printf("Verified partition exists: %s", partitionName)
	}

	return nil
}

func (r *PostgresSystemRepository) PrunePartitions(ctx context.Context) error {
	settings, err := r.GetSettings(ctx)
	if err != nil {
		return err
	}

	policy := settings.AuditRetentionPolicy
	if policy == "forever" || policy == "Forever" {
		return nil
	}

	cutoff := time.Now().UTC()
	switch policy {
	case "5yr", "5y", "5 year", "5 years":
		cutoff = cutoff.AddDate(-5, 0, 0)
	case "3yr", "3y", "3 year", "3 years":
		cutoff = cutoff.AddDate(-3, 0, 0)
	case "1yr", "1y", "1 year", "1 years":
		cutoff = cutoff.AddDate(-1, 0, 0)
	case "90d", "90 days", "90days":
		cutoff = cutoff.AddDate(0, 0, -90)
	case "60d", "60 days", "60days":
		cutoff = cutoff.AddDate(0, 0, -60)
	case "30d", "30 days", "30days":
		cutoff = cutoff.AddDate(0, 0, -30)
	case "custom":
		cutoff = cutoff.AddDate(0, 0, -settings.AuditRetentionCustomDays)
	default:
		log.Printf("Unknown retention policy %q, skipping partition pruning", policy)
		return nil
	}

	log.Printf("Pruning document_audit_logs partitions older than cutoff: %s", cutoff.Format(time.RFC3339))

	query := `
		SELECT
			c.relname AS partition_name
		FROM pg_inherits i
		JOIN pg_class c ON c.oid = i.inhrelid
		JOIN pg_class p ON p.oid = i.inhparent
		WHERE p.relname = 'document_audit_logs'
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to query partitions: %w", err)
	}
	defer rows.Close()

	re := regexp.MustCompile(`^document_audit_logs_y(\d{4})m(\d{2})$`)
	var partitionsToDrop []string

	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return fmt.Errorf("failed to scan partition name: %w", err)
		}

		matches := re.FindStringSubmatch(name)
		if len(matches) != 3 {
			continue // skip default partition or unrecognized names
		}

		year, _ := strconv.Atoi(matches[1])
		month, _ := strconv.Atoi(matches[2])

		// upper bound of partition is the start of the next month
		upperBound := time.Date(year, time.Month(month)+1, 1, 0, 0, 0, 0, time.UTC)
		if upperBound.Before(cutoff) {
			partitionsToDrop = append(partitionsToDrop, name)
		}
	}

	for _, name := range partitionsToDrop {
		// Re-validate strictly to make 100% sure we don't allow SQL injection in DROP TABLE
		if !re.MatchString(name) {
			continue
		}

		dropQuery := fmt.Sprintf("DROP TABLE %s", name)
		if _, err := r.db.Exec(ctx, dropQuery); err != nil {
			log.Printf("Failed to drop partition %s: %v", name, err)
		} else {
			log.Printf("Successfully dropped old partition: %s", name)
		}
	}

	return nil
}

func (r *PostgresSystemRepository) GetAuditLogsForPage(ctx context.Context, docID string) ([]*domain.AuditLog, error) {
	query := `
		SELECT a.id, a.document_id, COALESCE(a.user_id, '') as user_id, a.action, a.created_at,
		       COALESCE(u.display_name, u.username, 'Unknown User') as user_display_name,
		       COALESCE(u.email, '') as user_email
		FROM document_audit_logs a
		LEFT JOIN users u ON a.user_id = u.id
		WHERE a.document_id = $1
		ORDER BY a.created_at DESC
	`
	rows, err := r.db.Query(ctx, query, docID)
	if err != nil {
		return nil, fmt.Errorf("failed to query page audit logs: %w", err)
	}
	defer rows.Close()

	var logs []*domain.AuditLog
	for rows.Next() {
		var l domain.AuditLog
		err := rows.Scan(&l.ID, &l.DocumentID, &l.UserID, &l.Action, &l.CreatedAt, &l.UserDisplayName, &l.UserEmail)
		if err != nil {
			return nil, fmt.Errorf("failed to scan page audit log: %w", err)
		}
		logs = append(logs, &l)
	}
	return logs, nil
}

func (r *PostgresSystemRepository) PruneTrash(ctx context.Context) error {
	settings, err := r.GetSettings(ctx)
	if err != nil {
		return err
	}

	policy := settings.TrashRetentionPolicy
	if policy == "forever" || policy == "" {
		return nil
	}

	cutoff := time.Now().UTC()
	switch policy {
	case "30d", "30 days", "30":
		cutoff = cutoff.AddDate(0, 0, -30)
	case "14d", "14 days", "14":
		cutoff = cutoff.AddDate(0, 0, -14)
	case "7d", "7 days", "7":
		cutoff = cutoff.AddDate(0, 0, -7)
	case "custom":
		cutoff = cutoff.AddDate(0, 0, -settings.TrashRetentionCustomDays)
	default:
		log.Printf("Unknown trash retention policy %q, skipping trash pruning", policy)
		return nil
	}

	log.Printf("Pruning soft-deleted documents older than cutoff: %s", cutoff.Format(time.RFC3339))

	_, err = r.db.Exec(ctx, `
		WITH RECURSIVE descendants AS (
			SELECT id FROM documents WHERE deleted_at IS NOT NULL AND deleted_at < $1
			UNION ALL
			SELECT d.id FROM documents d JOIN descendants des ON d.parent_id = des.id
		)
		DELETE FROM documents WHERE id IN (SELECT id FROM descendants)
	`, cutoff)
	if err != nil {
		return fmt.Errorf("failed to prune trash documents: %w", err)
	}

	return nil
}

func (r *PostgresSystemRepository) Ping(ctx context.Context) error {
	return r.db.Ping(ctx)
}

