# Integration boundaries

Kollab's core rich-content examples can run from this restored workspace. Features that retrieve external data need their own provider or connection. This page gives instructors an honest way to explain those boundaries without manufacturing live results.

## GitLab

Configure a trusted connection in the appropriate settings scope, then insert an issue card or issue list and select that connection. Use a project or group the workshop participants may access. Never put the connection token in page content or in the backup source repository.

```kollab
{"type":"macroBlock","attrs":{"type":"gitlab-issue-list","config":{}}}
```

This deliberately unconfigured example demonstrates the setup state. No issue results are bundled, and no external account is contacted by the generator. A configured provider entry does not by itself prove that every proposed integration macro exists.

## AI-assisted writing

```kollab
{"type":"macroBlock","attrs":{"type":"ai-content","config":{"prompt":"Using the selected provider, draft a short checklist for reviewing a technical design. Separate observable behavior, permissions, persistence, and recovery."}}}
```

An administrator must configure a compatible provider before generation works. The prompt above is saved example input; this package contains no fabricated model output. Review any generated text against the code before publishing it.

## Visual diagram editors

Mermaid examples elsewhere in this team are complete, source-driven diagrams. Draw.io and Excalidraw provide visual editing options. The blank canvases below are intentional workshop starting points: select Edit and use their edit controls to make your own diagram.

```kollab
{"type":"macroBlock","attrs":{"type":"drawio","config":{"theme":"auto"}}}
```

The Draw.io editor loads the external diagrams.net embed service. Do not describe this editor-launch path as fully offline.

```kollab
{"type":"macroBlock","attrs":{"type":"excalidraw","config":{"theme":"auto","elements":[]}}}
```

Excalidraw uses a bundled component. Save a sketch to retain its editable elements and SVG preview in the page. These drawing exercises are optional; the technical explanations already have Mermaid diagrams.

## Features with limited availability

Azure backup and Jira screens are prototypes. Confluence archive migration is implemented; a live Confluence embed is not exposed in the current workspace UI. Office previews require the media-preview service. Keep these distinctions in the spoken demonstration as well as in the slides.
