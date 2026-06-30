# Design Specification: Permissions & Access Control Model

This document describes the technical architecture and specifications for Kollab's permissions and access control model. The model combines Role-Based Access Control (RBAC) for teams/projects, Attribute-Based Access Control (ABAC) for data classifications, Confluence-style hierarchical inheritance, and OneDrive/SharePoint-style sharing semantics. 

Authorization is driven by the `github.com/wtiger001/go-permissions` library as the core evaluation engine, following the standardized object-scoped role template design pattern.

---

## 🏗️ 1. System Architecture & `go-permissions` Integration

Kollab integrates `go-permissions` at the API Gateway and Service layers to validate all REST and WebSocket operations.

```
                  ┌───────────────────────────────────────────┐
                  │          OIDC Provider (e.g. Logto)       │
                  │  - Authenticates users & issues JWTs      │
                  │  - Provides 'groups' & 'roles' claims     │
                  └─────────────────────┬─────────────────────┘
                                        │
                               Login / Sync Event
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Kollab Go API Gateway                            │
│                                                                             │
│  ┌───────────────────────┐  Syncs  ┌─────────────────────────────────────┐  │
│  │ KollabIdentityProvider ├───────>│ Local DB Replica (users, teams)     │  │
│  │ - Resolves user groups│        │ - Cached for offline & search use   │  │
│  └──────────┬────────────┘        └─────────────────────────────────────┘  │
│             │                                                               │
│             │ Identity                                                      │
│             ▼                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ go-permissions Authorization Service                                  │  │
│  │                                                                       │  │
│  │  - Evaluation Engine (Deny-Overrides-Allow with Dynamic Bindings)      │  │
│  │  - Cached Storage Layer (Postgres + MemCache TTL)                     │  │
│  │  - Permission Registry (Validates action tokens)                      │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────┐           ┌───────────────────────────┐  │  │
│  │  │   Template RBAC Engine  │           │     ABAC Rules Engine     │  │  │
│  │  │ (?id Scopes & Bindings) │           │ (Clearance vs Tag Checks) │  │  │
│  │  └─────────────────────────┘           └───────────────────────────┘  │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      ▼
                      [Allow / Deny Audit Decision]
```

### Core Go Components

1. **`KollabIdentityProvider`**: Implements the `permissions.IdentityProvider` interface. It resolves user identities and group memberships (reading from the `team_members` table) so that permissions can be validated during offline operations (like search indexing, email alerts, or background PDF exports).
2. **`PermissionStore`**: PostgreSQL-backed implementation of the `permissions.PermissionStore` interface (using pgx connection pool). It handles role definition lookups, assignments, and template scope validations.
3. **`ObjectStandardPermissionsAndRoles`**: Utility that automatically registers six standard permissions matching the naming convention `<feature>.<resource>.<action>` (`read`, `comment`, `write`, `delete`, `grant`, `owner`) and standardizes five object-scoped roles (`Viewer`, `Commenter`, `Editor`, `Manager`, `Owner`) bound dynamically to the object ID variable (`?id`).

---

## 👥 2. Identity, Groups, and Roles Model

Kollab permissions are structured around first-class concepts of **Users**, **Groups (Teams)**, and **Roles** (both system-wide and resource-scoped).

### 2.1 Users & Identity Provider (IDP) Synchronization
- When a user logs in via OIDC or SAML (e.g. Logto), the JWT access token is parsed and user details are verified.
- The user's security clearance attributes are extracted and dynamically populated into the `user_security_attributes` table to serve as facts for the ABAC validation.

### 2.2 Groups (Teams)
- Groups represent functional business units or organizational groupings (e.g. `engineering`, `marketing`).
- In Kollab, groups are represented by the `teams` database model.
- **Membership**: Group memberships are synchronized upon user login based on OIDC/SAML `groups` claims. Membership mappings are persisted locally in the `team_members` table.
- **Grants**: Standard roles can be assigned directly to a group for a specific object (e.g., assigning `Viewer` role on Project `P` to the `engineering` team group).
- **Resolution**: During authorization checks, the custom `KollabIdentityProvider` resolves all groups the active user belongs to, enabling `go-permissions` to evaluate group-level rules.

### 2.3 Object-Scoped Roles & Template Bindings
Kollab utilizes standard templates to define permissions globally, while assigning permissions to specific objects via binding values (such as `id = "doc-1234"`).

