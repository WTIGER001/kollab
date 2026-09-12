# Administration and deployment

Kollab's supplied deployment uses Docker Compose, PostgreSQL, two API replicas, a document-preview service, and Caddy. Azure backup and Jira are prototypes. Kubernetes and Azure infrastructure designs are reference material, not deployment assets.

## Deploy a release

The repository's **CD - Auto Deploy to DigitalOcean** workflow runs after a push to `main`. It runs the backend coverage suite, frontend lint/tests/build, and release-script checks. GitHub then builds the API, web/proxy, and document-preview Docker images for the server's `linux/amd64` architecture. Images are published to GitHub Container Registry (GHCR) with the full release commit as their tag. Deployments run in sequence.

The workflow requires the configured `DROPLET_IP`, `SSH_PRIVATE_KEY`, and optional `SSH_PASSPHRASE` GitHub secrets. GitHub's built-in job token publishes and downloads the images; no additional long-lived registry credential is required for CI. The temporary registry login on the server is removed after deployment. The server needs Git, Docker Compose, OpenSSL, network access to GHCR/Docker Hub, and sufficient runtime memory and image storage. It does not compile application code.

For a manual deployment, prepare a clean checkout of a release whose images have already been published, authenticate to GHCR with read access if the packages are private, then run `./deploy.sh` from that checkout. The script selects the checkout's exact commit, downloads all images, records `KOLLAB_RELEASE` in the private `.env`, and starts containers with building disabled. It does not pull a moving Kollab branch or change the package version. Preserve and review server-specific Git changes before switching revisions; do not discard them blindly.

The document converter is built from the exact revision in [`media-preview.ref`](../media-preview.ref); the droplet does not need its source checkout. A build or image-download failure leaves the previous containers running. After replacement, the script checks every API replica's `/health` endpoint, including replicas that have exited. If startup or health checks fail, inspect the failed service before declaring the release successful. Image tags allow selecting a previous published release, but reverting images does not revert database migrations or workspace data; assess schema compatibility before attempting rollback.

## Build images on your computer

With Docker running and Buildx installed, execute `./build.sh` from the repository root. Docker Desktop includes Buildx; with Homebrew/Colima, install it using `brew install docker-buildx`. The script accepts either Docker's plugin or the standalone Homebrew executable without changing your Docker settings. It builds the same three images and loads them into your local Docker image store with the tag `local`. It does not publish, deploy, or start containers. The default target is `linux/amd64`, matching DigitalOcean; an Apple Silicon Mac may use emulation and take longer.

- `./build.sh --platform linux/arm64` builds native images for an ARM development machine.
- `./build.sh --tag review` chooses another local tag.
- `./build.sh --help` lists the options.

Local builds include your current working-tree changes. CI releases use a committed revision and the automated verification gates. Both build paths use the same Dockerfiles and pinned converter revision. The standard development environment remains available through `dev.sh`.

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
| `KOLLAB_RELEASE` | Full image tag selected automatically by deployment; keep it for subsequent Compose operations |

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

GitHub builds images on separate runners and caches build layers. Local builds run one service at a time. Frontend compilation has a 2 GiB Node heap limit, and Go compilation limits parallelism. Docker build contexts exclude local environments, uploaded data, generated reports, and installed dependencies. Compilation resources are needed on the build machine, not on the droplet.
