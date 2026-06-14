# User Guide: Version History & Checkpoints

Arkollab automatically tracks page history and protects your work from accidental changes without cluttering your timeline with every single keystroke.

---

## ⏳ How Page Snapshots are Saved

The system creates page version backups automatically in the background based on three rules:
1.  **First Edit**: The first time you make a change to a new document, a snapshot is created.
2.  **Idle Threshold**: If you make edits and pause for more than **5 minutes**, the next edit will trigger a new version snapshot.
3.  **User Handover**: If User A is editing a page and User B takes over editing, the system immediately captures a snapshot of User A's final state.

> [!NOTE]
> **Merged Snapshots**: To prevent timeline clutter and version number gaps, the system maintains exactly one active `"Auto-saved snapshot"` record per editing session. Subsequent background saves during the session overwrite this snapshot rather than creating new version cards.

---

## 💾 Finalizing Checkpoints with "Done" & AI Summaries

When you are finished editing a document and want to save your work:
1.  Click the **Done** button in the header toolbar.
2.  A **Save Version Checkpoint** dialog will appear. Here you can:
    -   **Provide a Description**: Type a summary of your changes.
    -   **Auto-generate using AI**: Click this button to have Gemini or OpenAI analyze your changes and automatically write a description for you.
    -   **Skip Checkpoint**: Exit edit mode without writing a description. The background auto-save remains as-is.
3.  Once saved, the `"Auto-saved snapshot"` for your session is finalized and renamed to your description.

---

## ⏰ Idle Session Timeouts

If you leave your editor tab open and inactive for **10 minutes** (no mouse movement, scrolling, typing, or clicking):
1.  The system automatically requests an AI summary of your changes.
2.  It appends `(Idle Timeout)` to the summary, saves your final checkpoint, and exits edit mode to free up the collaborative workspace.
3.  A notification dialog will inform you that you were checked out due to inactivity.

---

## 👁️ Previewing Past Versions

To inspect what a page looked like in the past without modifying your active draft:
1.  Open the **Version History panel** by clicking the history icon in the editor toolbar.
2.  Scroll down the timeline and locate the version card you want to inspect.
    -   **Redesigned Timeline Cards**: Cards prominently display the **version message or description** as the main bold title. The version number and creator username are displayed as muted metadata (e.g., `Version 2 • Edited by jbauer`).
3.  Click the **Preview** button on that card.
4.  The editor canvas will enter **Preview Mode**:
    -   A yellow warning banner will appear at the top showing the version description and number.
    -   The page becomes read-only and displays the text of the selected historical version.
5.  To exit this view, click the **Exit Preview** button in the warning banner. Your live session remains active and unchanged.

---

## 🔄 Restoring a Past Version

If you need to discard recent changes and roll back to a previous state:
1.  While previewing the historical version (or directly from the version card in the timeline), click the **Restore** button.
2.  The editor will immediately revert to the selected version's content.
3.  This restoration is **collaborative**: because it runs through our sync pipeline, all other team members viewing the document will see the page update instantly on their screens.
4.  A new automatic version snapshot is captured just *before* the restore is executed (labeled `"Snapshot before restore"`), ensuring you can undo the rollback later if needed.
