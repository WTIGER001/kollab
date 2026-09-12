# Exchange changes between installations

Server administrators can exchange changes in both directions between separate Kollab installations. Open **Server settings → Backup & sync → Bidirectional Air-Gap Sync**. Azure backup and Jira remain prototypes.

Before the first exchange, configure the same private `SYNC_SIGNING_KEY` on both installations and run the same application version. The key must be at least 32 bytes long. A sync ZIP includes sensitive workspace and account data; exchange it only with trusted administrators. Old sync ZIP formats are not supported. Create fresh packages with this version.

1. On the source installation, leave **Since Operation ID** at **0** and select **Export Sync ZIP**. This includes its complete tracked state and uploaded files.
2. On the destination, select **Import Sync ZIP** and choose that file.
3. If a conflict appears, compare **This installation** with **Incoming installation**. Select **Keep this installation’s version**, **Use incoming version**, or **Cancel import**. Each decision applies only to the displayed conflict. Additional conflicts appear separately.
4. Wait for the successful import message. Until every conflict is resolved, the import leaves the destination unchanged.
5. Export from the destination and import back into the original source to carry its changes and your resolutions in the reverse direction.

Duplicate packages and older versions of records are safe to import again. Deleted records stay deleted when an older package arrives. A full sync merges changes and preserves unrelated destination data; a full backup restore replaces data.

For small workspaces, using **0** for each exchange is the easiest workflow. Advanced users can find the greatest operation `id` in `sync_operations.json` inside an exported ZIP and use it as the next cursor after successful import. Track cursors separately for each direction and destination. Never reuse another installation's cursor or advance one after a failed import.

Page moves or deletions can conflict with work that exists only on the destination. If the message identifies dependent records or incompatible page locations, move or reconcile those pages in the workspace before importing again. Conflicts select an entire record; inspect related page-content conflicts carefully. Both resolved database versions remain in the server's synchronization audit records. Losing file versions remain in local recovery storage for an administrator to retrieve.

# Working across API replicas

An installation can run multiple API processes while everyone uses the same workspace address. The supplied Docker Compose setup defaults to two. Edits, online presence, and cursor positions cross process boundaries. Reconnecting through another process retrieves accepted changes from the shared database. The verified concurrency target is 2–5 editors.

If the collaboration connection is unavailable, keep the page open. Editing waits for initial synchronization. After a page version restore or administrative import, open pages reload to use the authoritative restored data. Save current work before those operations.

For deployment, all API processes must use the same database, sign-in configuration, and writable uploads directory. Administrators can set `API_REPLICAS` to change the number of processes. Separate uploads folders on each process are not supported.

If an interrupted archive operation reports that recovery is required, further workspace operations pause to protect its data. Have the server administrator inspect the preserved recovery directory and database outcome before resuming. Ordinary sync conflicts only require the review controls above.

See [technical implementation and recovery details](../design/multi_instance_sync.md) and [verification results](../design/production_readiness.md).

Deployment uses the exact verified Git revision without changing package versions on the server. The deployment checks every API replica before reporting success. Generated browser test output is excluded from source control.

The edge proxy defaults to host ports 80 and 443; `HTTP_PORT` and `HTTPS_PORT` can override them. Existing additional proxy sites are preserved. Deployment initializes a missing sync signing key privately in the server environment file. Use the same key on trusted peer installations before exchanging sync packages.
