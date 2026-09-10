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

---

## 2. Testing OIDC API Access

1. Sign in through the configured OIDC provider.
2. Confirm that the browser receives a delegated access token for `OIDC_API_SCOPE`.
3. Call a protected Kollab endpoint with that bearer token. It must succeed only when its issuer, API audience, expiry, signature, and API scope match the deployment configuration. Automated tests also validate JWKS key retrieval and key caching without contacting a real identity provider.
4. Repeat with an ID token, an access token for another API, and an access token lacking the API scope. Each request must return `401`.

---

## 3. Prototype Features

Azure backup/vault and Jira/Confluence live integration work is not ready for operator testing or production use. Do not rely on their current pages, example output, or placeholder endpoints.

## 4. Running Automated Terminal Tests

```bash
# Run backend Go unit tests
cd api
go test ./...

# Run frontend React component tests
cd frontend
npm test
```
