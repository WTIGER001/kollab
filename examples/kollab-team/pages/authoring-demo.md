# Rich authoring demonstration

A useful technical page mixes readable prose with small interactive elements. This page demonstrates native editor nodes in context. Read it first, then select **Edit** to inspect and modify the examples. Changes here are practice changes in the demonstration team.

```kollab
{"type":"tableOfContents"}
```

## Release readiness note

```kollab
{"type":"paragraph","content":[{"type":"text","text":"Exercise status: "},{"type":"inlineStatus","attrs":{"text":"IN REVIEW","color":"yellow"}},{"type":"text","text":" · Example review date: "},{"type":"inlineDate","attrs":{"date":"2026-09-12","autoOpen":false}}]}
```

The status pill is an editable label. It does not set the page's governance review state; the separate content-review macro does that. The date is an illustrative checkpoint for this training snapshot, not a live deadline.

```kollab
{"type":"calloutPanel","attrs":{"type":"info","title":"A self-contained handoff"},"content":[{"type":"paragraph","content":[{"type":"text","text":"A good handoff names the change, explains its effect, records validation, and gives readers a recovery path. Use a callout for the part someone must notice before acting."}]}]}
```

```kollab
{"type":"calloutPanel","attrs":{"type":"warning","title":"Full-server restore replaces data"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Practice archive restore only on a disposable installation. A page version restore affects one page; a full backup restore replaces the installation's application data and uploaded files."}]}]}
```

## A checkable preparation list

- [x] Read the change description.
- [ ] Update the status label to APPROVED.
- [ ] Add an explanation below the warning callout.
- [ ] Open the version history after saving your changes.

Checkboxes belong to the document. An assigned task also needs an explicit @username assignee; the [Collaboration laboratory](page:collaboration-demo) includes one.

## Author and reviewer perspectives

```kollab
{"type":"tabsContainer","attrs":{"activeTab":0,"showBorder":true},"content":[{"type":"tabItem","attrs":{"label":"Author","tabId":"author-perspective"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Lead with the problem and resulting behavior. Use a code block for an exact example and link the detailed design. Select Edit before changing this tab's content."}]}]},{"type":"tabItem","attrs":{"label":"Reviewer","tabId":"reviewer-perspective"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Check the claims against the implementation, inspect the validation evidence, and leave a comment where another reader may need context. Changing this visible tab in read mode is a navigation action."}]}]},{"type":"tabItem","attrs":{"label":"Operator","tabId":"operator-perspective"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Confirm the required services and schema version. Keep a current backup before replacement operations, and record the outcome after recovery."}]}]}]}
```

## Expandable explanation

```kollab
{"type":"details","attrs":{"open":false},"content":[{"type":"detailsSummary","content":[{"type":"text","text":"Why use a named milestone before a risky edit?"}]},{"type":"detailsContent","content":[{"type":"paragraph","content":[{"type":"text","text":"A named milestone gives the team an identifiable checkpoint. If an edit goes wrong, the history drawer lets you inspect the stored content before restoring. Restoration causes open editors to reload their state; it is an authoritative content change."}]}]}]}
```

## Two-column comparison

```kollab
{"type":"layoutSection","attrs":{"layout":"twocol"},"content":[{"type":"layoutColumn","content":[{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Reader"}]},{"type":"paragraph","content":[{"type":"text","text":"Scans headings, follows links, switches tabs, opens attachments, and expands optional detail."}]}]},{"type":"layoutColumn","content":[{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Editor"}]},{"type":"paragraph","content":[{"type":"text","text":"Changes the structured document using the toolbar, slash commands, and block settings. Access is enforced by the server."}]}]}]}
```

## Exact text and code

```json
{"type":"inlineStatus","attrs":{"text":"APPROVED","color":"green"}}
```

```kollab
{"type":"noFormatPanel","content":[{"type":"text","text":"GET /api/documents/{id}/export?format=json\nThis panel preserves exact text without interpreting Markdown."}]}
```

## A compact decision table

| Content | Recommended block | Reason |
| --- | --- | --- |
| Important condition | Callout | Separates the condition from surrounding prose |
| Optional explanation | Details | Keeps the main reading path concise |
| Parallel viewpoints | Tabs | Gives each audience a focused explanation |
| Exact payload | Code or no-format | Preserves syntax |
| Work to complete | Task list | Makes progress explicit |

## Try it

Select Edit, type `/` on an empty line, and search for a block by name. Use the macro organizer to browse available commands and pin favorites. Duplicate a small part of this page to experiment with layout without rewriting the explanation.
