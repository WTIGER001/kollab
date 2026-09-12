# Kollab capabilities — instructor guide

## 1. Kollab

Introduce the course as a guided exploration of the restored Kollab team. The team includes Features, Technical Implementation, and Training & Workshops. This is sample documentation, not production data. Suggested duration: 60–75 minutes. Open the team handbook before starting.

Sources: `examples/kollab-team/pages/welcome.md`

## 2. The learning path

Ask participants which role they play: author, reviewer, administrator, or developer. Explain that the deck introduces a workflow, then the handbook provides the detailed instructions. Reserve time for the three workshops. Use the Features project to orient the audience.

Sources: `examples/kollab-team/pages/training-home.md`

## 3. Teams, projects, and pages

Show the Teams directory, open Kollab, and switch between its three projects. Expand a page tree. Explain personal spaces separately: they support an individual's content; this package demonstrates team and project scope. Avoid treating the hierarchy as the complete permissions model.

Sources: `user_guide/teams_directory.md`, `user_guide/project_portal.md`

## 4. Finding the right page

Open Knowledge directory and compare the page index with the Area properties report. The report has real indexed rows in the archive. Semantic search needs a compatible configured embedding provider; do not imply that search enrichment is always available. Have a participant find the recovery instructions.

Sources: `user_guide/search.md`, `examples/kollab-team/pages/knowledge-directory.md`

## 5. Reading and editing

Open Rich authoring demonstration. Switch between Read and Edit. Show slash-command discovery on an empty paragraph and dismiss it without changing the page. Explain that visible controls depend on access, and the server still enforces permissions.

Sources: `user_guide/readonly_edit_modes.md`, `user_guide/editor_macros.md`

## 6. Rich content with a purpose

Use the authoring demonstration page and explain why each block appears. Change an inline status label, then point out that this does not change the page's governance review state. Use one task checkbox. Status and date chips can be configured in Edit mode.

Sources: `examples/kollab-team/pages/authoring-demo.md`

## 7. Layouts for different reading paths

Expand the milestone explanation. Switch Author, Reviewer, and Operator tabs. Scroll to the two-column comparison. Ask whether each layout makes the page easier to use. Emphasize that plain prose remains appropriate for most explanations. Check narrow-screen readability if presenting mobile use.

Sources: `examples/kollab-team/pages/authoring-demo.md`, `user_guide/mobile.md`

## 8. Diagrams beside the explanation

Open Architecture walkthrough, then inspect a Mermaid block in Edit mode. Explain that the small source sample on this slide is illustrative. Draw.io loads an external editor; Excalidraw uses a bundled component. The integration-boundaries page has clearly labeled blank canvases for practice.

Sources: `examples/kollab-team/pages/architecture.md`, `frontend/src/components/MacroBlockView.tsx`

## 9. Reusable knowledge

Open Reusable knowledge and show the included product description from the team handbook. Compare it with the Technical decision template and Validation note snippet. Explain that a template is starting content and does not synchronize later edits into existing pages.

Sources: `examples/kollab-team/pages/reuse-demo.md`, `user_guide/templates.md`

## 10. Properties turn pages into a collection

Inspect the Area, Audience, and Availability properties on a feature page. Return to the report. The source document is authoritative; the normalized index makes cross-page queries practical. Ask participants to name a useful property for their own workspace.

Sources: `design/03_macros_and_plugins.md`, `api/internal/postgres/migrations/0004_document_properties.sql`

## 11. Files and presentations

Open the training materials page and download this PowerPoint. Show the Markdown instructor guide beside it. Office previews require the media-preview service; downloading does not depend on successful preview generation. Image libraries provide a separate workflow for reusable images.

Sources: `user_guide/attachments_and_previews.md`, `user_guide/image_library.md`

## 12. Collaborative work

Use separate workshop accounts for a two-person demonstration. Open the sample comment thread and identify it as illustrative. Show the task assigned to the demo administrator. Task extraction currently recognizes textual @username content; the sample includes that explicit assignee alongside a user mention. Avoid implying that one shared account demonstrates distinct user presence.

