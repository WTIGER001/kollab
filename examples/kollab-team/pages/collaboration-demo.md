# Collaboration laboratory

Use this page to distinguish document content from the collaboration features around it. Status labels and tasks live in the editor tree. Comments, review state, and version records live in related server data.

## Assigned task

```kollab
{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Verify the training attachment and report whether it opens. Assignee: @kollab-demo. Contact: "},{"type":"mention","attrs":{"id":"kollab-demo-admin","username":"kollab-demo"}},{"type":"text","text":" Example due date: "},{"type":"inlineDate","attrs":{"date":"2026-09-19","autoOpen":false}}]}]}]}
```

This illustrative task belongs to the generated demo administrator. Check it in Edit mode and inspect the Tasks page. The date is sample content; set a current date when running a workshop.

## Content review

```kollab
{"type":"macroBlock","attrs":{"type":"content-review","config":{}}}
```

The page begins in **in review**. An authorized editor can change the review status. This server-backed state is separate from an inline status label: one governs the page, while the other simply annotates prose.

## Mention directory

```kollab
{"type":"macroBlock","attrs":{"type":"mentions-list","config":{"username":"kollab-demo","sortBy":"title"}}}
```

The directory should find this page because its document content mentions the demo user. Switch to Read mode to see the query results rather than the editing configuration.

## Comments and checkpoints

The page includes an example comment thread. Open Comments to read the question and response. They are labeled training examples and do not imply an actual review occurred. Add your own comment, then open History to find the **Training baseline** milestone.

## Two-person exercise

Sign in with two separately created workshop accounts that have access to this team. Open the same page and edit different paragraphs. Observe presence and the shared content. If a version restore occurs, reopen the page when the app reloads the editor. Do not use the demo administrator as a shared account in a real deployment.
