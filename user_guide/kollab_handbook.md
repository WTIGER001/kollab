# Kollab handbook demonstration

The maintained handbook creates a **Kollab** team with three projects: **Features**, **Technical Implementation**, and **Training & Workshops**. Its 71 pages combine practical instructions, technical references, working macro examples, and guided exercises. A 22-slide PowerPoint with instructor notes is included as a page attachment.

## Restore a demonstration instance

1. Prepare a fresh, disposable Kollab installation with a compatible application schema and local account authentication.
2. Open **Server Settings → Backup & sync → Upload & Restore Backup ZIP**.
3. Choose the generated `kollab-handbook.zip`.
4. After restore, sign out and sign in as `kollab-demo` with the password supplied in the build's private `credentials.txt` file.
5. Open the **Kollab** team. Start in **Features**, or open **Training & Workshops** to download the course materials.

**This archive replaces the destination's application data, files, and accounts. It does not merge a team into your existing workspace.** Use a fresh instance for teaching. Follow [Backups and restores](backups_and_restores.md) for the full recovery procedure.

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

Editing a restored demonstration does not update Git automatically. Copy intentional edits back into the source files before rebuilding. Workshop practice pages should be preserved separately before replacing an instance. Generated backup ZIPs and passwords stay outside Git; editable source, the finished PowerPoint, and generated content stay in the repository.
