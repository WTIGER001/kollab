# User Guide: Rich Editor Blocks & Macros

Arkollab includes powerful widgets to structure, format, and annotate your documentation content. This guide covers how to insert and configure all active macro blocks and inline elements.

---

## 🛈 Callout Panels (Info, Note, Tip, Warning, Error, Check)

Callout panels are beautifully colored message boxes featuring a distinct editable **Title** header and a rich-text **Message** area. They help highlight key takeaways, rules, warnings, errors, or success checkpoints.

### How to Insert a Callout Panel
1.  On an empty line, type **`/`** to open the command menu.
2.  Type the type of panel you want:
    *   `/info` (Blue Information box, Info icon)
    *   `/tip` (Green/Teal Tip box, Lightbulb icon)
    *   `/note` (Yellow/Orange Note box, File text icon)
    *   `/warning` (Yellow/Orange Warning box, Alert triangle icon)
    *   `/error` (Red Error box, Alert circle icon)
    *   `/check` (Green Success box, Checkmark icon)
3.  Press **`Enter`**. A styled block panel with the corresponding colors and icons is inserted.
4.  Alternatively, click the **Info icon** in the quick formatting toolbar.

### How to Use and Customize
*   **Title Header**: Click on the `Title...` placeholder area to type a bold title. In Read-Only mode, this title renders as a static heading (and is hidden completely if left blank).
*   **Message Body**: Click in the message area below the title to type freely. You can write paragraphs, lists, bold text, or other blocks *inside* the panel body.
*   **Change Panel Type**: Hover your mouse over the callout panel in Edit Mode. A small floating toolbar will appear in the top-right corner. Click on any style icon (Info, Warning, Error, Check, Note, Tip) to instantly transition the panel theme.
*   **Delete Panel**: Hover over the panel and click the **Trash icon** in the floating toolbar.

---

## 🏷️ Inline Status Badges

Status badges are colored pills that sit inline with your text. They are commonly used to indicate ticket states (e.g. `TO DO`, `APPROVED`, `BLOCKED`).

### How to Insert a Status Badge
1.  While typing a sentence, type **`/status`** and press **`Enter`**.
2.  Alternatively, click the **Smile icon** in the quick formatting toolbar.
3.  A status pill labeled `TODO` is inserted at your cursor position.

### How to Customize
1.  **Click the status badge**. A settings box will open.
2.  **Change label**: Type a new name inside the text field (e.g., `APPROVED`, `IN PROG`). The pill label adjusts as you type (limited to 16 characters).
3.  **Change color**: Click on any of the colored circle dots (Blue, Yellow, Green, Red, Gray) to change the badge theme.
4.  **Delete badge**: Click the **Trash icon** in the settings popover.
5.  **Collaborative updates**: When you modify a status badge, the name and color update instantly on all other active users' screens.

---

## ☑️ Task Lists (Checklists)

Task lists allow you to embed interactive checklists with clickable check boxes to track project action items.

### How to Insert a Task List
1. On an empty line, type **`/todo`** or **`/task`** and press **`Enter`**.
2. Alternatively, click the **Checklist icon** in the quick formatting toolbar.
3. A checkable list item is created. Press **`Enter`** to append a new checkable task line.

### How to Use
* **Checking Tasks**: Click on any checkbox to toggle its completed state. When checked, the task line text is automatically struck through and greyed out.
* **Nesting Tasks**: Press **`Tab`** on a task line to nest it under the previous task, creating sub-tasks. Press **`Shift + Tab`** to lift it back up.

---

## 🔽 Expandable Boxes (Details)

Expandable boxes are collapsible accordion panels that help hide long text blocks, logs, or optional details, keeping documents clean.

### How to Insert an Expandable Box
1. Type **`/expand`** or **`/details`** and press **`Enter`**.
2. Alternatively, click the **Chevron indicator icon** in the quick formatting toolbar.
3. A collapsible card is created with an editable summary header and a content block.

### How to Use
* **Title Header**: Click on the summary text line next to the arrow to type the accordion title.
* **Content Area**: Press **`Enter`** at the end of the title line to move your cursor into the details body, where you can type paragraphs, lists, or tables.
* **Collapse/Expand**: Click on the summary chevron/arrow to toggle the visibility of the details content block.

