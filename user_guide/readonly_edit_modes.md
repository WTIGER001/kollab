# Reading, Editing, and Page Analytics

To ensure an optimal viewing experience and protect documents from accidental edits, Kollab separates document interactions into a clean **Read-Only Mode** and a comprehensive **Edit Mode**.

---

## 1. Read-Only Mode (Default)

Whenever you open a page, it defaults to **Read-Only Mode**. 

* **Clean Presentation**: Helper guides, dashed columns, and block boundaries are hidden to provide a sleek, publishing-style reading view.
* **Locked Blocks**: Elements like Callout Panels, Inline Status Badges, and Inline Dates are locked against accidental changes or delete clicks.
* **Floating Bars Hidden**: Image alignment/size/delete controls, table and link controls, selection actions, and layout controls do not display.
* **Image preview**: Click an image to open it in a full-screen preview. Use the **+** and **−** controls or your trackpad/mouse wheel to zoom. When zoomed in, drag the image to pan; use **Reset view** to recenter it. Press `Esc` or select **Close** when you are finished.
* **Macros stay reader-friendly**: Pages, attachments, charts, calendars, diagrams, excerpts, reviews, and issue cards show their saved content without configuration fields, delete buttons, refresh controls, or import actions. Links, downloads, page navigation, and image/diagram previews remain available.
* **Breadcrumb Navigation**: The top-left corner displays your active location path: `[Team Workspace] > [Project Workspace] > [Parent Folders...] > [Active Document Name]`.

---

## 2. Edit Mode

To begin making changes to the document, click the **Edit** button in the top-right corner.

* **Editing Tools**: The rich-text formatting toolbar appears below the title, autocomplete slash commands (`/`) are activated, and structural borders (dashed guides) display.
* **Interactive Custom Nodes**:
  * **Callout Panels**: Hovering reveals a type selector tool (Info, Note, Tip, Warning) and a Delete button.
  * **Status Chips**: Clicking status chips opens a popover color palette and text-modifier menu.
  * **Date Pills**: Clicking date pills opens the popup calendar date-selector.
  * **Images**: Hovering or selecting images triggers alignment and sizing toolbars.
  * **Layouts**: Section borders appear with layout controls (2-Column, Asymmetric, delete section).
  * **Configured macros**: Macros show their edit header and settings. GitLab/Jira issue cards and lists expose their connection, refresh, column, reset, and import controls only here.
* **Handover & Handback**: Once you are finished, click the **Done** button in the top-right toolbar. You can provide a checkpoint description or skip the named checkpoint; background saving continues. See [Version history](version_history.md).

---

## 3. Page Analytics

In **Read-Only Mode**, click the **Analytics** button in the top-right toolbar to open the Page Analytics popover. This panel aggregates metadata from the document structure:

* **Basic Statistics**: Real-time count of total words, characters, active collaborators, and estimated reading time.
* **Content Composition Chart**: A horizontal bar chart detailing the structure of blocks inside the document (Paragraphs, Headings, Tables, Tasks, Callouts, Media, Chips).
* **Page Traffic (Last 7 Days)**: An interactive line graph charting views and unique visitors over the last week.

Editing requires page write access and waits for initial collaboration synchronization. Keep the page open if synchronization or saving fails. Ordinary reconnects merge local changes; a restore or administrative import reloads the page to use its authoritative state. Multiple API replicas support the same workflow.
