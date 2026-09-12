# User Guide: End-to-End Testing & Verification Manual

This manual provides step-by-step instructions for administrators, QA engineers, and developers to verify the supported Kollab feature set.

---

## 1. Quick Testing Overview

| Feature Area | User Interface Location | CLI / cURL Test Endpoint | Unit Test File |
| :--- | :--- | :--- | :--- |
| **OIDC API access** | Browser sign-in | Bearer access token | `api/internal/http/middleware/auth_test.go` |
| **Page access** | Page access settings | Protected document endpoints | `frontend/src/components/PageRestrictionsDialog.test.tsx` |
| **Classification banner** | Server Settings | `GET` / `PUT /api/system/settings` | `frontend/src/components/ClassificationBanner.test.tsx` |
| **Image handling** | Image Library | Image upload and rendition retrieval | `api/internal/image/service_test.go` |
| **Attachment previews** | Attachment viewer | Preview status and converted preview assets | `api/internal/attachment/attachment_test.go` |
| **Templates** | Template Gallery | Template create, filters, edits, and deletion | `api/internal/http/handler/template_test.go` |
| **AI providers** | AI-assisted editor actions | Provider request and error handling | `api/internal/ai/*_test.go` |
| **Local accounts** | Server Settings → Local Users | Account setup, password, and active-state rules | `api/internal/user/*_test.go` |
| **Shared pages** | Page access settings | Link token, password, expiry, and role checks | `api/internal/permissions/share_link_test.go` |

---

## 2. Testing OIDC API Access

1. Sign in through the configured OIDC provider.
2. Confirm that the browser receives a delegated access token for `OIDC_API_SCOPE`.
3. Call a protected Kollab endpoint with that bearer token. It must succeed only when its issuer, API audience, expiry, signature, and API scope match the deployment configuration. Automated tests also validate JWKS key retrieval and key caching without contacting a real identity provider.
4. Repeat with an ID token, an access token for another API, and an access token lacking the API scope. Each request must return `401`.

---

## 3. Prototype Features

Azure backup/vault and Jira remain prototypes. GitLab issue workflows and Confluence archive import are implemented; a live Confluence page-embed workflow is not exposed in the UI. See [Integrations](jira_confluence_integrations.md).

## 4. Running Automated Terminal Tests

Run these from the repository root:

```bash
(cd api && go test -coverpkg=./... -coverprofile=coverage.out ./... && go tool cover -func=coverage.out)
(cd frontend && npm test -- --run && npm run lint && npm run build)
```

Backend integration tests use disposable PostgreSQL containers and require Docker. The release gate requires more than 60% backend statement coverage. Frontend tests use Vitest and React Testing Library; `npm run build` includes the real TypeScript project check.

The latest local verification passed 113 frontend tests and the full backend suite at 63.9% coverage. Cross-replica tests cover five editors, shared presence/cursors, reconnects, and maintenance. Browser checks covered two actual API processes, editing in both directions, and light/dark themes. Existing lint warnings and large editor bundles are recorded in the [readiness report](../design/production_readiness.md).

Use [the synchronization guide](synchronization.md) to verify signed package exchange, conflict cancellation, explicit choices, and reverse propagation. Verify external providers with the services and credentials intended for the deployment.
