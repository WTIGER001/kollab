# 17. Automated Testing Strategy

## Overview

Kollab utilizes a dual-execution automated testing strategy to guarantee maximum coverage and parity across isolated in-memory logic and database-backed persistent logic. The suite is designed to ensure strict adherence to RBAC access controls, slug resolution rules, and structural WebSocket integrity.

---

## Backend Testing (Go)

Our backend testing relies heavily on the `testing` package with a specialized integration framework designed for rapid iterations.

### Dual-Repository Pattern
Kollab defines all persistence through interfaces (e.g., `DocumentRepository`). We implement this interface twice:
1.  **In-Memory**: Used for blazing fast unit testing, isolated logic verification, and development mock modes.
2.  **Postgres**: Our primary production driver.

### E2E Handler Testing
The `api/internal/http/handler/handler_test.go` suite executes end-to-end API HTTP calls. Rather than mocking the database, the suite leverages a generic `runIntegrationTests` orchestrator that is invoked twice:
-   `TestInMemoryAuthAndProtectedEndpoints` (invokes with in-memory repositories).
-   `TestPostgresAuthAndProtectedEndpoints` (invokes with a real PostgreSQL database).

### Testcontainers
For `TestPostgresAuthAndProtectedEndpoints`, we utilize `testcontainers-go` to dynamically spin up a completely isolated `pgvector/pgvector:pg16` Docker container on every test run. 
This guarantees that tests execute against a pristine, schema-validated database matching production constraints, ensuring we catch SQL syntax errors and pgvector similarity search issues before deployment.

### Coverage Targets
Our baseline mandate is maintaining **>60%** overall statement coverage, targeting critical areas:
-   RBAC `AccessEvaluator` boundary logic.
-   Document Service slug/ID resolution and page hierarchy moves.
-   Data Lifecycle routines (Trash mapping and Cascading Deletes).

---

## Frontend Testing (React/Vite)

### Component Testing (Vitest & RTL)
-   Isolated component testing is handled by `Vitest` and `React Testing Library (RTL)`.
-   We focus predominantly on user-interaction events (e.g., clicking macros, resolving complex drag-and-drop hierarchy actions in the sidebar).

### Mock Mode (`isMockMode`)
-   The frontend can be booted entirely disconnected from the Go backend.
-   Mock handlers emulate network delays and intercept HTTP calls to guarantee offline development velocity and simplified end-to-end component testing without spinning up testcontainers.

### Theme Engine Parity
-   Visual regression testing must validate both Light Mode and Dark Mode variables across custom Theme Presets (e.g., Neobrutal, Editorial). 
-   Hardcoded hex colors are explicitly flagged as failures during PR reviews.
