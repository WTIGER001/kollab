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
- [ ] **Children Display**: Automatic index block listing child pages under the current document.
- [ ] **Page Index**: Alphabetical index of all pages within the active project.

### 📎 Phase 3: Assets & Collaboration (Mentions & Files)
*Enriches collaboration by tying media files and team identity to pages.*
- [ ] **Attachments**: List of files uploaded to the page with download/preview triggers.
- [ ] **Multimedia (Widget Connector)**: Embed audio, video, or iframe widgets (YouTube, Vimeo, PDF presentation viewer).
- [ ] **Image Gallery**: Grid gallery view of all image attachments on the page.
- [ ] **Mentions & Tagging**: Tiptap suggestions menu triggered by `@` to tag registered team members/emails.
- [ ] **Watch**: "Watch" page toggle to subscribe to email or feed alerts on edit.

### 🏷️ Phase 4: Organization, Labels & Space Activity
*Introduces tagging, metadata categorization, and audit logs.*
- [ ] **Page Restrictions**: Read/write permissions per page (owner, team, or project level RBAC).
- [ ] **Labels List / Popular Labels**: Tag pages with labels, search by labels, and view label heatmaps.
- [ ] **Content by Label / Reports**: Custom report macros pulling pages that share specific labels.
- [ ] **Activity Page / Recently Updated**: Dashboard timeline feed displaying global edits across pages.
- [ ] **Contributors Summary**: Listing authors, edit counts, and profile avatars.

### 📥 Phase 5: Import, Export & Archival
- [ ] **Export to Word / PDF**: Client/Server side export wrappers.
- [ ] **Export to HTML / JSON**: Schema download options.
- [ ] **Backup / Restore**: Database seed extraction and import tools for space migration.

### 🔗 Phase 6: Integrations & Space Metrics
*Advanced widgets connecting Arkollab to external tools and analytics.*
- [ ] **Jira Issues Embed**: Direct OAuth/API integration to paste and render live Jira issue statuses.
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
Creates an index of all pages within the space. Excerpts from each page are included when there are less than 200 pages.

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