#### A. Standard Object Permissions
For any feature resource (e.g., `document`, `project`, `team`), the system registers standard permissions named `<feature>.<resource>.<action>`:
* **`read`**: View the resource.
* **`comment`**: Add annotations/comments.
* **`write`**: Update/edit the resource.
* **`delete`**: Delete the resource.
* **`grant`**: Share the resource or manage its permissions.
* **`owner`**: Full administrative ownership.

#### B. Standard Object Roles & Expansion Hierarchy
The system configures five hierarchical roles containing standard permissions:
1. **`Viewer`**: Has `<prefix>.read` permission.
2. **`Commenter`**: Has `read` and `comment` permissions.
3. **`Editor`**: Has `read`, `comment`, and `write` permissions.
4. **`Manager`**: Has `read`, `comment`, `write`, `delete`, and `grant` permissions.
5. **`Owner`**: Has all 6 permissions.

These roles define their scope using the placeholder variable `?id` (e.g., `ObjectScope = "?id"`). When a user is assigned to a role on a specific document, the assignment carries a binding value (e.g., `id = "doc-1234"`), which is resolved during authorization checks.

---

## 💾 3. Relational Database Schema

The database schema utilizes `go-permissions`' native schema (automatically created via `Store.EnsureSchema()`) to manage roles, closures, and assignments, plus Kollab-specific metadata extensions.

```sql
-- Security classifications for ABAC
CREATE TYPE classification_level AS ENUM ('public', 'internal', 'confidential', 'pii');

-- Extend documents table to track classification and inheritance status
ALTER TABLE documents ADD COLUMN IF NOT EXISTS classification classification_level NOT NULL DEFAULT 'internal';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS inheritance_broken BOOLEAN NOT NULL DEFAULT FALSE;

-- Document sharing links (OneDrive / SharePoint semantics)
CREATE TABLE IF NOT EXISTS sharing_links (
    token_hash VARCHAR(64) PRIMARY KEY, -- SHA-256 hash of the cryptographic sharing token
    document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    role_id VARCHAR(50) NOT NULL, -- references roles(id) in go-permissions roles table
    scope VARCHAR(50) NOT NULL, -- 'anyone', 'organization'
    password_hash VARCHAR(255) NULL, -- optional bcrypt hash for password protection
    created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sharing_links_doc ON sharing_links(document_id);

-- User security attributes for ABAC evaluation
CREATE TABLE IF NOT EXISTS user_security_attributes (
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attribute_key VARCHAR(100) NOT NULL, -- e.g. 'clearance_level', 'department'
    attribute_value VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id, attribute_key)
);
```

---

## 🌳 4. Hierarchical Inheritance & Evaluation Algorithms

Kollab employs Confluence-style view restriction inheritance. If any ancestor of a document is restricted, a user must have view clearance on that ancestor to view any descendants.

### The Access Check Algorithm

When a user `U` attempts to perform an action `A` (e.g. `read` or `write` on document `D`):

1. **System Override Check**: Check if user `U` has the global admin role `builtin.admin`. If true, grant access immediately.
2. **ABAC Classification Check**: Extract the classification tag of `D`. Enforce that user `U` has the corresponding security attributes (clearance level + MFA if `pii` classification). If not satisfied, **deny access immediately**.
3. **Retrieve Ancestry Path**: Query the PostgreSQL DB for the target document `D` and all its ancestor IDs (ordered from root to parent) using a recursive CTE.
4. **Ancestry View Validation (Confluence-style inheritance)**:
   - For each ancestor `A_i` of `D` (ordered from root to parent):
     - Check if `A_i` has direct view restrictions (i.e., there is at least one role assignment in the `principal_roles` table targeting object ID `A_i`).
     - If `A_i` is restricted:
       - Verify if `U` is explicitly permitted on `A_i` (via `Service.HasPermission(ctx, Request{UserID: U, Object: A_i, Perm: "wiki.document.read"})`). If not, **deny access immediately**.
