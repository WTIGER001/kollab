# GitLab Integration & Macros Design

## 1. Connection Management Architecture
To securely interface with GitLab (both SaaS and self-hosted) and other future third-party integrations, Kollab will implement a layered **Connections Manager**.

### Connection Scopes
Connections can be defined at four distinct scopes, cascading from broadest to most specific:
1. **System Level**: Created by Server Admins. Available to all workspaces. Useful for company-wide internal GitLab instances using a service account or OAuth app.
2. **Workspace Level**: Created by Workspace Admins. Available to all projects within the workspace.
3. **Project Level**: Created by Project Managers. Scoped tightly to a single project.
4. **Personal Level**: Created by individual users (e.g., Personal Access Tokens). Only visible and usable by the creator.

### Authentication Methods
A GitLab Connection configuration will require:
- **Base URL**: (e.g., `https://gitlab.com` or `https://gitlab.internal.company.com`)
- **Auth Type**: Personal Access Token (PAT), Project Access Token, or OAuth2.
- **Credentials**: Securely stored in the database (encrypted at rest).

When a user inserts a GitLab macro into a document, they will select from a dropdown of *Connections they have access to*. 

---

## 2. Macro Snapshot & Caching Mechanism
To ensure documents load instantly and remain readable offline or if GitLab experiences downtime, we will not fetch macro data completely on the fly. 

### Snapshotting
1. **Initial Fetch**: When a user creates the macro and links a resource (e.g., an Issue URL), Kollab backend immediately fetches the data and creates a JSON payload.
2. **Storage**: This JSON payload (the "Snapshot") is embedded directly into the Document's rich text schema (e.g., within the Yjs state block for that node).
3. **Rendering**: When any user opens the document, the frontend instantly renders the macro using the stored Snapshot data.

### Auto-Update (TTL) & Fallbacks
1. **Time-To-Live (TTL)**: Each macro instance has a configurable TTL (defaulting to e.g. 15 minutes). 
2. **Background Refresh**: If a user is viewing a document and the macro's `last_updated_at` exceeds the TTL, the frontend triggers a background sync request to the Kollab backend. The backend uses the macro's configured Connection to fetch the latest data.
3. **Updating the Snapshot**: If successful, the new JSON is pushed to the document state (which auto-syncs via websockets to all viewing users). 
4. **Graceful Degradation**: If the background fetch fails (GitLab is down, connection token expired, 403 Forbidden), the macro simply displays a small warning icon ("Failed to sync") but **continues to render the previous Snapshot** seamlessly. Users can also click a manual "Refresh" button.

---

## 3. Suggested GitLab Macros
Here are 8 high-value macros tailored for embedding GitLab data into Kollab documents:

### 1. GitLab Issue / Work Item Block
Embeds a single issue or incident.
- **Displays**: Title, status (Open/Closed), assignee avatar, labels, milestone, and a truncated description snippet.
- **Use Case**: Meeting notes discussing specific bugs, or documenting a post-mortem.

### 2. GitLab Merge Request (MR) Card
Tracks the lifecycle of a code change.
- **Displays**: MR title, source/target branches, approval status, CI/CD pipeline pass/fail status, and whether there are merge conflicts.
- **Use Case**: Release planning documents or architectural decision records (ADRs) that require tracking implementation.

### 3. GitLab Pipeline Status
A live indicator of a repository's continuous integration state.
- **Displays**: The latest pipeline status (Running, Passed, Failed, Canceled) for a specific branch or commit, along with the duration and triggerer.
- **Use Case**: Project dashboards and QA testing checklists.

### 4. GitLab Epic / Roadmap Tracker
Tracks high-level initiatives.
- **Displays**: Epic title, start/end dates, and a progress bar calculating the completion percentage of child issues.
- **Use Case**: Quarterly planning documents and executive summaries.

### 5. GitLab Issue List / Board View
A dynamic table or Kanban view of multiple issues.
- **Displays**: A list of issues dynamically populated by a JQL-like search query or specific label/assignee. 
- **Use Case**: Sprint planning pages or bug-triage documents.

### 6. GitLab Code Snippet / File Embed
Pulls live source code directly from a repository.
- **Displays**: Read-only code block with syntax highlighting, synced to the `main` branch (or a specific commit hash to prevent it from changing).
- **Use Case**: Technical documentation, API reference guides, and onboarding wikis.

### 7. GitLab Deployment Environment Status
Monitors where code is currently deployed.
- **Displays**: Environment name (e.g., `production`), current deployed commit hash, deploy status, and timestamp.
- **Use Case**: DevOps runbooks and release readiness pages.

### 8. GitLab Vulnerability Summary
High-level security overview (Requires Ultimate Tier / Security Dashboard).
- **Displays**: Count of Critical, High, Medium, and Low vulnerabilities detected on the default branch.
- **Use Case**: Security audit documents and compliance tracking.
