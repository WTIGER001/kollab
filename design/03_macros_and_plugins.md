# Technical Design: Macros, Plugins, and Integrations

This document specifies the architecture, schemas, and rendering behaviors for Kollab's native rich content extensions, advanced macro plugins, and third-party integrations (like GitLab).

---

## 1. Native Rich Content Macros

> [!NOTE]
> **Status:** 🟢 Completed

### 1.1 Callout Panels
Container blocks styled based on their type to call out notes, tips, warnings, error messages, success checks, or info alerts.
- **Node Type**: `calloutPanel` (Group: `block`)
- **Attributes**: `type` (e.g. `"info"`, `"warning"`), `title`
- **Tag Renderer**: `["div", { "data-type": "callout-panel", "data-callout-type": HTMLAttributes.type, "data-callout-title": HTMLAttributes.title }, 0]`

### 1.2 Inline Status Badges
Inline markers within paragraphs to indicate states (TODO, APPROVED, BLOCKED).
- **Node Type**: `inlineStatus` (Group: `inline`, `atom: true`)
- **Attributes**: `text`, `color`

### 1.3 Task Lists
Checkable list items.
- **Extension**: `@tiptap/extension-task-list` and `@tiptap/extension-task-item`
- **Attributes**: `checked` (boolean)

### 1.4 Expandable Accordions (Details/Summary)
Collapsible accordions leveraging HTML5 `<details>` and `<summary>`.
- **Node Types**: `details`, `detailsSummary`, `detailsContent`
- **Toggling Interaction**: Implemented using a custom ProseMirror `Plugin` capturing click events on `<summary>` to set `open` attributes.

### 1.5 Inline Date Selector Pills
- **Attribute**: `date` (string `YYYY-MM-DD`)
- **React Node View**: Rendered as an inline chip wrapping a `<Calendar>` icon. Clicking anchors an MUI `Popover` displaying `<input type="date">`.

### 1.6 No Format Panels
Plain unformatted text in a monospace block, ignoring standard typographic marks.
- **Node Type**: `noFormat` (Code: `true`, Marks: `""`)

### 1.7 Cards Grid & Tabbed Containers
- **Cards Grid**: Renders a responsive grid of modular cards using CSS Grid (`auto-fill`).
- **Tabs**: Segments long blocks of content into an interactive Tab Panel component, managing display via CSS `opacity` and `position`.

### 1.8 Hierarchical Macros (Children Display & Page Index)
Dynamically render lists of document structures within the active workspace/space.
- **Node Type**: `macroBlock` (Attributes: `type`, `config`)
- **Children Display**: Renders a nested bulleted directory tree.
- **Page Index**: Renders a multi-column responsive index grid of subpages grouped by letter.

### 1.9 Macro Organizer Dialog
A dynamic, user-configurable macros dialog that allows users to pin and unpin formatting elements into a local-storage synchronized favorites toolbar.

### 1.10 Image Gallery & Shared Media Library
A dedicated macro and storage mechanism for managing visual assets across the platform.
- **Image Gallery Macro**: A block widget that automatically queries and renders a responsive grid of thumbnail images attached to the current page. Clicking any thumbnail opens a fullscreen lightbox carousel.
- **Shared Media Library**: A centralized asset picker allowing users to browse and embed images from a shared repository. Libraries are scoped to three levels:
  1. **System Library**: Global assets available across all workspaces (e.g., company logos, standard icons).
  2. **Team Library**: Assets shared among all projects within a specific team.
  3. **Project Library**: Assets uploaded and scoped exclusively to a single project.

### 1.11 Smart Links (Mentions & External Links)
A smart inline extension for creating resilient internal page references and clearly indicating external exits.
- **Node Type**: `smartLink` (Group: `inline`, `atom: true`)
- **Internal Links (Mentions)**: Authors can type `@` or use a search dialog to link to another Kollab page. The document AST stores the target's `document_id` rather than a hardcoded URL. During rendering, the system dynamically resolves the target's current title and slug. This guarantees the link text and routing URL automatically update even if the target page is moved or renamed.
- **External Links**: When a user pastes or creates a standard link to an external domain (e.g., `https://google.com`), the editor automatically appends a subtle "External Link" icon (`↗`) to the text, signaling to readers that the link leads outside the Kollab workspace.

