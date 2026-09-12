# Multiple API instances and bidirectional synchronization

This implementation targets 2–5 concurrent editors. Azure backup and Jira are excluded prototypes. Old sync packages are deliberately unsupported; there is no legacy-format conversion path.

## Replicas within one installation

API processes share PostgreSQL, the same `JWT_SECRET`, authentication configuration, and the same writable `uploads` filesystem. Each process has an ephemeral UUID. Docker Compose defaults to two API replicas (`API_REPLICAS` overrides this). Caddy discovers service A records every five seconds, balances connections round-robin, and uses passive failure detection. Established WebSockets remain on one process. See [Caddy's dynamic upstream specification](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#dynamic-upstreams).

`0014_cluster.sql` creates `cluster_control` (epoch, tree revision, media signing key) and transient `cluster_presence` rows. These records and credentials never cross installations in backups or sync packages. Page media capability signatures work across API replicas and process restarts because their signing key is stored in this installation's database.

`ws.Hub.RunContext` polls PostgreSQL every 250 ms for active rooms. Full Yjs snapshots remain authoritative in `collaborative_states`; the accepted version and readable projection are committed by compare-and-swap. A stale writer receives the accepted state and merges it in the browser before retrying. Presence uses per-connection UUIDs and expires after 15 seconds; cursor positions are shared with the presence heartbeat. Polling errors leave accepted state intact. No Redis or sticky-session requirement is introduced.

The browser disables editing until initial synchronization completes. The first editor must receive its initialization acknowledgement. A losing initializer reloads before merging duplicated JSON seeds, including viewers that rendered a local initial copy. Reconnect keeps ordinary unsent edits, but a changed restoration epoch causes reload before old CRDT state can enter a restored document.

```mermaid
sequenceDiagram
  participant A as Browser A / API 1
  participant DB as PostgreSQL
  participant B as Browser B / API 2
  A->>DB: Save snapshot at version N
  DB-->>A: Accepted N+1
  B->>DB: Poll current snapshot and presence
  DB-->>B: Snapshot N+1 and active connections
  B->>DB: Save stale snapshot at N
  DB-->>B: Reject; return N+1
  B->>B: Merge Yjs state
  B->>DB: Save merged snapshot at N+1
  DB-->>B: Accepted N+2
```

## Maintenance and recovery

`lifecycle.Enter` combines a cancellable local reader/writer semaphore with PostgreSQL advisory session locks. Ordinary HTTP work and WebSocket state operations take shared locks; archive exports/imports, version restore, end-of-session checkpoints, and cleanup use the appropriate exclusive gate. A separate connection pool serves distributed locks so waiting requests cannot exhaust connections needed by the lock holder. Startup initialization is serialized with a dedicated PostgreSQL connection.

Backup restore, sync import, and page version restore advance `cluster_control.epoch` in the same database transaction as the authoritative change. Every replica invalidates its rooms before processing another edit. Local disconnect signals use WebSocket close code 1012. End-of-session checkpoints check remote presence and serialize their final content comparison.

File installation stages on the shared uploads mount and rolls back on database failure. A process interruption leaves a `.kollab-restore-*` directory. Startup and subsequent coordinated operations refuse to use the workspace while that recovery marker remains. An operator must reconcile its `previous-uploads`, staged files, and database outcome before removing it. PostgreSQL plus a filesystem cannot offer a single cross-resource transaction; this fence prevents silent use of a potentially mixed state.

## Separate installations exchanging packages

`0015_bidirectional_sync.sql` provides:

| Table | Purpose |
| --- | --- |
| `replication_identity` | Local installation UUID; excluded from archives and renewed after restore |
| `replication_records` | Latest full row/tombstone and vector clock per portable row key |
| `replication_events` | One compact latest event per row, with a monotonically advancing local export cursor |
| `replication_conflicts` | Both database versions and the administrator's committed resolution |

Tracking is enabled after permission-schema setup for every primary-key application table. Internal replication, cluster, migration, and obsolete operation-log tables are excluded. No-op updates do not advance clocks. Changing a primary key creates a tombstone for the former identity.

Most rows use their primary key as portable identity. The permissions library uses local serial IDs; `principal_roles` and `permission_grants` therefore receive UUID `sync_id` columns. Assignments derive a stable UUID from principal, role, and binding values; grants receive random UUIDs. Numeric local IDs are omitted from transport and allocated locally, avoiding collisions between independent installations.

`POST /api/system/sync/import` and `GET /api/system/sync/export?since_id=0` require server administration. The signed ZIP contains `sync_operations.json`, uploaded files, and `signature.txt`. `SYNC_SIGNING_KEY` must match between trusted installations and contain at least 32 bytes. Signatures cover ordered entry names, sizes, payloads, and file bytes. A signed package is trusted administrative data, including account/permission changes and service settings.

```json
{
  "format": "kollab.sync.v3",
  "operations": [{
    "id": 42,
    "event_id": "a7bbccf1-55e6-4ebe-ab54-41bfdb621069",
    "source_id": "e3b2b65b-9076-49d6-bc7c-1de96f5b728b",
    "table_name": "teams",
    "record_key": "{\"id\": \"team-example\"}",
    "action": "UPDATE",
    "row_data": {"id": "team-example", "name": "Example"},
    "clock": {"e3b2b65b-9076-49d6-bc7c-1de96f5b728b": 3}
  }]
}
```

The row example is abbreviated; real events include all transferable columns. Vector clocks distinguish later, earlier/equal, and concurrent changes. Earlier/equal events are ignored, and tombstones prevent resurrection. Concurrent equal data joins its clocks automatically. Other concurrent data returns HTTP 409 with redacted local/incoming previews and a conflict identifier bound to both versions. The whole import rolls back. The frontend sends explicit choices in a multipart `resolutions` map (`keep-local` or `use-incoming`); each accepted decision joins both clocks and advances the importing node. Reverse exchange propagates that decision. A changed conflict requires another review.

Upserts run in foreign-key order; deletions run in reverse order, including document parent depth. A parent deletion cannot cascade into unmentioned destination-only records. Combined moves must preserve parent/project/team scope and have no ancestry cycles. A dependency or uniqueness conflict is rejected atomically; reconcile that relationship in the workspace before retrying. This is explicit row-level conflict selection, not automatic semantic merging of disconnected page edits.

Same-path files with different hashes also require a decision. Losing bytes are retained under `uploads/.kollab-sync-conflicts/<conflict-id>/<sha256>` with `original-path.txt`. This local recovery history is included in full backups but excluded from outgoing sync. Database conflict history is local and included in full backups. Recovery paths cannot be injected by sync packages.

Use cursor 0 for a complete state exchange. For incremental exchange, record the greatest event `id` in the exported package separately for each source/destination pair, and advance it only after the destination successfully imports. Cursors are local, not interchangeable between installations. Full packages are safe to repeat. They merge the source state; they do not delete unrelated destination data.

## Verification

Integration tests exercise two PostgreSQL installations, independent permission ID allocation, conflicts and reverse propagation, old-package rejection by clock, deletion tombstones, compact cursors, dependent-record protection, shared maintenance locks, media keys, presence expiry, two hubs with five editors, stale writes, surviving-replica reconnect, and restoration epochs. HTTP tests cover file conflict review, database-failure rollback, and preservation of losing file bytes. Frontend tests cover reviewed decisions, cancellation, duplicate-submit prevention, first initialization, and epoch reloads.

See [readiness results](production_readiness.md) and [administrator instructions](../user_guide/synchronization.md).

The final full backend run passed at **63.9% statement coverage**. All **113 frontend tests** passed; the production TypeScript/build checks and targeted race checks passed. The synchronization settings page was inspected in light and dark modes; custom controls use injected theme variables.

Deployment uses the exact verified Git revision without changing package versions on the server. The deployment checks every API replica before reporting success. Generated browser test output is excluded from source control.

The edge proxy defaults to host ports 80 and 443; `HTTP_PORT` and `HTTPS_PORT` can override them. Existing additional proxy sites are preserved. Deployment initializes a missing sync signing key privately in the server environment file. Use the same key on trusted peer installations before exchanging sync packages.

Images are built in GitHub Actions and distributed through GHCR. The droplet only downloads and starts the selected images. The local `build.sh` uses the same Dockerfiles and pinned converter source; see [Container releases](container_releases.md) for image identity, authentication, failure handling, and local build options.
