# Administration and deployment

Kollab's supplied deployment uses Docker Compose, PostgreSQL, two API replicas, a document-preview service, and Caddy. Azure backup and Jira are prototypes. Kubernetes and Azure infrastructure designs are reference material, not deployment assets.

## Deploy a release

The repository's **CD - Auto Deploy to DigitalOcean** workflow runs after a push to `main`. It runs the backend coverage suite and frontend lint, tests, and build, then checks out that exact commit in the server's Kollab directory and runs `./deploy.sh`. Deployments run in sequence.

The workflow requires the configured `DROPLET_IP`, `SSH_PRIVATE_KEY`, and optional `SSH_PASSPHRASE` GitHub secrets. The server needs Git, Docker Compose, OpenSSL, network access for image/package downloads, and enough free disk and memory for compilation. Small servers may need additional swap or a larger build host. Build time is not a zero-downtime or duration guarantee.

For a manual deployment, prepare a clean checkout of the intended release on the server, then run `./deploy.sh` from that checkout. The script does not pull a moving Kollab branch or change the package version. Preserve and review server-specific Git changes before switching revisions; do not discard them blindly.

The script uses the existing sibling `media-preview` checkout, or clones it if missing. It builds images before replacing containers and checks every running API replica's `/health` endpoint before reporting success. A failed build leaves the previous containers running. If startup or health checks fail after replacement, inspect the failed service before declaring the release successful.

## Configure the server

Keep deployment settings in the server's private `.env` file:

| Setting | Purpose |
| --- | --- |
| `DOMAIN` | Workspace hostname used by Caddy |
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | Common signing secret for all API replicas |
| `SYNC_SIGNING_KEY` | Private key shared only with trusted sync peer installations |
| `API_REPLICAS` | Number of API processes; defaults to 2 |
| `HTTP_PORT`, `HTTPS_PORT` | Host ports; default to 80 and 443 |

The supplied Compose deployment uses local accounts. For OIDC, configure the API service environment explicitly using the [OIDC guide](oidc_sso.md); changing login-screen branding does not switch authentication providers. Do not switch an existing installation's identity model without planning account and administrator access.

Replicas must share one database and the same writable `uploads` directory. Keep these persistent across releases. The supplied Caddyfile also contains additional sites for the current server; review those when adapting this repository to another host. Deploy initializes a missing sync signing key without printing it. Configure the same key on a trusted peer before exchanging packages.

## Verify the running site

1. Confirm every API replica is running and its health check succeeds.
2. Open the public workspace and check `/api/health`; a successful response reports the database as up.
3. Sign in, open a page, edit and reload it, and verify the updated content.
4. With two browsers, verify edits and online presence cross sessions.
5. Check the configured external services separately. A healthy Kollab database does not prove that an AI provider, OIDC provider, GitLab, or document converter is configured correctly.

Existing accounts are preserved. A completely empty installation presents the first-administrator setup; see [Local user management](local_user_management.md).

## Administration and recovery

Open **Server Settings** from the account menu. Each section has its own page; use **Save Changes** before leaving a section. See [Server settings](server_settings.md), [Backups and restores](backups_and_restores.md), and [Bidirectional synchronization](synchronization.md).

Imports and restores coordinate all API replicas. An interrupted archive operation can leave a recovery directory and temporarily block workspace operations. Have the operator reconcile the preserved files and database result before resuming; details are in [the technical recovery design](../design/multi_instance_sync.md).

Builds run one service at a time. Frontend compilation has an explicit 2 GiB Node heap limit; Go compilation limits parallelism and reuses its build cache. Docker build contexts exclude local environments, uploaded data, generated reports, and installed dependencies. These limits reduce competing memory use but do not replace adequate host memory/swap and disk.