### 1.12 Draw.io Diagram Macro
A fully integrated, offline vector drawing canvas allowing users to embed flowcharts, wireframes, and schemas directly in the document.
- **Implementation**: Renders via `MacroBlockView` (type `"drawio"`).
- **Editor Integration**: Opens a sandboxed `iframe` pointing to the Draw.io embed API (`embed.diagrams.net`) when double-clicked.
- **Theme Awareness**: Dynamically injects `ui=atlas` and toggles the `dark=1` or `dark=0` URL query parameters based on the host Kollab theme configuration.

### 1.13 Markdown Import Macro
Allows users to paste raw Markdown text or upload a local `.md` file, which is then parsed and injected directly into the document AST, or kept within a distinct block to maintain the raw markdown.
- **Node Type**: `markdown-paste`
- **Features**: Supports file uploads via native `<input type="file">` to read local files client-side without creating server attachments.

---

## 2. Advanced Plugin Macros

> [!NOTE]
> **Status:** ⚪ Planned

### 2.1 Polyglot Code Blocks
Offers a premium developer experience with line numbering, selective line highlighting, and multi-language auto-detection using `Highlight.js`.
- **Node Type**: `codeBlock` (overrides standard)
- **Attributes**: `language`, `showLineNumbers`, `highlightedLines`

### 2.2 Smart Tables (Table Enhancer)
Extends Tiptap's native table functionality to support spreadsheet-lite capabilities.
- **Attributes**: `stickyHeader`, `rowNumbering`, `columnTotals`
- **Rendering Engine**: Uses CSS for headers/numbering and a debounced ProseMirror plugin for calculating `tfoot` totals.

### 2.3 Interactive Tooltips
Allows authors to attach rich, hoverable tooltips to any inline text.
- **Node Type**: `mark` (`tooltip`)
- **Attributes**: `content`, `position`

### 2.4 Content Lifecycle Manager (Governance Workflows)
Tracks page freshness and automates review cycles.
- **Database**: `freshness_policy_days` and `review_status` on `documents`.
- **Workflow**: Go cron job marks pages as `stale` and notifies owners.

### 2.5 Data Tables, Chart Editor & CSV Tools
Transforms standard HTML tables within the document into interactive data-grid applications.
- **Node Type**: `dataTableViewer`
- **Chart Editor UI**: A visual builder modal that allows users to select X/Y axes, toggle between Line/Bar/Pie chart types, and adjust data colors dynamically without touching code. Utilizes `Recharts` for the front-end rendering layer.
- **CSV Import / Export**:
  - **Import**: Users can click "Import CSV" on a blank table macro to parse a `.csv` file and automatically hydrate the ProseMirror table AST.
  - **Export**: Viewers can click an "Export to CSV" button on any data table or chart widget to download the underlying dataset instantly.

### 2.6 Geospatial Map Viewer (Future Roadmap)
A highly advanced macro designed for plotting and visualizing geospatial data.
- **Node Type**: `geoMapViewer`
- **Map Editor UI**: A dedicated full-screen builder modal where users can manually drop pins, draw polygons, or upload a GeoJSON file to overlay coordinates.
- **Rendering Engine**: Utilizes libraries such as `Leaflet` or `Mapbox GL JS` to render interactive, zoomable maps. Data points can be configured to display popups with rich text when clicked.

### 2.7 Page Properties & Properties Rollup (Report)
Equivalents to Confluence's "Page Properties" and "Page Properties Report" macros, designed to extract and aggregate metadata across multiple spaces.
- **Page Properties Macro (`pageProperties`)**: A block macro where authors define a hidden or visible table of key-value pairs (e.g., `Owner: Jane`, `Status: Pending`). The backend parses this node upon saving and indexes the key-value pairs in a dedicated `document_properties` PostgreSQL table.
- **Properties Rollup Macro (`pagePropertiesRollup`)**: A reporting macro that queries the `document_properties` table (along with tags and ILIKE search patterns) to generate a dynamic, sortable dashboard table aggregating the properties from multiple pages across the workspace.

### 2.8 Rich Layout & Storytelling Macros
A suite of interactive layout tools designed to transform standard documentation into engaging, landing-page quality content.
- **Action Buttons & Styled Links**: A block macro to insert call-to-action links with customizable visual styles. Authors can choose to render links as:
  - **Standard Buttons**: Solid or outlined buttons with text (e.g., "Submit Ticket").
  - **Icon Buttons**: Circular or square buttons displaying only a standard icon (e.g., a Github or Slack logo).
  - **Icons with Labels**: A hybrid button pairing a leading icon with text.
