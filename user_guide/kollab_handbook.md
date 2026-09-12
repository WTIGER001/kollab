# Kollab handbook demonstration

The maintained handbook creates a **Kollab** team with three projects: **Features**, **Technical Implementation**, and **Training & Workshops**. Its 71 pages combine practical instructions, technical references, working macro examples, and guided exercises. A 22-slide PowerPoint with instructor notes is included as a page attachment.

## Import the demonstration team

1. Open **Server Settings → Backup & sync → Team & project transfer**.
2. Choose **`kollab-handbook-team.zip`**. The preview should show 71 pages, 3 projects, and 5 files.
3. Choose an unused team name and abbreviation and select an existing local owner.
4. Review the user mappings and access settings, then select **Create team & import**.
5. Open the new **Kollab** team. Start in **Features**, or open **Training & Workshops** to download the course materials.

The import adds a new team and preserves existing spaces and accounts. Continue using your current login; the team ZIP includes no account passwords. Each import creates a new copy, so it does not update an earlier imported team. Source permission exceptions are not retained, and pages inherit destination access. Review any task assignee text after importing.

If you see **unexpected ZIP entry**, check the filename. **`kollab-handbook.zip` is the separate full-server backup**; it belongs on **Upload & Restore Backup ZIP**, where it replaces destination application data, uploaded files, and accounts. Use that backup only on a fresh, disposable installation with compatible schema and local authentication. Its private `credentials.txt` applies only after full-server restore. See [Backups and restores](backups_and_restores.md).

## Explore the demonstrations

- **Rich authoring demonstration:** callouts, status and date pills, tasks, tabs, expandable details, columns, tables, and exact-text blocks.
- **Knowledge directory:** page indexes, tags, and a populated properties report.
- **Reusable knowledge:** excerpts, excerpt includes, retained Markdown, templates, and snippets.
- **Collaboration laboratory:** sample comment thread, assigned task, review state, and a named baseline checkpoint.
- **Architecture walkthrough:** editable Mermaid diagrams alongside technical explanations.
- **Training materials:** downloadable PowerPoint, instructor guide, and a reusable course-cover image.

Enter **Edit** to change a block or inspect its settings. Read mode still allows navigation through tabs and expandable sections. Try light and dark themes while reading; the examples use the application's existing themed controls.

GitLab and AI examples are clearly labeled setup exercises and require configuration. Draw.io loads an external editor. Office previews require the preview service, while original attachment download remains available. Azure backup and Jira remain prototypes.

## Keep it current

The source content lives in [examples/kollab-team](../examples/kollab-team/README.md). Update the maintained Markdown guides or design documents, update the curated demonstrations and slide source where needed, and rebuild the package. The generated page IDs remain stable while source keys remain unchanged.

Editing a restored demonstration does not update Git automatically. Copy intentional edits back into the source files before rebuilding. Workshop practice pages should be preserved separately before replacing an instance. Generated team/full-server ZIPs and passwords stay outside Git; editable source, the finished PowerPoint, and generated content stay in the repository.
