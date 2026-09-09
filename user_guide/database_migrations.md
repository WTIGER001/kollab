# Database Migrations

Kollab updates its database automatically when the server starts. Each update is recorded once, so restarting the server does not repeat completed changes.

Before updating Kollab in a production workspace:

1. Take a verified database backup.
2. Review the release notes for any migration requirements.
3. Deploy the application and allow the server to start normally.
4. Confirm the server health check succeeds and verify a few workspace pages.

Do not edit previously deployed migration files. If a database change is needed, create a new migration as part of the application release. Contact an administrator if startup reports a migration checksum mismatch; it means a historical migration no longer matches the version recorded by the database.