- **Hero / Banner Sections**: A premium, full-width container macro specifically designed for team homepages or campaign hubs. It features extensive customization:
  - **Core Content**: 
    - `Color Controls`: Native color pickers to customize the font color of the Title and Subtitle, automatically overriding default editor typography.
    - `Primary CTA`: An action button to drive user engagement. Supports optional subtitle text below the main label (e.g. "Get Started \n Free for 30 days"). The button will automatically hide if the label field is left blank.
    - `Secondary CTA`: An optional secondary ghost button.
  - **Backgrounds & Overlays**:
    - `Background Image`: Users can choose from a dropdown of images (including optimized formats like AVIF) uploaded as page attachments, which generates a direct download URL (`/api/attachments/:id`), or manually enter a custom external URL.
    - `Legibility Scrim`: When an image is used, authors can enable a semi-transparent dark overlay to ensure text remains readable regardless of image complexity.
    - `Gradients`: Fallback to theme-aware linear or radial gradients if no image is provided.
  - **Layout & Alignment**: 
    - `Size Variants`: Toggle between massive full-screen blocks or smaller banner strips.
    - `Text Alignment`: Granular control over the content block's vertical and horizontal alignment (e.g., Top-Left, Center-Middle, Bottom-Right).
- **Cards / Panels**: Interactive tile layouts for grouping content or surfacing child-pages in a responsive grid.
- **Content Slider / Carousel**: An interactive block that allows readers to swipe or click through multiple panels of content (text or images) sequentially, maximizing space on the page.
- **Organizational Chart**: A visual builder that automatically generates a hierarchical org chart from a simple text list or CSV upload, making it easy to map out team structures on HR or team pages.
- **Horizontal Divider**: A simple stylistic `<hr>` block with adjustable weight and colors to cleanly separate sections of a document.
- **Section Formatting (Backgrounds & Shadows)**: A layout container macro that allows authors to wrap any standard content (text, lists, tables) in a stylized box. Users can apply background colors (inheriting from the Workspace Style Guide), adjust internal padding, and add drop-shadow elevations for clear visual separation.

### 2.9 Audio & Video Media Players
Native macro support for streaming external embeds and direct file uploads.
- **External Video/Audio**: A macro that takes a URL from platforms like YouTube, Vimeo, Spotify, or SoundCloud, parsing it into a responsive, embedded `iframe` player without requiring raw HTML.
- **Native Uploaded Video**: A block macro that leverages the backend's FFmpeg transcoding service to stream user-uploaded `.mp4` or `.mov` files directly within the page layout using standard HTML5 video controls.
- **Native Uploaded Audio**: A lightweight inline or block audio player for `.mp3` or `.wav` files, ideal for embedding meeting recordings or voice memos.

---

## 3. External Integrations: GitLab

> [!NOTE]
> **Status:** 🟢 Completed

To securely interface with GitLab (SaaS and self-hosted), Kollab implements a layered **Connections Manager**.

### 3.1 Connection Scopes
1. **System Level**: Available to all workspaces.
2. **Workspace Level**: Available to all projects within the workspace.
3. **Project Level**: Scoped tightly to a single project.
4. **Personal Level**: Only visible and usable by the creator.

### 3.2 Macro Snapshot & Caching Mechanism
- **Snapshotting**: When a user creates a macro linking to GitLab, the backend fetches the data and creates a JSON payload embedded in the document's Yjs state.
- **Auto-Update (TTL)**: Macros have a Time-To-Live. On expiry, the frontend triggers a background sync to fetch fresh data.
- **Graceful Degradation**: If GitLab is down, the macro displays a warning but continues rendering the previous snapshot.

### 3.3 Suggested GitLab Macros
1. **Issue / Work Item Block**: Embeds a single issue.
2. **Merge Request (MR) Card**: Tracks code changes, CI/CD status, and conflicts.
3. **Pipeline Status**: Live indicator of a repository's CI state.
4. **Epic / Roadmap Tracker**: Tracks high-level initiatives with progress bars.
5. **Issue List / Board View**: Dynamic table of multiple issues using JQL.
6. **Code Snippet / File Embed**: Pulls live source code directly from a repository.
7. **Deployment Environment Status**: Monitors where code is deployed.
8. **Vulnerability Summary**: Security overview.

