# Reusable knowledge

Repeated text becomes expensive to maintain when every copy drifts independently. An excerpt identifies a specific reusable section; an excerpt-include points to that section by document ID and excerpt ID.

## Shared product description

The paragraph below comes from the excerpt on the team handbook page. It remains a reference to that page rather than a manually duplicated paragraph.

```kollab
{"type":"macroBlock","attrs":{"type":"excerpt-include","config":{"pageId":"id:welcome","excerptId":"kollab-purpose"}}}
```

## A reusable operating rule

```kollab
{"type":"excerpt","attrs":{"excerptId":"documentation-rule"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Every feature change updates both the user-facing guide and the technical design. The user guide explains the task and expected behavior. The design explains the implementation, contracts, and verification."}]}]}
```

This second excerpt is used by the maintenance page. Rename surrounding headings or add explanation without changing the stable excerpt ID if other pages rely on it.

## A retained Markdown block

```kollab
{"type":"macroBlock","attrs":{"type":"markdown-paste","config":{"isBlockMode":true,"markdown":"### Release-note writing pattern\n\n**Change:** Describe the behavior a reader can observe.\n\n**Use:** Explain where the control appears and who can use it.\n\n**Evidence:** Link the design and verification.\n\nKeep the raw Markdown when it is the format your team reviews in Git."}}}
```

A retained Markdown macro stores its raw text and renders it inside a block. Import-to-document converts it into native editor content instead. Use the form that matches how the team intends to maintain the text.

## Templates and snippets

The package also includes a team page template called **Technical decision** and a snippet called **Validation note**. Open the template library to inspect them. Templates start a new document; snippets insert reusable starting content. Neither makes later edits synchronize automatically with existing copies. Use an excerpt when you need a live reference.
