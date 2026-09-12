# Readiness checklist and answers

Use these questions at the end of the course. Participants should demonstrate the workflow where possible rather than recite feature names.

## Author readiness

- [ ] I can find a team, project, and child page.
- [ ] I can switch between Read and Edit modes.
- [ ] I can insert and configure a useful callout, task, table, and diagram.
- [ ] I can link a related page and reuse an excerpt.
- [ ] I can attach or download a file and explain preview prerequisites.

## Reviewer readiness

- [ ] I can leave a useful comment and inspect version history.
- [ ] I can distinguish page review state from a status badge.
- [ ] I can explain who may read and edit the page.
- [ ] I can identify the checkpoint I intend to restore.

## Administrator readiness

- [ ] I can explain that a full backup restore replaces application data and uploads.
- [ ] I can distinguish backup restore from signed air-gap synchronization.
- [ ] I can identify optional services and prototype integrations.
- [ ] I can find the source content and rebuild instructions for this handbook.

```kollab
{"type":"details","attrs":{"open":false},"content":[{"type":"detailsSummary","content":[{"type":"text","text":"Answer: Which file is our server backup?"}]},{"type":"detailsContent","content":[{"type":"paragraph","content":[{"type":"text","text":"A ZIP archive containing database_seed.json and uploaded files. The database JSON currently uses kollab.database.v2 and requires a matching schema and migration ledger."}]}]}]}
```

```kollab
{"type":"details","attrs":{"open":false},"content":[{"type":"detailsSummary","content":[{"type":"text","text":"Answer: Does a status badge approve a page?"}]},{"type":"detailsContent","content":[{"type":"paragraph","content":[{"type":"text","text":"No. A badge annotates the document. The content-review workflow stores page lifecycle state separately. Publishing also has its own version relationship."}]}]}]}
```

```kollab
{"type":"details","attrs":{"open":false},"content":[{"type":"detailsSummary","content":[{"type":"text","text":"Answer: Will restoring this team merge it into my current server?"}]},{"type":"detailsContent","content":[{"type":"paragraph","content":[{"type":"text","text":"Import kollab-handbook-team.zip through Team & project transfer to create a new team while retaining existing spaces and accounts. This does not update or merge an earlier copy of the team. The separate kollab-handbook.zip uses full-server restore and replaces destination data and accounts."}]}]}]}
```
