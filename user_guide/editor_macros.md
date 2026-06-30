# User Guide: Rich Editor Blocks & Macros

Arkollab includes powerful widgets to structure, format, and annotate your documentation content. This guide covers how to insert and configure all active macro blocks and inline elements.

---

## ➕ Inserting Macros & Managing Favorites (The Plus Dialog)

To keep the editing toolbar clean and focused, Arkollab groups all document macros, widgets, and layout sections into a single, organized **Insert Macro** dialog. You can access all blocks from this dialog and pin/favorite your most frequently used macros directly to the formatting toolbar.

### How to Open the Insert Dialog
1. In the editor toolbar, locate the **`+` (Plus icon)**. The plus button is always visible.
2. Click the plus button to open the **Insert Macro or Block** dialog.

### Browsing Categories
The Insert Dialog is divided into 5 vertical tabs on the left:
1.  **Text & Lists**: Basic formatting blocks, lists, code panels, lorem ipsum debugging generator, and special symbol insertions.
2.  **Layout & Media**: Equal-width columns (2 or 3 columns), asymmetric grid layouts (70/30 or 30/70), image uploads, and data tables.
3.  **Callouts & Details**: Beautiful colored information, tip, warning, note, error, or checkmark panels, and collapsible boxes.
4.  **Task & Status**: Actionable checklist lists, inline status indicators, and date deadline pills.
5.  **Advanced Macros**: Table of Contents, children listings, alphabetical directories, page attachments, and page excerpt widgets.
### Searching Macros
- **Search Bar**: A search input is located at the top of the dialog. Type any term (e.g., `table` or `color`) to find matching macros immediately by name or description.
- **Global Search Layout**: When you type a search query, the vertical tabs sidebar temporarily collapses to present a full-width grid of search results matching globally. Clearing the search query instantly restores the category vertical tabs.

### Pinning Favorites to the Toolbar
- **Pin a Macro**: Open the Insert Dialog, find the macro card you want to keep handy, and click the **Star icon** on the right side of the card. The macro icon will instantly appear in your editor toolbar.
- **Unpin a Macro**: Click the star icon again to unpin it from the toolbar.
- **Persistence**: Your favorites list is saved directly in your web browser, ensuring it persists across page reloads.
- **Responsive Width Hiding**: If you favorite a large number of macros, Arkollab will automatically hide overflowing icons when the browser window is narrowed, ensuring the toolbar never wraps or breaks page layouts.

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
* **User Assignment Shortcuts**: Type **`@`** while editing a task line to trigger the team user autocomplete popup. Use the arrow keys or mouse to select a user (e.g. `@dev_admin`) and press **`Enter`** to assign it.
* **Due Date Shortcuts**: Type **`//`** anywhere on a task line to instantly create an inline date pill and automatically trigger the calendar dropdown to select a due date.

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
3. Type **`//`** anywhere in your editor document to insert a date pill instantly.

### How to Customize
1. **Instant Calendar Popup**: When you type **`//`** or insert a date pill, the browser's native calendar selector automatically pops up, allowing you to select a date immediately without additional clicks.
2. **Click the date badge**: If you need to change the date later, click the date badge. A calendar popover will open and trigger the picker.
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

The Page Index macro generates a dynamic directory of all pages in the current workspace space, with flexible filtering, grouping, and sorting capabilities.

### How to Insert
1. Type **`/index`** or **`/directory`** and press **`Enter`** (or select **Page Index** from the slash command menu).
2. A Page Index macro block is inserted.

### Edit Mode vs. Read Mode
* **Edit Mode**: The page directory list is hidden to prevent canvas clutter. Instead, a clean placeholder box shows a summary of the macro's active configuration (Filters, Grouping, and Sorting).
* **Read Mode**: Renders the dynamic directory list of pages according to the configured parameters.

### Configuration Settings
Click the **Gear icon** in the top-right corner of the macro box in edit mode to open the settings popover:
* **Filter by Tag(s)**: Multi-select dropdown to filter pages by one or more attached tags. If no tags are selected, all pages are listed.
* **Group By**: 
  - **None (Flat List)**: Renders all matching pages in a clean, unified grid of cards.
  - **Tags**: Groups matching pages into distinct tag-colored cards. Pages with multiple tags will appear under each corresponding group, and pages with no tags will appear under an "Untagged" section.
* **Sort By**:
  - **Name (Alphabetical)**: Orders pages alphabetically by title.
  - **Last Updated**: Orders pages descending by their last modification timestamp (most recently updated first).

### How to Navigate
* **Instant Navigation**: Click on any page title in the directory lists to navigate directly to it.
* **Delete Macro**: In edit mode, click the **Trash icon** in the top-right corner of the macro box.

---

## ↕️ Text Alignment Options

You can customize the alignment of paragraphs and headings within the document.

### How to Align Text
1. Click inside the paragraph or heading you want to align.
2. In the editor formatting toolbar, click on one of the alignment buttons:
   * **Align Left** (default)
   * **Align Center**
   * **Align Right**
3. The paragraph or heading is aligned instantly, and the change is synchronized with other users.

---

## 📝 Lorem Ipsum Paragraph Generator (Debugging Macro)

For debugging, layout testing, or placeholder copywriting, you can insert multi-paragraph placeholder text instantly.

