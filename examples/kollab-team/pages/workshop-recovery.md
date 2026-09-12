# Workshop 2: Review and recover a change

**Objective:** Distinguish an annotation, a review decision, and a recovery operation.

## Prerequisites

Use a disposable workshop page with edit permission. A second participant is useful for comments and concurrent editing. Do not run a full-server restore during this exercise.

## Steps

1. Create a named milestone before editing.
2. Add a short paragraph with an intentional mistake.
3. Ask a partner to comment on the mistake.
4. Correct the paragraph and reply to the comment.
5. Insert a content-review macro and move the review state through the available workflow.
6. Inspect the named milestone in History. Compare its content with the current page.
7. If instructed, restore that page checkpoint and observe how open editors reload.

## Discussion

An inline APPROVED label is document content. A page review state is server metadata. Publishing records a particular version. Restoring a version changes current authoritative content. None of these actions is equivalent to restoring a complete server backup.

```kollab
{"type":"details","attrs":{"open":false},"content":[{"type":"detailsSummary","content":[{"type":"text","text":"Expected observation after a restore"}]},{"type":"detailsContent","content":[{"type":"paragraph","content":[{"type":"text","text":"The restored content becomes authoritative and open editors reload their state. The exercise should identify the intended page and checkpoint before confirming the action. A full-server restore would affect far more than this page and is outside this workshop."}]}]}]}
```

## Completion checklist

- [ ] A named checkpoint exists.
- [ ] A comment explains an observable problem.
- [ ] The correction addresses that problem.
- [ ] The participant can explain review state versus an inline status.
- [ ] The participant can explain page restore versus full-server restore.