5. **Action Validation**:
   - Check if the target document `D` has explicit restrictions for the requested action `A` (i.e. has explicit role assignments in the store).
   - If **yes**: Evaluate if `U` is permitted on `D` (via `Service.HasPermission(ctx, Request{UserID: U, Object: D, Perm: ActionPerm})`).
   - If **no**:
     - Check if inheritance is broken (`D.inheritance_broken = TRUE`). If so, default deny since no explicit roles are assigned to `D`.
     - Otherwise, traverse up to find the first ancestor `A_i` that has explicit role assignments and verify permissions on that ancestor.
     - If no ancestor in the chain has explicit restrictions, fall back to checking permissions on the containing **Project** (via `Service.HasPermission(ctx, Request{UserID: U, Object: ProjectID, Perm: ProjectPerm})`).
     - If no project role, fall back to checking permissions on the containing **Team** (via `Service.HasPermission(ctx, Request{UserID: U, Object: TeamID, Perm: TeamPerm})`).
     - If no team role, **deny access** (default deny).

### Recursive SQL Query for Ancestry Path & Active Restrictions
```sql
WITH RECURSIVE doc_ancestry AS (
    -- Anchor member
    SELECT id, parent_id, project_id, team_id, classification, inheritance_broken, 1 as depth
    FROM documents
    WHERE id = :document_id
    
    UNION ALL
    
    -- Recursive member
    SELECT d.id, d.parent_id, d.project_id, d.team_id, d.classification, d.inheritance_broken, da.depth + 1
    FROM documents d
    INNER JOIN doc_ancestry da ON d.id = da.parent_id
    WHERE NOT da.inheritance_broken -- Stop traversing if inheritance is broken
)
SELECT * FROM doc_ancestry ORDER BY depth DESC;
```

### 4.2 Effective Access Report Generation Algorithm

To allow document owners to audit "who can see or edit" a page, the Kollab backend provides a query service that computes the flat list of all users with access.

#### Calculation Steps:
1. **Ancestry & Context Resolution**:
   - Run the ancestry CTE query to obtain the sequence of document IDs from root to target `D`.
   - Identify the containing `ProjectID` and `TeamID`.
2. **Collect Policy Grants**:
   - Query all grants in the `grants` table where `resource_id` matches:
     - Any document ID in the ancestry slice.
     - The containing `ProjectID`.
     - The containing `TeamID` (which maps group-level roles).
3. **Map Group Memberships**:
   - For all group-level grants (`grantee_type = 'team'`), query the `team_members` replica table to identify all individual user IDs inside those groups.
4. **Evaluate and Merge (Precedence Rules)**:
   - For each unique user identified across the grants:
     - Check if they are blocked by any view restrictions on parent documents in the ancestry path. If blocked, exclude them from the report (since they cannot see the page).
     - Collect all valid grants (direct user grants, inherited user grants, group memberships, project roles).
     - Resolve their highest privilege level (Owner > Editor > Commenter > Viewer) based on role expansion.
     - Track the provenance path of each access claim (e.g. "Direct Grant on D", "Inherited from parent A_i", "Member of group G").
5. **Format Report**: Return a list sorted by `displayName` detailing the effective role and inheritance sources.

---

## 🏷️ 5. ABAC & System Classification (PII) Policies

Zero Trust requires validation of classification tags at check time. If a document is classified with sensitive tags (e.g. `pii`, `confidential`), the user must have corresponding clearance attributes.

### Policy Rules Evaluation Matrix

| Document Classification | User Clearance Required | Allowed Operations |
| :--- | :--- | :--- |
| **public** | Any / Anonymous | Read (if public link exists), Write (if collaborator) |
| **internal** | Authenticated Employee | Standard RBAC Rules Apply |
| **confidential** | `clearance_level >= 'confidential'` | Standard RBAC Rules Apply |
| **pii** | `clearance_level >= 'pii'` AND `mfa_verified = true` | Standard RBAC Rules Apply |

### Implementation in Go via `go-permissions` Rules

```go
package permissions

import (
	"context"
	"errors"
)

type ClassificationPolicy struct{}

func (p *ClassificationPolicy) Evaluate(ctx context.Context, req EvaluationRequest) (bool, error) {
	// 1. Extract resource classification from context
	resourceClass, ok := req.Context["resource_classification"].(string)
	if !ok {
		return false, errors.New("missing resource classification in context")
	}

	// Public and internal resources follow standard RBAC
	if resourceClass == "public" || resourceClass == "internal" {
		return true, nil
	}

	// 2. Extract user clearance from identity context
	userClearance, ok := req.Context["user_clearance"].(string)
	if !ok {
		return false, nil // Deny: user has no clearance attributes
	}

	// 3. Enforce Hierarchy rules
	switch resourceClass {
	case "confidential":
		return userClearance == "confidential" || userClearance == "pii", nil
	case "pii":
		// Double check if MFA was validated during OIDC token issuance
		mfaVerified, _ := req.Context["mfa_verified"].(bool)
		return userClearance == "pii" && mfaVerified, nil
	}

	return false, nil
}
```

