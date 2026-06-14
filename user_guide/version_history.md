# User Guide: Version History & Checkpoints

Arkollab automatically tracks page history and protects your work from accidental changes without cluttering your timeline with every single keystroke.

---

## ⏳ How Page Snapshots are Saved

The system creates page version backups automatically in the background based on three rules:
1.  **First Edit**: The first time you make a change to a new document, a snapshot is created.
2.  **Idle Threshold**: If you make edits and then pause for more than **5 minutes**, the next edit will trigger a new version snapshot.
3.  **User Handover**: If User A is editing a page and User B takes over editing, the system immediately captures a snapshot of User A's final state.

---

## 🏷️ Saving Custom Milestone Checkpoints

If you reach an important project milestone (e.g. "Approved Draft," "Final Q3 Plan") and want to explicitly save it in history:
1.  Click the **Clock/History icon** in the editor toolbar to open the **Version History panel** on the right side of the screen.
2.  In the text box labeled *"Create Milestone Checkpoint"*, type a short summary (e.g., `Final Review Draft`).
3.  Click **Save**.
4.  A new milestone version will appear in the timeline showing a purple tag.

---

## 👁️ Previewing Past Versions

To inspect what a page looked like in the past without modifying your active draft:
1.  Open the **Version History panel** by clicking the history icon in the editor toolbar.
2.  Scroll down the timeline and locate the version card you want to inspect.
3.  Click the **Preview** button on that card.
4.  The editor canvas will enter **Preview Mode**:
    *   A warning banner will appear at the top.
    *   The page becomes read-only and displays the text of the selected historical version.
    *   The page title will indicate that you are viewing a preview.
5.  To exit this view, click the **Exit Preview** button in the warning banner. Your live session remains active and unchanged.

---

## 🔄 Restoring a Past Version

If you need to discard recent changes and roll back to a previous state:
1.  While previewing the historical version (or directly from the version card in the timeline), click the **Restore** button.
2.  The editor will immediately revert to the selected version's content.
3.  This restoration is **collaborative**: because it runs through our sync pipeline, all other team members viewing the document will see the page update instantly on their screens.
4.  A new automatic version snapshot is captured just *before* the restore is executed, ensuring you can undo the rollback later if needed.