Sources: `examples/kollab-team/pages/collaboration-demo.md`, `api/internal/document/service.go`, `design/multi_instance_sync.md`

## 13. Review, publishing, and history

Explain the distinctions before demonstrating. Open the content-review block and History on Collaboration laboratory. Point to Training baseline. The sample review state is in review; it does not claim a real approval. Publishing and restoration are actions with separate effects; use a practice page for mutations.

Sources: `user_guide/content_reviews.md`, `user_guide/version_history.md`

## 14. Access follows the resource

Open the access guide. Explain that navigation visibility is not the security boundary. Show page restrictions only on a practice page. Sharing links are separate capabilities with their own scope and settings. Do not use the publicly known source content to infer that restored pages are anonymously readable.

Sources: `user_guide/page_access.md`, `design/26_confluence_style_permissions.md`

## 15. Choose the right recovery operation

Use kollab-handbook-team.zip on Team & project transfer to create a new team while preserving existing spaces and accounts. Select a local owner and review access. Reimport creates a new copy, not an update to the earlier team. The separate kollab-handbook.zip is a full-server recovery artifact for a fresh or intentionally disposable target. Air-gap sync merges tracked changes and requires conflict review.

Sources: `user_guide/backups_and_restores.md`, `user_guide/synchronization.md`

## 16. The team transfer package

This ZIP is for Team & project transfer. It includes the complete handbook and presentation but excludes account credentials, source permission grants, and installation settings. It creates a new team and rewrites included links. Continue using your existing account. The separate full-server kollab-handbook.zip contains database_seed.json and uploads; it belongs on the full-server restore screen and replaces destination data. ZIP extensions alone do not identify compatibility.

Sources: `api/internal/transfer/archive.go`, `api/internal/http/handler/transfer.go`, `design/scoped_transfers.md`

## 17. Application architecture

Switch to the full Mermaid architecture diagram in Technical Implementation. Follow one document read through the API to PostgreSQL, then an attachment read to uploads. The browser never connects directly to the database. Office conversion is an additional service, not part of the editor process.

Sources: `examples/kollab-team/pages/architecture.md`, `docker-compose.yml`

## 18. The editor's data contract

Open Document model and macro contracts. This minimal sample shows the storage shape, not a complete property example. Explain native container nodes versus atom macroBlock nodes. The showcase validates its generated documents against the actual editor schema so unsupported node names fail verification.

Sources: `frontend/src/editor/extensions/MacroBlock.ts`, `examples/kollab-team/pages/document-model.md`

## 19. Optional services and prototypes

State exactly which services are available in the workshop environment. No live provider credentials are included in this archive. Confluence archive migration is implemented, but a live Confluence embed is not exposed in the current UI. Do not treat historical design documents as evidence that planned controls are delivered.

Sources: `user_guide/jira_confluence_integrations.md`, `user_guide/production_readiness.md`, `frontend/src/components/MacroBlockView.tsx`

## 20. Guided practice

Open the three workshop pages in Training & Workshops. Participants can complete the first two without reading source code. Developers can use the third to trace a feature across layers. Encourage participants to create their own practice pages so generated source pages remain easy to compare with Git.

Sources: `examples/kollab-team/pages/workshop-authoring.md`, `examples/kollab-team/pages/workshop-recovery.md`, `examples/kollab-team/pages/workshop-technical.md`

## 21. Maintaining the handbook

Explain the one-way publication workflow. Editing an imported page does not update Git automatically. Copy intentional changes back to source. Source keys remain stable; each team import assigns new destination IDs and preserves existing spaces. Rebuild the deck and content, then run the real-database test to produce both ZIP formats. Generated archives and full-server credentials stay outside Git.

Sources: `examples/kollab-team/pages/maintenance.md`

## 22. Ready to use Kollab

Ask each participant to demonstrate one workflow from the readiness checklist. Suggested questions: Does a status badge approve a page? Does importing the team update an earlier copy? Which ZIP replaces server data? What service is required for Office previews? End by pointing to Features and Technical Implementation for continued learning.

Sources: `examples/kollab-team/pages/assessment.md`