---

## 🔗 6. OneDrive / SharePoint Share Semantics & Link TTLs

Kollab implements standard link sharing where links can be restricted to the organization or public, with optional passwords and expiration.

### Share Link Generation Parameters
- **Scope**:
  - `anyone`: Generates a tokenized link that requires no authentication.
  - `organization`: Generates a link that requires an authenticated session matching the tenant domain.
- **Roles**:
  - `viewer` (`document.read`)
  - `commenter` (`document.read`, `comment.create`)
  - `editor` (`document.read`, `document.write`, `comment.create`)
- **Expiration (TTL)**: Optional UTC timestamp. Evaluated continuously.
- **Password**: Optional bcrypt hash. If present, the user must input the password, which creates a short-lived signed JWT session cookie authorizing access.

### Evaluation Flow for Share Links
```
[HTTP Request to /api/documents/{id}] -> [Check Auth Header]
                                             │
                          ┌──────────────────┴──────────────────┐
                  [Has JWT Token]                                [No JWT Token]
                          │                                             │
              Check standard RBAC & ABAC                     Look for link token query param (?token=XYZ)
                          │                                             │
             [Allowed]   [Denied]                               ┌───────┴───────┐
                 │          │                            [Token Valid]    [Token Invalid]
                 ▼          ▼                                   │               │
              [GRANT]    [DENY]                        Verify Scope, TTL,       ▼
                                                       & Password Challenge  [DENY]
                                                                │
                                                      ┌─────────┴─────────┐
                                                  [Passed]             [Failed]
                                                     │                    │
                                                     ▼                    ▼
                                                  [GRANT]              [DENY]
```

---

## 🛡️ 7. Zero Trust, Caching, and Continuous Auditing

### Caching Strategy with Immediate Invalidation
To maintain low latency on every WebSocket keystroke / REST call without hammering PostgreSQL:
1. **Cache Layer**: We wrap the core PostgreSQL permission store using `go-permissions`' native `cacheStore` implementation. This caches evaluation decisions in-memory with a short default TTL (e.g. 10 seconds).
2. **Dynamic Invalidation Protocol**:
   - We implement a Postgres-backed cache invalidation wrapper using `pg_notify` (Postgres `LISTEN/NOTIFY` channels).
   - When a user changes document classifications, adds/removes grants, or revokes share links, the writing backend publishes an invalidation payload to the database notify channel.
   - All active Kollab backend instances listen to this channel and immediately call `Purge` / `Evict` on their local `cacheStore` instance for the matching keys, preventing stale authorization state.

### Continuous Auditing Schema
Every permission check result is logged to `document_audit_logs` to monitor compliance.

```sql
CREATE TABLE IF NOT EXISTS document_audit_logs (
    id VARCHAR(255) NOT NULL,
    document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NULL,           -- NULL if anonymous share link
    action VARCHAR(50) NOT NULL,          -- 'read', 'write', 'share'
    decision VARCHAR(20) NOT NULL,        -- 'allow', 'deny'
    reason TEXT NOT NULL,                 -- e.g., 'Inherited restriction parent_doc_1', 'ABAC clearance mismatch'
    ip_address VARCHAR(50) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
```

---

## 🔌 8. REST API Endpoint Specifications

All endpoints are secure and require JWT authorization (except tokenized public sharing links).

### Permission Management
- **`GET /api/documents/{id}/permissions`**
  - **Description**: Returns inheritance status, classifications, direct user/group grants, and system classification tags.
  - **Response (200 OK)**:
    ```json
    {
      "documentId": "doc_abc123",
      "classification": "pii",
      "inheritanceBroken": false,
      "grants": [
        {
          "id": "grant_111",
          "granteeType": "user",
          "granteeId": "user_john",
          "granteeName": "John Bauer",
          "roleId": "editor",
          "expiresAt": null
        },
        {
          "id": "grant_222",
          "granteeType": "team",
          "granteeId": "team_marketing",
          "granteeName": "Marketing Team",
          "roleId": "viewer",
          "expiresAt": "2026-07-01T00:00:00Z"
        }
      ]
    }
    ```