### How to Use the Lorem Generator
1. Type **`/lorem`** and press **`Enter`**.
2. A premium placeholder generator dialog will open.
3. Select how many paragraphs you want to generate (**1 to 5 paragraphs**).
4. Click **Insert** to place the lorem ipsum text at your current cursor selection.

---

## 📄 Markdown Import Macro

The Markdown Import macro allows you to easily paste raw Markdown text and choose how to handle it in your document.

### How to Insert the Markdown Import Macro
1. On an empty line, type **`/markdown`** or **`/paste`** and press **`Enter`**.
2. Alternatively, click the **`+` (Plus icon)** in the formatting toolbar, go to the **Advanced Macros** tab, and select **Markdown Import**.

### How to Use
* **Import to Document**: Paste your Markdown text into the text box and click **Import to Document**. The Markdown will be instantly parsed to rich HTML, inserted directly into the editor canvas as native document elements (headings, bullet points, code blocks, etc.), and the macro block will delete itself.
* **Keep as Block**: Paste your Markdown text and click **Keep as Block**. The macro will parse and render the formatted Markdown inside a styled panel, retaining the raw Markdown inside the block.
* **Edit Kept Block**: If you kept it as a block, hover over the block in edit mode and click **Edit Markdown** to update the raw text at any time.

---

## 🎨 Draw.io Diagram Macro

The Draw.io Diagram macro embeds an offline vector drawing canvas directly inside your document. It enables you to create and edit flowcharts, wireframes, network topology diagrams, and database schemas with a full suite of shape libraries.

### How to Insert
1. On an empty line, type **`/drawio`** or **`/diagram`** and press **`Enter`** (or select **Draw.io Diagram** from the slash command menu).
2. An empty Draw.io diagram placeholder card is inserted.

### Drawing and Editing
1. **Launch Editor**: Double-click the placeholder card, or hover over the block and click **Edit Diagram** to open the fullscreen Draw.io workspace.
2. **Offline Mode**: The editor runs in a fullscreen sandboxed frame using the embed API, saving data entirely client-side.
3. **Saving Changes**: Click **Save** in the top-right corner of the editor to export the diagram. The editor will automatically convert the drawing into a vector SVG and save the underlying XML diagram nodes to the document.
4. **Exiting**: Click **Exit** to discard unsaved changes and return to the document.

### Theme Configuration
Click the **Gear icon** in the top-right corner of the block in edit mode to adjust the **Diagram Theme**:
* **Auto (Follow System)**: Matches the editor theme and background wrapper to the user's host application theme (light or dark).
* **Light**: Forces a white canvas background (`#ffffff`) and loads the Draw.io editor in light theme.
* **Dark**: Forces a dark canvas background (`#1e1e1e`) and loads the Draw.io editor in dark theme (automatically drawing shapes and text in white/light colors).

### Fullscreen Preview (Lightbox)
* In **Read mode**, clicking anywhere on the Draw.io diagram opens a full-screen high-fidelity lightbox preview.
* The preview viewport background matches the selected diagram theme and features a subtle drop shadow to maximize legibility. Click anywhere on the preview to exit the lightbox.

---

## ✏️ Excalidraw Sketching Macro

The Excalidraw macro embeds a local hand-drawn style whiteboarding canvas. It is perfect for drawing quick sketches, mind maps, mockups, or scribbling notes.

### How to Insert
1. Type **`/excalidraw`** or **`/sketch`** and press **`Enter`** (or select **Excalidraw Diagram** from the slash command menu).
2. An empty Excalidraw sketching card is inserted.

### Sketching and Editing
1. **Launch Editor**: Double-click the card or click **Edit Sketch** to open the fullscreen Excalidraw editor modal.
2. **Local Component**: The editor runs 100% locally with high performance and zero network dependencies.
3. **Saving Changes**: Click **Save & Close** to export. The editor compiles the sketch nodes and exports them to a vector SVG, storing both the elements array and the raw SVG vector markup in the document.
4. **Cancelling**: Click **Cancel** to exit without saving.

### Theme Configuration
Click the **Gear icon** in the top-right corner of the block in edit mode to configure the **Sketch Theme** (Auto, Light, or Dark). This synchronizes the Excalidraw whiteboarding palette scheme and sets the card background color dynamically.

### Fullscreen Preview (Lightbox)
* In **Read mode**, click the Excalidraw sketch to launch the fullscreen lightbox preview. Click again anywhere on the screen to close it.

---

## 🧬 Mermaid.js Diagramming Macro

The Mermaid macro compiles textual diagram definitions (like flowcharts, sequence diagrams, state diagrams, or Gantt charts) into live vector drawings.

### How to Insert
1. Type **`/mermaid`** and press **`Enter`** (or select **Mermaid Diagram** from the slash command menu).
2. A split-panel Mermaid editor block is inserted with default flowchart code.

### Writing Code & Real-time Compilation
1. **Edit Code**: Type or paste any valid Mermaid diagram syntax in the left text panel.
2. **Live Compiler**: As you type, the right panel compiles the syntax in real time with a 500ms debounce.
3. **Syntax Errors**: If the compiler encounters a syntax error, a red error alert details the mistake, keeping the previous valid SVG render intact.
4. **Finish Editing**: Click **Exit Editor** (or press escape) to hide the code editor panel. The block collapses to render only the compiled vector SVG drawing.
