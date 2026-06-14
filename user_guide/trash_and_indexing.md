# User Guide: Trash Bin & Page Hierarchy Indexes

This guide describes how to manage page deletions, restore pages from the trash, and organize your space using children directory and index macros.

---

## 🗑️ 1. Deleting Pages (Soft-Delete)

When you delete a page from the document actions menu:
- The page is **soft-deleted** (moved to the Trash Bin) instead of deleted immediately.
- **Cascading deletion**: Any sub-pages nested under the deleted page are also moved to the Trash Bin automatically to keep your workspace tree clean.
- Deleted pages are removed from the sidebar tree and will not appear in standard search results.

---

## 📥 2. The Trash Bin Page

To view and manage your deleted pages:
1. Click the **Trash Bin** button at the bottom of the sidebar.
2. This opens the dedicated Trash Bin page (with scoped URLs like `/teams/{teamId}/trash`, `/teams/{teamId}/p/{projectId}/trash`, or `/personal/trash`) listing all deleted documents in your active space, along with their deletion dates.
3. You can perform two actions:
   - **Restore (Rotate icon)**: Restores the page back into the active workspace.
   - **Delete Permanently (Trash icon)**: Hard-deletes the page and all its sub-pages permanently. *This action cannot be undone.*
4. To return to your active workspace, click the **Back arrow** button next to the Trash Bin header.

### Parent Restoration Rule (Orphaning Check)
If you restore a sub-page whose parent page is **still in the Trash Bin**, the system will automatically place the restored page at the **top level (root)** of your sidebar tree. This prevents the restored page from becoming a "ghost page" hidden from view.

---

## ⚠️ 3. Trash Warning Banner

If you visit a deleted page directly (for example, by clicking a link to it or using your browser history):
- A prominent warning banner appears at the top of the editor: **"This page is in the Trash Bin"**.
- The editor is locked in **Read-Only Mode** (you cannot edit or format the page).
- Quick actions are provided in the banner to either **Restore Page** or **Delete Permanently**.

---

## 📂 4. Children Display & Page Index Macros

You can embed dynamic directories and indexes directly in your documents using slash commands:

### Children Display
- **How to insert**: Type `/Children Display` in the editor and press Enter.
- **What it does**: Displays a real-time nested list of all sub-pages under the current document.
- Clicking any sub-page in the list navigates you directly to it. If you add, rename, or move sub-pages, this list updates automatically.

### Page Index (Directory)
- **How to insert**: Type `/Page Index` in the editor and press Enter.
- **What it does**: Creates an alphabetical (A-Z) index directory of all active pages in the current space.
- Pages are sorted and grouped under letter sections (e.g. A, B, C...). Clicking any page title instantly opens it.
