# Arkollab Feature Roadmap & Todo List

This document organizes the requested features into prioritized, sequential implementation phases based on architectural dependency, visual impact, and engineering complexity.

---

## 🗺️ Prioritized Implementation Phases

### 📋 Phase 1: Rich Editor Blocks & Callouts (Tiptap UI)
*Focuses on enriching the inline editing experience with customizable widgets and blocks. These require minimal backend changes.*
- [x] **Status (Badge)**: Communicates status of a project, task, or milestone with visual pills.
- [x] **Info/Note/Tip/Warning Panels**: Customizable colored message panels (Blue, Yellow, Green, Red) to highlight tips, warnings, or summaries.
- [x] **Expand (Expandable Box)**: Embeds expandable/collapsible details section into documents.
- [x] **Task List**: Interactive checkboxes (`Tiptap TaskList` extension) for actionable items.
- [x] **Date Selector**: Inline date element selector widget.
- [x] **Symbol Picker**: Picker to insert special characters and symbols.
- [x] **No Format Panel**: Renders code or unformatted text in a monospace block.

### 🌳 Phase 2: Page Architecture & Hierarchy
*Enables structural organization and navigation as the page count grows.*
- [x] **Table of Contents**: Auto-generated ToC based on the page's headings hierarchy.
- [x] **Breadcrumbs**: Top header indicator showing parent page ancestors (`Home > Engineering > Wiki`).
- [x] **Move Page (Hierarchical)**: Drag-and-drop or select dialog to re-parent pages in the directory.
- [x] **Trash / Undelete**: Soft-delete database query and a "Trash bin" sidebar view to restore documents.
- [x] **Children Display**: Automatic index block listing child pages under the current document.
- [x] **Page Index**: Alphabetical index of all pages within the active project.

### 📎 Phase 3: Assets & Collaboration (Mentions & Files)
*Enriches collaboration by tying media files and team identity to pages.*
- [x] **Attachments**: List of files uploaded to the page with download/preview triggers.
- [ ] **Multimedia (Widget Connector)**: Embed audio, video, or iframe widgets (YouTube, Vimeo, PDF presentation viewer) (Consolidated in Phase 7).
- [ ] **Image Gallery**: Grid gallery view of all image attachments on the page (Consolidated in Phase 7).
- [x] **Mentions & Tagging**: Tiptap suggestions menu triggered by `@` to tag registered team members/emails.
- [ ] **Watch**: "Watch" page toggle to subscribe to email or feed alerts on edit.

### 🏷️ Phase 4: Organization, Labels & Space Activity
*Introduces tagging, metadata categorization, and audit logs.*
- [ ] **Page Restrictions**: Read/write permissions per page (owner, team, or project level RBAC) (Consolidated in Phase 7).
- [ ] **Labels List / Popular Labels**: Tag pages with labels, search by labels, and view label heatmaps.
- [ ] **Content by Label / Reports**: Custom report macros pulling pages that share specific labels.
- [ ] **Activity Page / Recently Updated**: Dashboard timeline feed displaying global edits across pages.
- [ ] **Contributors Summary**: Listing authors, edit counts, and profile avatars.

### 📥 Phase 5: Import, Export & Archival
- [x] **Export to Word / PDF**: Client/Server side export wrappers via ChromeDP/docx-builder.
- [x] **Export to HTML / JSON**: Schema download and hierarchical JSON import/export.
- [ ] **Backup / Restore**: Database seed extraction and import tools for space migration (Consolidated in Phase 7).

### 🔗 Phase 6: Integrations & Space Metrics
*Advanced widgets connecting Arkollab to external tools and analytics.*
- [ ] **Jira Issues Embed**: Direct OAuth/API integration to paste and render live Jira issue statuses (Consolidated in Phase 7).
- [ ] **Jira Charts**: Render charts from Jira filters on requirements pages.
- [ ] **Advanced Roadmaps for Jira**: Embed epic roadmaps in planning pages.
- [ ] **Dashboard / Metrics View**: Graphs tracking document popularity, space creation speed, and active user trends.
- [ ] **SAML / External RBAC**: Single-Sign-On configuration for enterprise user mapping.

---

## 📖 Feature Reference Manual (Confluence Style Specs)

### Advanced Roadmaps for Jira in Confluence
Embed an Advanced Roadmaps for Jira plan in a page for others to view.

### Anchor
Creates an anchor inside the page, which can be hyperlinked.

### Attachments
Creates a list of attachments belonging to this page.

