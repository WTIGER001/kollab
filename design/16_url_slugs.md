# URL Slugs & Aliases Design

This document details the architecture for custom page URLs (slugs) and legacy alias routing to prevent broken links in Project Kollab.

## 1. Database Schema
- **`slug` Column**: A new `VARCHAR(255) UNIQUE` column on the `documents` table stores the active slug.
- **`document_slug_aliases` Table**: When a document's slug is updated, the previous slug is preserved in this table, mapped to the original `document_id`.

## 2. Auto-Generation & Validation
- Slugs are generated dynamically during document creation using a regex substitution (e.g. `title.toLowerCase().replace(/[^a-z0-9]+/g, '-')`).
- If a collision occurs with an existing slug or alias, the backend auto-appends an incrementing numeric suffix (e.g. `-1`, `-2`).

## 3. Alias Redirection & Resolution
- The `GetByIDOrSlug` repository function attempts to find a document first by exact ID, then by active slug, and finally by alias history.
- When an API request resolves a document via an old alias, the handler responds with the `X-Kollab-Alias-Redirect`, `X-Kollab-Actual-Slug`, and `X-Kollab-Actual-Id` HTTP headers.
- The React Frontend automatically detects if the browser's URL address bar parameter (`docId`) differs from the successfully loaded document's active slug (or ID fallback), and triggers a seamless `window.history.replaceState()` to autocorrect the URL without a full page reload.

## 4. UI Settings
- A `<PageSettingsModal />` accessible from the document editor header allows authors to explicitly override the auto-generated slug.
- The UI debounces availability checks against the `GET /check-slug` endpoint to provide real-time validation feedback.