### 3.4 Remote Markdown Embed (Read-Only Mirror)
For bridging documentation hosted in a code repository (like a `README.md`) into a Kollab space, we utilize a read-only mirror macro.
- **Node Type**: `remoteMarkdownViewer`
- **How it works**: A user inserts the macro and provides the URL or path to a markdown file from GitHub or GitLab.
- **Rendering Engine**: The backend fetches the raw markdown file via the provider's API, converts the markdown into the ProseMirror AST, and renders it inside a protected, read-only block container within the page.
- **Caching & Sync**: The macro utilizes the standard Snapshot TTL mechanism. It checks for upstream updates on a schedule (or can be triggered via repository webhooks), ensuring the Kollab page is always displaying the latest codebase documentation without manual intervention.

---

## 4. External Integrations: Jira

> [!NOTE]
> **Status:** 🟢 Completed

Kollab implements the identical Connections Manager and Snapshot caching system for Jira (Cloud and Data Center) as it does for GitLab.

### 4.1 Suggested Jira Macros
1. **Jira Issue / Ticket Block**: Embeds a single Jira issue displaying its summary, status, assignee, and priority.
2. **Jira Issue List (JQL Filter)**: Renders a dynamic table of issues based on a provided JQL query.
3. **Advanced Roadmaps for Jira**: Embeds epic roadmaps or Jira Plan timeline views directly into planning pages.
4. **Jira Charts**: Renders charts (e.g., Pie Chart, Created vs. Resolved) from saved Jira filters.
5. **Sprint Status / Board View**: Embeds a live Kanban or Scrum board summary from an active sprint.

---

## 5. Comprehensive Macro Reference

> [!NOTE]
> **Status:** ⚪ Planned

The following is a formalized index of the remaining "long tail" macros designed to provide full feature parity with legacy enterprise wikis.

### 5.1 Project Planning & Timelines
*   **Team Calendars**: Embeds Events, People, or Jira calendars directly into the canvas.
*   **Roadmap Planner (Visual Builder)**: Renders a visual roadmap and Gantt chart for planning projects and software releases. Instead of requiring users to write raw JSON or text to define the timeline, this macro features an interactive, drag-and-drop Visual Builder UI. Users can visually add lanes, drag milestone markers, and extend timeline bars, which the system automatically serializes into the underlying AST.
*   **Task Report**: A cross-space aggregation of checked/unchecked task list items, filterable by assignee or location.

### 5.2 Content & Label Reporting
*   **Content by Label / Content by User**: Dynamic lists querying documents by specific tags or authors.
*   **Content Report Table**: Tabular view of content based on tags.
*   **Recently Updated Dashboard**: Live feed of recent edits, configurable by space.
*   **Popular / Recently Used / Related Labels**: Heatmaps and lists of tag metadata.
*   **Navigation Map**: Map of pages associated with a specific label.

### 5.3 Navigation & Page Structure
*   **Table of Contents (ToC) / ToC Zone**: Auto-generates anchor links from page headers.
*   **Page Tree / Page Tree Search**: Renders an interactive sidebar-style tree of child pages and a scoped search box.
*   **Anchor**: Hidden marker for deep-linking within a document.

### 5.4 Users & Social
*   **User Profile / Profile Picture**: Renders an avatar or full profile card of a teammate.
*   **User List**: Displays a directory of users based on group membership.
*   **Contributors / Contributors Summary**: Tabular breakdown of who edited a page and their commit frequency.
*   **Favorite Pages**: Dynamic list of the user's starred pages.
*   **Mentions List**: Renders a dynamic list of all documents mentioning a specific user.

### 5.5 Media, Office & Web Connectors
*   **Attachments / Space Attachments**: Auto-updating lists of files uploaded to the page or space.
*   **Widget Connector / Multimedia**: iFrame and oEmbed wrappers for external videos, slideshows, and web posts.
*   **Office & PDF Viewers**: Dedicated macros for embedding Excel, Word, PowerPoint, and PDF interactive previews.
*   **RSS Feed**: Remote RSS fetcher to summarize feeds directly in the page.

### 5.6 Diagramming & Sketching
*   **Draw.io Diagram**: Inserts an offline Draw.io vector drawing canvas for complex architecture diagrams. 🟢 **(Completed)**
*   **Excalidraw Diagram**: Inserts an offline Excalidraw sketching canvas for hand-drawn style whiteboarding.
*   **Mermaid Diagram**: Renders flowchart, sequence, and Gantt diagrams automatically from text definitions.