### Blog Posts
View, summarize or list the most recent blog posts in the space.

### Change History
Shows the history of version comments for the current page or blog posts.

### Chart
Display a chart.

### Children Display
List all the children of a page (and possibly their children).

### Code Block
Macro to format blocks of source-code or XML.

### Column
Defines a column on the page. (Must be used within a Section macro.)

### Content by Label
List pages and posts with the labels you enter.

### Content by User
List all the content created by a particular user.

### Content Report Table
Provides a content report in table format, based on labels.

### Contributors
Displays a list of contributors to a page, its hierarchy or selected spaces, or watches of these pages.

### Contributors Summary
Displays a summary of contributions to a page, its hierarchy or selected spaces, in tabular form.

### Create from template
Embed a button in your content which enables users to create content from any pre-defined template.

### Create Space Button
Displays a create space icon that links to the create space page.

### Excerpt
Mark a section of a page as an excerpt for page summaries.

### Excerpt Include
Include the excerpt from one page within another page.

### Expand
Embeds an expandable text box into your page.

### Favorite Pages
Lists your favorite pages.

### Gallery
Creates a thumbnail gallery from a page's attachments.

### Global Reports
Displays a list of links to global reports.

### Include Page
Include the excerpt from one page within another page.

### Info
Highlights content as an informational note with a blue background.

### Jira
Embed Jira issues or filters into your status reports, release notes, requirements or specifications.

### Jira Charts
Display Jira information on your page as a chart.

### Labels List
Renders the list of all labels or labels for a specific space sorted alphabetical.

### Livesearch
Embeds a search box into your Confluence page to show search results as you type.

### Multimedia
Insert audio and video files that are attached to any page.

### Navigation Map
Creates a map of pages associated with a specified label.

### No Format
Displays text in monospace font within a panel, with no other formatting applied.

### Note
Highlights content as a note with a yellow background.

### Office Excel
Inserts Microsoft Excel content into the page.

### Office Powerpoint
Inserts an interactive Microsoft Powerpoint presentation into the page.

### Office Word
Inserts Microsoft Word content into the page.

### Page Index
Creates a dynamic index of all pages within the space. Supports tag filtering, alphabetical or tag-based grouping, and sorting by name or last updated. Hides the list in edit mode for a clean canvas.

### Page properties
Enter a table of summary information in this macro and display it on another page using a Page Properties Report macro. You will need to add a label to this page and specify it in the report macro.

### Page properties report
Display a table of pages that contain the Page Properties macro and a specific label. The table includes a link to each page and the summary information contained in the Page Properties macro(s) on that page.

### Page Tree
Renders a page tree.

### Page Tree Search
Provides a search box that searches a hierarchy of pages (Page Tree) from a specified root page.

### Panel
Displays a block of text within a customizable panel.

### PDF
Inserts a PDF document into the page as an interactive presentation.

### Popular Labels
Generates a list or 'heatmap' of the most popular labels.

### Profile picture
Displays a user's profile picture.

### Recently Updated
Lists the most recently changed content within Confluence.

### Recently Updated Dashboard
Displays recent updates with filtering options. Used on the dashboard.

### Recently Used Labels
List the labels that have been used recently.

### Related Labels
Lists labels used on other pages that have labels in common with the current page.

### Roadmap Planner
Create a simple, visual roadmap for planning projects, software releases and more.

### RSS Feed
Retrieve a remote RSS feed and summarise it in the page.

### Section
Defines a section on a page, which can contain one or more Column macros.

### Shared Links Bookmarklet Button
Share a link from anywhere by dragging this button to your browser.

### Space attachments
Displays a list of attachments in a space.

### Spaces List
Displays a list of the spaces on this wiki.

### Status
Communicate the status of a project, task or milestone with visual indicators.

### Table of Content Zone
Creates a Table of Contents for headings within the body of the macro.

### Table of Contents
Creates a Table of Contents for the current page based on headings in the page.

### Task report
Create a report of tasks from specific locations, people, status and more.

### Team Calendars
Embeds any number of Events, People or Jira calendars into Confluence content.

### Tip
Highlights content as a helpful tip with a green background.

### User List
Displays a list of Confluence users based on group membership.

### User Profile
Displays a user's profile details.

### Warning
Highlights content as a warning note with a red background.

### Widget Connector
Embed videos, slideshows, posts, and more from the web.

### JIRA --> KOLLAB
Create a way to grab a JIRA ISSUE, and extract the contents into a Kollab page. We do this to maintain the knowledge management capture for what was found and solved. This means that we really tend not to care about the issue metadata, more the description, contents and attachments. Care should be taken to make this cohesive.