- **`GET /api/documents/{id}/permissions/effective`**
  - **Description**: Returns the fully resolved effective permissions report ("Who can see or edit"). This aggregates direct, group, and inherited grants to compute the final privilege level and provenance for all users with access.
  - **Response (200 OK)**:
    ```json
    [
      {
        "userId": "user_jane",
        "displayName": "Jane Doe",
        "effectiveRole": "editor",
        "sources": [
          {
            "type": "direct",
            "roleId": "editor",
            "resourceId": "doc_abc123"
          }
        ]
      },
      {
        "userId": "user_bob",
        "displayName": "Bob Smith",
        "effectiveRole": "viewer",
        "sources": [
          {
            "type": "inherited_ancestor",
            "roleId": "editor",
            "resourceId": "doc_parent789",
            "resourceTitle": "Engineering Team Wiki"
          },
          {
            "type": "team_membership",
            "roleId": "viewer",
            "teamId": "team_engineering",
            "teamName": "Engineering Team"
          }
        ]
      }
    ]
    ```

- **`POST /api/documents/{id}/permissions/grants`**
  - **Request Body**:
    ```json
    {
      "granteeType": "user",
      "granteeId": "user_jane",
      "roleId": "editor",
      "expiresAt": "2026-06-30T18:00:00Z"
    }
    ```
  - **Response (201 Created)**

- **`DELETE /api/documents/{id}/permissions/grants/{grantId}`**
  - **Response (204 No Content)**

- **`PUT /api/documents/{id}/permissions/settings`**
  - **Request Body**:
    ```json
    {
      "classification": "confidential",
      "inheritanceBroken": true
    }
    ```
  - **Response (200 OK)**

### Sharing Links
- **`POST /api/documents/{id}/permissions/share-links`**
  - **Request Body**:
    ```json
    {
      "roleId": "viewer",
      "scope": "anyone",
      "password": "optionalSecretPassword",
      "expiresInDays": 7
    }
    ```
  - **Response (201 Created)**:
    ```json
    {
      "token": "link_tok_8f7b3a9e...", // Plaintext token returned ONCE to the creator
      "documentId": "doc_abc123",
      "roleId": "viewer",
      "scope": "anyone",
      "shareUrl": "https://kollab.internal/share/link_tok_8f7b3a9e...",
      "expiresAt": "2026-06-26T03:42:00Z"
    }
    ```
    > [!IMPORTANT]
    > **Security Design**: The plaintext token returned in the response is generated once and is **never** stored in the database. The database stores the SHA-256 hash of the token (`token_hash`). When verifying access, the server hashes the client's URL token and queries for the matching record.

- **`GET /api/documents/{id}/permissions/share-links`**
  - **Response (200 OK)**: Array of active share links.

- **`DELETE /api/documents/{id}/permissions/share-links/{linkId}`**
  - **Response (204 No Content)**

---

## 🖥️ 9. Frontend Share Dialog & UI Components

The share flow is managed by a single cohesive **Share Dialog** component in React.

```
┌────────────────────────────────────────────────────────┐
│ Share "Design Specification"                    [X]    │
├────────────────────────────────────────────────────────┤
│ 👤 Direct Access                                        │
│  [ Search users or teams to invite... ]  [Editor  ▼]   │
│                                           [ Invite ]   │
│                                                        │
│  Members with Access:                                  │
│  - John Bauer (Owner)                     [Owner    ]  │
│  - Jane Doe                               [Editor  ▼]  │
│  - Marketing Team (Inherited)             [Viewer   ]  │
│                                                        │
├────────────────────────────────────────────────────────┤
│ 🔗 General Link Sharing                                 │
│  Scope: [Anyone with link  ▼]  Access: [Viewer   ▼]     │
│  Expires: [7 Days (2026-06-26) ▼]                      │
│  [ Password Protected (Enabled) ]                      │
│                                                        │
│  Link: https://kollab.internal/share/8f7b3a9e...      │
│  [ Copy Link ]                                         │
│                                                        │
├────────────────────────────────────────────────────────┤
│ 🏷️ Classification & Inheritance                        │
│  Security Tag: [ Confidential         ▼]               │
│  [x] Inherit permissions from parent document          │
│                                                        │
├────────────────────────────────────────────────────────┤
│ [ Done ]                                               │
└────────────────────────────────────────────────────────┘
```

