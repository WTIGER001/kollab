# Kollab handbook and capabilities demonstration

This maintained example builds a **Kollab** team with **71 pages** in three projects: **Features**, **Technical Implementation**, and **Training & Workshops**. It includes 20 macroBlock variants, native editor layouts and inline controls, Mermaid diagrams, indexed properties, tags, comments, an assigned task, named checkpoints, reusable templates, an image library asset, and a **22-slide editable PowerPoint with instructor notes**.

## Import the handbook into your current server

Use **`dist/kollab-handbook-team.zip`** in **Server Settings → Backup & sync → Team & project transfer**.

1. Select the team transfer ZIP and check the preview: **71 pages, 3 projects, 5 files**.
2. Choose the new team name and abbreviation. Use different values if Kollab already exists.
3. Select an existing local owner. Map the illustrative `kollab-demo` author to a local account if desired; unmapped authors fall back to the owner.
4. Review the access settings and choose **Create team & import**.
5. Open the imported team and its Features, Technical Implementation, and Training & Workshops projects.

This additive import creates a new team with new IDs and rewrites included page/media links. Existing spaces and accounts remain intact. No demo password is needed. Source permission exceptions are not transferred; imported pages inherit destination access. A later import creates another copy rather than updating the previous team. Task assignee text and references outside the package may need adjustment.

**Do not select `kollab-handbook.zip` on the team/project transfer page.** That older filename is the separate full-server backup. Selecting it produces `unexpected ZIP entry` because it contains `database_seed.json` and `uploads/`, while the transfer format requires `scope.json` and `files/`.

## Optional full-server recovery rehearsal

`dist/kollab-handbook.zip` remains available for **Upload & Restore Backup ZIP** on a fresh, disposable installation with a matching schema and local authentication (`AUTH_MODE=local`). **Full-server restore replaces destination data, uploads, and accounts.** Afterward, sign in as `kollab-demo` using `dist/credentials.txt`. Each build generates a new private password. These credentials apply only to full-server restore.

All generated ZIPs and credentials remain in ignored `dist/`; editable source and the presentation remain in Git. The full-server ZIP contains a password hash and is private recovery material. The team ZIP excludes account credentials and installation configuration.

Download the [PowerPoint](assets/Kollab%20Capabilities.pptx) directly, or find it on **Training & Workshops → Capabilities PowerPoint and instructor notes** after import. Office preview needs the preview service; original file download does not. The [instructor guide](generated/instructor-guide.md) is also attached to that page.

## Maintain the content

- [catalog.json](catalog.json) defines the team, projects, and included reference documents.
- [pages/](pages/) holds curated walkthroughs and exercises in Markdown.
- [user_guide/](../../user_guide/README.md) and [design/](../../design/README.md) supply maintained reference pages.
- [slides.json](slides.json) holds slide text, teaching notes, and source references.
- [build.mjs](build.mjs) converts Markdown and native macro directives into editor JSON.
- [build-slides.mjs](build-slides.mjs) builds and validates the PowerPoint using the installed presentation runtime.
- [generated/CONTENTS.md](generated/CONTENTS.md) lists every page and the editor-node inventory.
- [generated/manifest.json](generated/manifest.json) records source hashes and attachment hashes.

Use a `kollab` fenced code block to embed a real Tiptap node. Use a `mermaid` fence for a live Mermaid macro. Normal Markdown becomes native headings, paragraphs, lists, tables, and code blocks. The builder resolves `[text](page:source-key)` links and `id:source-key` excerpt targets using deterministic UUIDs. Keep source keys stable when renaming titles.

Edits to a restored demonstration instance do not write back to Git. Copy intentional changes to these source files and rebuild. Preserve participants' practice pages separately before replacing a rehearsal instance.

## Regenerate pages and verify their schema

Requirements: Node.js, the frontend's installed dependencies (`npm ci` in `frontend/` when needed), Go, and a working Docker daemon for archive verification. Commands below start in the repository root.

```sh
node examples/kollab-team/build.mjs
cd frontend
npm exec -- vitest run src/editor/showcase.test.ts
```

The schema test checks the real editor extensions, internal links, excerpt references, attachment ownership, indexed properties, and input hashes. It rejects stale generated content. The checked-in PowerPoint can be reused when slide source has not changed.

## Rebuild the PowerPoint when slide content changes

Use the bundled presentation runtime discovered by the Codex workspace-dependencies tool. Set these paths for the installed runtime; do not install replacement packages into the bundle:

```sh
export RUNTIME_NODE_MODULES=/absolute/path/to/runtime/node/node_modules
export PRESENTATIONS_SKILL_DIR=/absolute/path/to/presentations/skills/presentations
export RUNTIME_PYTHON=/absolute/path/to/runtime/python/bin/python3
/absolute/path/to/runtime/node/bin/node examples/kollab-team/build-slides.mjs
node examples/kollab-team/build.mjs
```

The script writes the editable deck, a rendered cover image, and the instructor guide. It retains individual slide PNGs and validation reports in ignored `.build/` directories. Review every slide after changing layout or content; automated package checks do not replace visual review. Then regenerate content so its asset hashes match the new files.

## Build and verify both ZIPs

From `api/`, run:

```sh
KOLLAB_SHOWCASE_OUTPUT="$(cd ../examples/kollab-team && pwd)/dist" \
  go test ./internal/http/handler -run '^TestKollabShowcaseArchive$' -count=1
```

The test always creates its own disposable PostgreSQL container. It never accepts a database connection string. It initializes the actual schema and permission roles, inserts authored data, exports through the production handler, changes the disposable target, restores through the production handler, and compares all exported tables and upload hashes. It also verifies the restored administrator password and role. It then exports the complete team through the production transfer handler, previews and imports it as a new team, re-exports it, and compares record counts and file hashes while checking that the original team and local accounts remain intact. A failed verification does not publish replacement archives. The output includes `kollab-handbook-team.zip`, the separate `kollab-handbook.zip`, private full-server credentials, and checksums for both ZIPs.

For the complete backend regression and coverage check, from `api/`:

```sh
go test -coverpkg=./... -coverprofile=coverage.out ./...
go tool cover -func=coverage.out | grep total
```

## Compatibility and limitations

The team transfer serializer uses `kollab.scope.v1` and requires the new team/project importer. The separate full-server serializer uses `kollab.database.v2`; its table set and migration version/checksums must match the target. Rebuild after schema changes. Do not manually alter migration checksums to bypass full-server restore validation.

The archive includes illustrative training comments, tasks, dates, and version checkpoints. Fixed September 2026 dates remain source-controlled examples; adapt them before scheduling a real course. Blank GitLab, AI, Draw.io, and Excalidraw blocks are explicitly labeled setup exercises. No live integration results are fabricated. Historical design references retain their planned sections and carry a design-status notice.

See [user restore instructions](../../user_guide/kollab_handbook.md) and [technical build design](../../design/kollab_handbook.md).
