# Workshop 3: Trace an implementation

**Objective:** Follow a visible feature from its editor configuration through an API to its stored data.

## Feature to inspect: page properties

1. Open Knowledge directory and inspect the Area report.
2. Open a feature demonstration page in Edit mode and inspect its page-properties block.
3. Find the `page-properties` renderer in `frontend/src/components/MacroBlockView.tsx`.
4. Inspect the document save path and property extraction in `api/internal/document/`.
5. Read `api/internal/postgres/migrations/0004_document_properties.sql`.
6. Find the properties route in `api/internal/http/router.go`.
7. Change a property on your own practice page and check the report again.

## Questions to answer

- Which representation is authoritative: the macro JSON or the property index?
- Why does the index exist?
- What would happen if an archive included pages but omitted the derived property rows?
- Where should access checks occur?
- Which documentation files should change if the macro contract changes?

## Expected model

```mermaid
flowchart LR
  AST[Page macro JSON] --> Save[Document save service]
  Save --> Index[(Document properties)]
  Index --> Query[Authorized properties query]
  Query --> Report[Properties report macro]
```

The document JSON is the authoring source of truth. The index supports efficient queries across pages. The report consumes authorized results. Archive construction must account for the index because inserting rows directly does not execute every application service path.