### Component Details
1. **Direct Access Manager**: Search bar connected to the directory search API (`/api/users` and `/api/teams`). Lists current active grants. Grant source is displayed (e.g. "Direct Grant", "Inherited from Parent Page").
2. **Link Generator Panel**: Form to toggle scope, role, expiration, and password. Copy button formats the URL with the cryptographic link token.
3. **Settings Controls**: Dropdown for `classification` level (Public, Internal, Confidential, PII) and checkbox for `inheritance_broken` mapping. Updating these tags prompts verification or alerts the user if changing to a more restrictive state.

---

## 🛡️ 10. Senior Systems Architect & Cybersecurity Review

This section details security architecture recommendations and design implementations applied to prevent data leakage, enforce least-privilege access, and optimize database throughput.

### 10.1 Cryptographic Sharing Token Protection (High Security)
- **Vulnerability**: Plaintext tokens stored in databases are a major security risk. If the DB is compromised, an attacker gains immediate read/write access to all shared documents via valid share links.
- **Design Enforcement**:
  - The API layer generates high-entropy cryptographically secure random tokens (e.g. 32 bytes from `crypto/rand` encoded in hex).
  - The database only stores the SHA-256 hash of this token in the `token_hash` column of `sharing_links`.
  - When a user accesses the share link (e.g., `/share/{token}`), the gateway hashes the token and queries the database for the matching `token_hash`. This follows the standard security pattern used for API keys and passwords.

### 10.2 Auto-Classification & DLP (Data Loss Prevention) Scanning
- **Vulnerability**: Users frequently forget to tag documents containing sensitive information (PII, API keys, credentials) as Restricted or PII, leading to accidental exposure.
- **Design Enforcement**:
  - Implement a backend event listener triggered on document save/update.
  - A low-priority background goroutine parses the ProseMirror JSON tree and runs Data Loss Prevention (DLP) regular expressions to scan for patterns (SSNs, credit card numbers, secret keys, emails).
  - If a pattern is matched, the document's `classification` level is automatically elevated to `pii` or `confidential`, and a security audit alert is logged.

### 10.3 Broken Inheritance Islands & Access Auditing (Least Privilege)
- **Vulnerability**: SharePoint-style broken inheritance can result in "islands" of documents that are accidentally exposed to a wider audience than intended, which is difficult for owners to audit.
- **Design Enforcement**:
  - **Audit Logging**: Any request to break or restore inheritance (`inheritance_broken = TRUE/FALSE`) is logged as a critical audit event.
  - **Admin Report Gating**: System administrators can query a compliance view of all documents that have `inheritance_broken = TRUE` to audit potential structural security anomalies.
  - **Device Posture & CAP**: Direct access checks for documents with broken inheritance must explicitly verify the network location (IP range) and MFA status.

### 10.4 Password Challenge Brute-Force Rate Limiting (Endpoint Security)
- **Vulnerability**: Attacking password-protected share links via automated brute force.
- **Design Enforcement**:
  - Password validations for share links are processed via the `/api/share/challenge` endpoint.
  - Enforce strict IP-based and token-based rate-limiting (e.g., maximum 5 failed attempts per minute) backed by Redis.
  - After 5 failed attempts, the link token is temporarily locked for that IP address for a 15-minute cool-down period.

### 10.5 Lineage Traversal Query Optimization (Performance)
- **Performance Risk**: Deep document hierarchies require running recursive CTE queries on every single API request, which creates database performance bottlenecks under high concurrent loads.
- **Design Enforcement**:
  - In addition to standard hierarchy query processing, we implement a **materialized lineage path** (using PostgreSQL `ltree` or a JSONB array of ancestor IDs `ancestor_path`) cached directly on the `documents` table.
  - The array index is updated only on document creation or move operations (writes are rare compared to reads).
  - Access validation reads this column directly to verify ancestor permissions, reducing a complex recursive database traversal to a simple single-row lookup.
