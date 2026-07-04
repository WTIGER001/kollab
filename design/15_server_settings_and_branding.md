# Technical Design: Server Settings & Authentication Branding

> [!NOTE]
> **Status:** 🟢 Implemented

This document outlines the architecture for managing global server settings in Kollab, specifically focusing on authentication branding, data retention policies, and third-party integrations (like Aspose).

---

## 1. Data Architecture

All global server settings are stored in the PostgreSQL database within the `system_settings` table as simple Key-Value pairs. This provides an easily extensible schema for adding new global configurations without requiring schema migrations.

### 1.1 `system_settings` Table
```sql
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 Domain Model (`SystemSettings`)
The `domain.SystemSettings` struct provides a strongly-typed Go interface to these key-value pairs:
```go
type SystemSettings struct {
	AuditRetentionPolicy     string `json:"auditRetentionPolicy"`
	AuditRetentionCustomDays int    `json:"auditRetentionCustomDays"`
	AuditLogDestination      string `json:"auditLogDestination"`
	TrashRetentionPolicy     string `json:"trashRetentionPolicy"`
	TrashRetentionCustomDays int    `json:"trashRetentionCustomDays"`
	AIRateLimit              int    `json:"aiRateLimit"`
	WelcomeTitle             string `json:"welcomeTitle"`
	WelcomeText              string `json:"welcomeText"`
	AuthLogoURL              string `json:"authLogoUrl"`
	AuthLegalDisclaimer      string `json:"authLegalDisclaimer"`
	AuthLoginButtonText      string `json:"authLoginButtonText"`
	AsposeEnabled            bool   `json:"asposeEnabled"`
	AsposeLicense            string `json:"asposeLicense"`
}
```

---

## 2. Authentication Branding Pipeline

The public login screen must render *before* a user is authenticated. Therefore, the frontend needs a way to fetch the workspace's branding information anonymously.

### 2.1 The `GET /api/auth/config` Endpoint
When the Kollab frontend boots up in an unauthenticated state, it calls `fetchOIDCConfig()` which hits `GET /api/auth/config`.

This endpoint returns:
- OIDC Configuration (Authority URL, Client ID, Redirect URIs)
- The Workspace Theme (from `ThemeEngine`)
- **Authentication Branding Properties** (Logo, Title, Text, Disclaimer, Button Text)

Because this endpoint is unprotected, the backend explicitly maps *only* the safe branding settings into the JSON response. Sensitive settings (like `AsposeLicense` or internal retention policies) are intentionally excluded.

### 2.2 Frontend Hydration
In `main.tsx`, the `fetchOIDCConfig` response is parsed and stored in a top-level React state object (`config`). This `config` object is passed down as props to the root `<App />` component, which then conditionally renders the `authLogoUrl`, `welcomeTitle`, `welcomeText`, `authLoginButtonText`, and `legalDisclaimer` on the Login View.

---

## 3. Server Settings Page (Admin Panel)

Workspace Administrators (users with the `system.admin` permission) can manage these settings via the `/_admin/settings` route.

### 3.1 `GET /api/system/settings`
The settings page fetches the complete `SystemSettings` object. This endpoint requires an active session token and the `system.admin` role.

### 3.2 `PUT /api/system/settings`
When the Admin clicks "Save Changes", the frontend sends the entire settings object to the backend.

The backend uses an `INSERT ... ON CONFLICT DO UPDATE` pattern within a single transaction to securely update all key-value pairs simultaneously. If the transaction succeeds, the frontend invalidates the React Query cache and hot-reloads the settings into the UI.
