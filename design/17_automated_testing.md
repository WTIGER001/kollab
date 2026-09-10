# 17. Automated Testing Strategy

## Overview

Kollab verifies core behavior with fast in-memory tests, PostgreSQL-backed integration tests, and React component tests. The current release baseline covers authentication, authorization, document lifecycle, editor interactions, WebSockets, and user settings.

## Backend Testing (Go)

### Dual-repository pattern

Persistence interfaces are exercised with both in-memory repositories and PostgreSQL implementations. The HTTP integration harness in `api/internal/http/handler/handler_test.go` runs the protected endpoint suite against both modes.

### OIDC API access-token validation

`api/internal/http/middleware/auth_test.go` verifies that OIDC API requests require a valid signature, issuer, dedicated API audience, expiry, and delegated API scope. It also verifies that HMAC tokens are rejected in OIDC mode, and uses a local HTTP test server to exercise RSA/EC JWKS retrieval, cache reuse, unknown-key refresh, and invalid OIDC configuration rejection.

### Media resilience

`api/internal/image/service_test.go` verifies image dimensions and rendition generation for decodable uploads, safe persistence failure handling, fallback from a missing rendition to the original image, and deletion of all generated rendition keys.

`api/internal/attachment/attachment_test.go` verifies PDF preview initialization, metadata rollback after a failed attachment save, completed/failed/in-progress preview states, preview asset MIME resolution, and safe office-preview retry queueing. `api/internal/attachment/office_converter_test.go` uses a local HTTP server to verify converter request payloads, configuration exchange, and non-success response handling.

### Handler contracts

Handler tests use in-memory repositories and signed local test tokens to exercise HTTP request validation and response contracts without a running server. `api/internal/http/handler/template_test.go` covers authenticated personal-template ownership, contextual listing filters, update/delete persistence, and not-found handling.

### External AI clients

AI client tests route OpenAI- and Ollama-shaped requests to local HTTP test servers. They validate generated text and embedding response decoding, request settings such as OpenAI embedding dimensions and non-streaming Ollama requests, and failure propagation for non-success provider responses. The test suite never requires configured provider credentials or a running Ollama instance.

### Local identity lifecycle

`api/internal/user/*_test.go` verifies password requirements, initial-admin single-use setup, local-account creation and normalization, password replacement, activation state enforcement, duplicate account protection, and safe in-memory repository copies.

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