---

## 🚀 Phase 7: Enterprise Permissions, Integrations & Previews (New Tasks)

This phase covers the newly requested requirements, ordered logically by engineering dependencies (Security/Search -> Previews/UI -> Integrations/Backups -> Sync).

### 🔐 7.1 Revisit Permissions (go-permissions Refactor)
- [x] **Prefix Built-in Role IDs**: Update standard roles in `object_std_role.go` and `permissions.go` to use the `builtin.` prefix (e.g. `builtin.wiki.document.viewer`).
- [x] **In-Memory Startup Seeding**: Refactor role initialization to register standard roles using `Service.AddBuiltInRole` entirely in memory (zero DB seeding).
- [x] **Server, Team, and Project Roles**: Ensure clear hierarchy:
  - **Server Admin**: `builtin.admin` synthetic role (full bypass).
  - **Team Admin**: `builtin.wiki.team.owner` / `builtin.wiki.team.manager` roles.
  - **Project Admin**: `builtin.wiki.project.owner` / `builtin.wiki.project.manager` roles.
  - **Page Level Permissions**: Strict read/write page-level rules.
- [x] **Clean Up Codebase**: Update test fixtures, evaluator logic, database check filters, and HTTP handlers to match.

### 🔍 7.2 Secure Search & AI LLM RAG
- [x] **Permissions Filtering in Site-Wide Search**: Update `SearchDocuments` and database query logic to only return documents for which the current user has `wiki.document.read` permissions.
- [x] **Secure AI LLM RAG**: Ensure prompt context generation (retrieval of vector snippets or search results) validates permissions for the querying user, filtering out restricted contents.
- [x] **Site-wide Cross-Project Search**: Allow searching across all projects/teams that the user has permission to access.

### 🖥️ 7.3 Extended Document Previews & Media Players
- [x] **Excel Preview Conversion**: Add `.xlsx` and `.xls` support to `isOfficeFile` in Go attachment service to queue them to `media-preview` service for HTML conversion.
- [x] **Plain Text / Code File Preview**: Render `.go`, `.js`, `.py`, `.json`, `.txt`, `.md`, `.css`, `.yaml`, `.xml` files inline using client-side pre/Monaco editor syntax preview.
- [x] **CSV Grid Previews**: Implement client-side parser to render `.csv` files as interactive HTML spreadsheet grid tables.
- [x] **Video File Support**: Embed HTML5 `<video>` player in `DocumentPreviewer` to support playing `.mp4`, `.webm`, `.mov`, `.ogg`.
- [x] **Audio File Support**: Embed HTML5 `<audio>` player in `DocumentPreviewer` to support playing `.mp3`, `.wav`, `.m4a`, `.ogg`.

### 🖼️ 7.4 Image Gallery View
- [x] **Image Grid Macro**: Create a block/macro widget in Tiptap/ProseMirror that queries and renders a grid thumbnail gallery of all image attachments on the page.
- [x] **Lightbox Carousel**: Allow clicking any thumbnail in the gallery to open a fullscreen lightbox carousel/slideshow.

### 🔌 7.5 JIRA & GitLab Issues Integration
- [x] **Jira Issues Macro**: Implement Tiptap block/button to paste a Jira URL/ID and render a live card.
- [x] **Jira to Kollab Description/Attachment Import**: Add a direct button on the issue card to import the description and download all attachments of a Jira issue to create a new Kollab wiki page.
- [x] **GitLab Issues Macro**: Implement GitLab issues embed support and GitLab-to-Kollab description/attachment import.

### 💾 7.6 Backups & On-Demand Exports
- [x] **Server Backup/Restore API**: Endpoint to package/zip the entire PostgreSQL database seed (pg_dump or json seed) and uploads directory.
- [x] **Team & Project Exports**: On-demand exports of entire Teams and Projects (including pages, attachments, settings, and structure) into a portable ZIP package.

### 🔄 7.7 Diff-Based Synchronization (Air-Gap Sync)
- [x] **Transaction Log / History Table**: Add a database log/audit table to track every create, update, delete operation with timestamps and payload.
- [x] **Export Sync Payload**: Endpoint to generate an encrypted/compressed incremental ZIP file of all changes since a specific timestamp or transaction ID.
- [x] **Import Sync Payload**: Endpoint on target server (in the air-gapped network) to consume the sync ZIP, verify signature, apply database diffs, and save attachments.