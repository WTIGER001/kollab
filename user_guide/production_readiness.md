# Reliability and access updates

The reliability changes below passed local verification; deployment-specific external-service checks remain. Azure backup and Jira are still prototypes.

Page lists, recent pages, favorites, tasks, and properties respect current page access. A viewer cannot send collaborative edits, and an open collaborative connection stops delivering content when access is removed. Local users must sign in again after their password changes; disabled or deleted accounts cannot keep using an old session.

Backup and synchronization tools are reserved for server administrators. Moving and creating pages requires access to the destination space. A page version must belong to the page being restored.

The technical notes record the completed checks and remaining deployment decisions. See [the technical notes](../design/production_readiness.md).

Use the Trash page within your team, project, or personal space to restore pages or permanently delete them. Page activity opens for the page you selected. Personal settings use your signed-in account. The default workspace theme can be saved by an administrator and applies to users selecting the Default preset.

The editor waits for the collaboration connection before enabling changes. Changes are synchronized to the server and merged after reconnecting. If saving fails, keep the page open and retry; a pending save now triggers a warning before closing the tab. Publishing waits for a successful draft save.

Sharing links open a dedicated shared page. Enter the link password if one was set. Visitors can read public links; sign in to comment or edit when the link's role permits it. Expired or revoked links stop granting access. GitLab issue cards require a configured GitLab connection and a matching issue URL.

Image uploads accept PNG, JPEG, GIF, WebP, and passive SVG, up to 10 MB and 40 megapixels. Images in private pages or libraries require access to that content. Unsafe SVG content is rejected. PDF export reports an error when its renderer is unavailable instead of downloading an unexpected HTML file.

Administrators can download and restore complete system archives under server settings. New archives contain account permissions, history, and attachment records as well as page content. Restore replaces the installation's data and requires a matching application schema. Restore reloads open pages; have editors save their work first. If recovery reports preserved files, stop further restore attempts and have the administrator inspect the server recovery log.

To exchange signed synchronization packages, administrators must configure the same private `SYNC_SIGNING_KEY` on both compatible installations. This setting is separate from sign-in secrets. Conflicting edits are presented for explicit review before any import is applied. See [Synchronization](synchronization.md).

For deployment details and current verification limits, see [the technical readiness notes](../design/production_readiness.md).

Appearance preset choices now survive reloading this browser. Saved workspace colors apply to the Default preset. Primary action buttons adjust their text for contrast. Empty personal spaces show zero pages rather than stopping the application, and image libraries work with shortened team/project addresses.

Restoring a page version saves a recovery checkpoint and reloads everyone viewing that page. Save current work before restoring. GitLab lists load all matching result pages within the request limit; if the result is too large or the provider fails, narrow the filter and retry.

The completed checks include 113 frontend tests, the full backend suite at 63.9% coverage, and browser checks in a separate test workspace. Bidirectional synchronization and multiple API processes are implemented and tested for 2–5 editors. Final deployment checks depend on the external services you configure.

Accepted collaborative edits also persist the readable page used for sharing, export, and keyword search. Closing a page before its later background save no longer leaves those views stuck on the previous content.

Team and project portal pages preserve names containing quotes and other punctuation.
