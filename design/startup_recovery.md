# Development startup and known migration recovery

## Root cause

A development database contained the original `0015` checksum `743ba887ea3b6a7cbf1ce8f55d8f324e2cd0a1f68b7e3b2e614fa770c0ce3b4d`. The later committed file has checksum `72ff756738e65937330506c950369d09c1c41a7830df63cffa628d5d1233de5e`. The original SQL was reconstructed and its entire SHA-256 verified against the installed ledger; it is retained as `api/internal/postgres/testdata/0015_original.sql` for upgrade regression testing.

The changes affected three functions: portable permission-record keys in `replication_key`, stripping local permission row IDs in `record_replication_change`, and no-op/key-change handling in `log_db_operation`. Startup correctly rejected a changed deployed migration, but fresh-database tests did not exercise this path.

## Forward repair

`Migrate` recognizes only the exact original/current checksum pair for version `0015`, allowing that known installation to reach `0016_reconcile_sync_functions.sql`. The current `0015` file is unchanged. Unknown checksums and any further edits to it still fail. Migration `0016` replaces the functions and canonicalizes the known original ledger entry in the same transaction before its own ledger entry is committed. This keeps fresh and upgraded installations compatible with exact-checksum full-server archives. No application rows, uploads, or database volumes are removed.

The migration lock serializes startup. A failed repair rolls back its function and ledger changes and can be retried. A testcontainers regression installs the original functions/checksum over a populated fixture, upgrades twice, checks retained workspace counts and portable-key behavior, and verifies that an unknown checksum remains rejected.

## Startup UI and launcher

The query provider, `ThemeEngine`, and `CssBaseline` now wrap `Root` in `frontend/src/main.tsx`. Theme variables are therefore initialized for loading and configuration-error states before authentication providers render. `StartupScreen` uses injected variables for its card, text, loading indicator, and retry button. RTL checks cover loading information, error guidance, and retry behavior.

`dev.sh` waits for a successful `/api/auth/config` request against `KOLLAB_BACKEND_URL` or `http://localhost:8081` before launching Vite. It makes at most 60 attempts with a two-second request timeout and a one-second retry interval. Failure exits with backend-log inspection instructions rather than opening an unusable frontend. This checks actual API readiness, not merely a running Air/container process.

See [development startup instructions](../user_guide/admin_deployment_guide.md#development-startup-and-connection-errors) and [portable transfers](scoped_transfers.md).
