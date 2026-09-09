# User Guide: Confluence Space Migration Wizard

This guide walks administrators and space owners through exporting spaces from Confluence and running the Kollab Confluence Migration Wizard.

---

## 1. Exporting a Space from Confluence

1. In Confluence, go to **Space Settings** > **Space Details** > **Export Space**.
2. Select **XML** (or **HTML**) export.
3. Include all attachments.
4. Download the generated `.zip` space export archive.

---

## 2. Running the Kollab Migration Wizard

1. Open Kollab and navigate to **Space Import** > **Confluence** (`/import/confluence`).
2. **Step 1: Select Backup File**: Browse for your Confluence `.zip` export file. Click **Next** to run a preflight check. The check lists the actual pages, attachment files, macros, unsafe archive entries, and links that need repair.
3. **Step 2: Destination**: Select a Team and one of its Projects. Pages are created in that selected project, so choose an existing project where you have permission to create pages.
4. **Step 3: Review and import**: Read the archive findings before you click **Start Confluence Migration**. Unsupported macros are kept as readable source text and broken internal links are shown in the audit list.
5. Click **🚀 Start Confluence Migration**.
6. **Step 4: Summary Report**: Compare **Pages Created** with the number found during preflight and review every warning before considering the move complete. Files referenced from a page through Confluence attachment markup are uploaded to that page automatically.

Kollab uses both exported folder/index pages and, where available, Confluence `entities.xml` data to recover page nesting. If a title is ambiguous, the page is imported safely and the summary tells you to review its placement.

If you retry the exact same archive in the same team or project, Kollab skips pages it already created and identifies them as skipped in the summary. A changed archive is treated as a new import and should be reviewed through preflight first.

## 3. What to check after the import

- Open several imported pages to check titles and converted callouts, expand sections, status badges, and code blocks.
- For HTML exports, a folder's `index.html`/`index.xhtml` page becomes the parent of pages in that folder. Confirm this recovered hierarchy in the target project; archives without directory index pages are imported as root-level pages.
- Repair each internal-link warning in the audit list. A warning means the referenced source page was not found in the uploaded archive.
- Referenced attachment files are copied to their imported page automatically. If an attachment is missing, too large, unreadable, or has the same filename as more than one archive file, the summary leaves it out and tells you what to repair before uploading a replacement.
- Data Center exports containing only `entities.xml` cannot be imported yet. Include XHTML/HTML page files in the archive.
