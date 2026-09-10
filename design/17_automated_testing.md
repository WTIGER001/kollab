# 17. Automated Testing Strategy

## Overview

Kollab verifies core behavior with fast in-memory tests, PostgreSQL-backed integration tests, and React component tests. The current release baseline covers authentication, authorization, document lifecycle, editor interactions, WebSockets, and user settings.

## Backend Testing (Go)

### Dual-repository pattern

Persistence interfaces are exercised with both in-memory repositories and PostgreSQL implementations. The HTTP integration harness in `api/internal/http/handler/handler_test.go` runs the protected endpoint suite against both modes.

### OIDC API access-token validation

`api/internal/http/middleware/auth_test.go` verifies that OIDC API requests require a valid signature, issuer, dedicated API audience, expiry, and delegated API scope. It also verifies that HMAC tokens are rejected in OIDC mode, and uses a local HTTP test server to exercise RSA/EC JWKS retrieval, cache reuse, unknown-key refresh, and invalid OIDC configuration rejection.

Run the backend suite and required coverage check from `api/`:

```bash
go test -coverpkg=./... -coverprofile=coverage.out ./... && go tool cover -func=coverage.out | grep total
```

The project target is greater than 60% total statement coverage.

## Frontend Testing (React/Vite)

Vitest and React Testing Library cover components and interaction logic without a running Go server. Mock Mode supports isolated UI verification. Run the suite from `frontend/`:

```bash
npm test -- --run
npx tsc --noEmit
```

Theme-sensitive components, including the classification banner, must be checked in light and dark presets and use injected CSS variables rather than literal colors.

## Prototype Boundary

Azure backup/vault adapters and Jira/Confluence live integrations are not part of the verified release baseline. Their current worktree implementations contain mock data or placeholder transport and must not be described as live integrations, added to deployment runbooks, or promoted to production until they have real clients, authorization boundaries, persistence, end-to-end tests, and accurate user documentation.