---

## 📅 Inline Date Selector Pills

Date pills are compact inline elements that help you select, display, and coordinate calendar deadlines within text lines.

### How to Insert a Date Pill
1. Type **`/date`** and press **`Enter`**.
2. Alternatively, click the **Calendar icon** in the quick formatting toolbar.
3. An inline date badge displaying today's date is inserted.

### How to Customize
1. **Click the date badge**. A calendar popover will open.
2. **Select Date**: Use the native calendar input to select a date. The pill text updates automatically.
3. **Delete Pill**: Click the **Trash icon** inside the calendar popover to remove the date.

---

## 🔣 Symbol Picker

The Symbol Picker lets you insert mathematical, currency, arrow, and special typographic symbols directly into the editor text.

### How to Insert a Symbol
1. Type **`/symbol`** to open the autocomplete menu, select it, and press **`Enter`**.
2. Alternatively, click the **Omega symbol icon (Ω)** in the quick formatting toolbar.
3. A grid displaying standard symbols (e.g. `→`, `≠`, `€`, `✔`, `★`) opens. Click any symbol to insert it at your cursor.

---

## 📄 No Format Panels

No Format panels render unformatted text in a monospace block, bypassing standard rich text configurations (perfect for log outputs, terminal scripts, or raw text blocks).

### How to Insert a No Format Panel
1. Type **`/noformat`** and press **`Enter`**.
2. Alternatively, click the **Terminal icon** in the quick formatting toolbar.
3. A grey monospace block is created. Text inside this block is always plain-text and ignores styling hotkeys (like `Cmd+B`).
4. Press **`Enter`** on a blank line inside the panel to escape it and resume standard paragraph typing.

---

## 📇 Table of Contents (ToC) Macro

The Table of Contents macro scans the headings (`H1`, `H2`, `H3`, `H4`) in your document and dynamically generates a clickable nested directory outline.

### How to Insert a Table of Contents
1. On an empty line, type **`/toc`** or **`/contents`** and press **`Enter`**.
2. A styled outline box is inserted. If the document already contains headings, they will immediately appear in the ToC tree.

### How to Use
* **Real-time Updates**: As co-authors create, edit, or delete headings, the Table of Contents dynamically redraws itself, ensuring the directory remains perfectly accurate.
* **Smooth-scroll Navigation**: Click any item in the Table of Contents outline. The editor viewport will smooth-scroll to center that heading, automatically offsetting for the sticky header toolbar.
* **Hierarchy Indentation**: Indents heading titles according to their tag hierarchy, aligning sub-sections under their parent titles.
* **Delete Outline**: In edit mode, hover over the Table of Contents block and click the **Trash icon** in the top-right corner.

---

## 📂 Children Display Macro

The Children Display macro automatically scans the workspace directory structure and inserts a dynamic nested list of all sub-pages nested under the active page.

### How to Insert
1. Type **`/children`** or **`/subpages`** and press **`Enter`**.
2. A macro block with a folder icon is created. If the document has sub-pages, they will be listed as clickable links.

### How to Use
* **Real-time Navigation**: Click any child page title in the list to navigate to that document immediately.
* **Auto-Syncing**: The macro dynamically checks for directory changes. Renaming sub-pages or creating new ones will refresh the child links in real time.
* **Delete Macro**: In edit mode, hover over the macro block and click the **Trash icon** in the top-right corner.

---

## 📇 Page Index Macro (Site Directory)

The Page Index macro generates a comprehensive, A-Z directory of all pages in the current workspace space.

### How to Insert
1. Type **`/index`** or **`/directory`** and press **`Enter`**.
2. An index card with a database file icon is inserted.

### How to Use
* **A-Z Columns**: The macro groups all pages in the current team/project space alphabetically by their first letter in a multi-column card layout.
* **Instant Navigation**: Click on any page title in the alphabetical lists to open it.
* **Delete Macro**: In edit mode, hover over the macro block and click the **Trash icon** in the top-right corner.
