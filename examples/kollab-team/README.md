# Kollab handbook and capabilities demonstration

This maintained example builds a **Kollab** team with **71 pages** in three projects: **Features**, **Technical Implementation**, and **Training & Workshops**. It includes 20 macroBlock variants, native editor layouts and inline controls, Mermaid diagrams, indexed properties, tags, comments, an assigned task, named checkpoints, reusable templates, an image library asset, and a **22-slide editable PowerPoint with instructor notes**.

## Restore the delivered archive

Use `dist/kollab-handbook.zip` in **Server Settings → Backup & sync → Upload & Restore Backup ZIP** on a fresh, disposable Kollab installation running the same compatible application schema. After restore, sign out and sign in as `kollab-demo` with the freshly generated password in `dist/credentials.txt`. The target must use local authentication mode (`AUTH_MODE=local`). Open the Kollab team and its project trees.

**This is a full-server archive. Restore replaces the destination's application data, uploaded files, and accounts. It does not merge a team into an existing workspace.** The current team/project backup service is a placeholder, so this package deliberately uses the implemented server restore contract. Never use a populated production server as a workshop target.

The archive is private recovery material. `dist/` is ignored by Git and contains the ZIP, its SHA-256 checksum, and the generated password. No production data, provider credentials, or shared fixed password appears in the maintained content. Each archive build creates a new random demo password. Share the password separately from the ZIP when handing it to an instructor.

Download the [PowerPoint](assets/Kollab%20Capabilities.pptx) directly, or find it on **Training & Workshops → Capabilities PowerPoint and instructor notes** after restore. Office preview needs the preview service; original file download does not. The [instructor guide](generated/instructor-guide.md) is also attached to that page.

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

## Build and verify a new restore ZIP

From `api/`, run:

```sh
KOLLAB_SHOWCASE_OUTPUT="$(cd ../examples/kollab-team && pwd)/dist" \
  go test ./internal/http/handler -run '^TestKollabShowcaseArchive$' -count=1
```

The test always creates its own disposable PostgreSQL container. It never accepts a database connection string. It initializes the actual schema and permission roles, inserts authored data, exports through the production handler, changes the disposable target, restores through the production handler, and compares all exported tables and upload hashes. It also verifies the restored administrator password and role. A failed verification does not publish a replacement archive.

For the complete backend regression and coverage check, from `api/`:

```sh
go test -coverpkg=./... -coverprofile=coverage.out ./...
go tool cover -func=coverage.out | grep total
```

## Compatibility and limitations

The database serializer uses `kollab.database.v2`; the table set and migration version/checksums must match the target. Rebuild after schema changes. Do not manually alter migration checksums to bypass restore validation.

The archive includes illustrative training comments, tasks, dates, and version checkpoints. Fixed September 2026 dates remain source-controlled examples; adapt them before scheduling a real course. Blank GitLab, AI, Draw.io, and Excalidraw blocks are explicitly labeled setup exercises. No live integration results are fabricated. Historical design references retain their planned sections and carry a design-status notice.

See [user restore instructions](../../user_guide/kollab_handbook.md) and [technical build design](../../design/kollab_handbook.md).
