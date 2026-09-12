# Workshop 1: Build a useful technical page

**Objective:** Create a page that another person can understand and act on without asking the author to explain the layout.

## Scenario

Your team needs a short guide for checking an attachment before a workshop. Create a child page in the Training & Workshops project named **Workshop preparation — your name**. This is exercise content; do not edit the generated source-of-truth pages when you want to preserve your practice work separately.

## Steps

1. Write a two-sentence introduction naming the attachment and the expected result.
2. Add headings for Preparation, Verification, and If something fails.
3. Insert an info callout with the required access and a warning about using a disposable restore target.
4. Add an inline status and an example date.
5. Create a task list with at least three useful checks.
6. Insert a small table comparing download and inline preview.
7. Add a link to the training materials page.
8. Add a Mermaid block explaining the verification sequence.
9. Save, switch to Read mode, and ask a partner to follow the page.

## Suggested diagram

```mermaid
flowchart LR
  Open[Open materials page] --> Download[Download PPTX]
  Download --> Verify[Open presentation]
  Verify --> Ready[Ready for workshop]
```

## Completion checklist

- [ ] The opening paragraph explains the task.
- [ ] Callouts describe real conditions rather than decoration.
- [ ] Tasks contain observable completion criteria.
- [ ] The internal link opens the correct page.
- [ ] The diagram agrees with the written steps.
- [ ] The page remains readable in light and dark modes.

## Debrief

Which block made the task easier? Which information belonged in plain prose? A capability demonstration is strongest when every macro has a purpose. Remove a block if its presence makes the page harder to use.
