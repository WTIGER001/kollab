# Kollab handbook

This team is both a guide to Kollab and a working example of what a knowledge space can contain. Explore the feature guides, inspect the implementation, or follow the training course. Every demonstration describes what to try and what result to expect.

```kollab
{"type":"macroBlock","attrs":{"type":"hero","config":{"title":"Kollab","subtitle":"A shared home for knowledge, decisions, and technical work","layoutVariant":"banner","alignment":"Center-Left","titleColor":"var(--primary-contrast)","subtitleColor":"var(--primary-contrast)","primaryCtaLabel":"Explore Features","primaryCtaUrl":"page:features-home"}}}
```

## Choose a path

```kollab
{"type":"cardsGrid","attrs":{"cardSize":"md","showBorder":true},"content":[{"type":"cardItem","attrs":{"cardId":"features-card"},"content":[{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Features"}]},{"type":"paragraph","content":[{"type":"text","text":"Learn everyday workflows and try the macro demonstrations.","marks":[{"type":"link","attrs":{"href":"page:features-home"}}]}]}]},{"type":"cardItem","attrs":{"cardId":"technical-card"},"content":[{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Technical Implementation"}]},{"type":"paragraph","content":[{"type":"text","text":"Trace the browser, APIs, database, and recovery design.","marks":[{"type":"link","attrs":{"href":"page:technical-home"}}]}]}]},{"type":"cardItem","attrs":{"cardId":"training-card"},"content":[{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Training & Workshops"}]},{"type":"paragraph","content":[{"type":"text","text":"Download the PowerPoint and complete the guided exercises.","marks":[{"type":"link","attrs":{"href":"page:training-home"}}]}]}]}]}
```

## What this package demonstrates

```kollab
{"type":"excerpt","attrs":{"excerptId":"kollab-purpose"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Kollab organizes collaborative pages within personal spaces, teams, and projects. Rich editor blocks combine explanations with tasks, diagrams, reusable excerpts, structured properties, and attachments. Permissions and version history support controlled collaboration; administrators manage recovery and synchronization."}]}]}
```

This is a documentation and training snapshot, not a record of a real team's work. Sample comments, task assignments, calendar entries, and milestones exist to make the product behavior visible. No customer content, live integration credentials, or production activity is included.

## Availability and prerequisites

Core page authoring and the native macro examples use the restored data. Search enrichment and AI generation need a configured provider. GitLab macros need a trusted connection. Office previews need the preview service; the PowerPoint remains downloadable without it. The Draw.io editor loads its external embed service. Azure backup and Jira screens remain prototypes. Some older design documents describe future work; their pages identify them as design references rather than a guarantee that every proposed control is available.

## Keep the handbook current

The source catalog and demonstration pages live in `examples/kollab-team/`. Feature guides come from `user_guide/`; implementation references come from `design/`. Update those sources, regenerate the package, review the changes, and run the restore verification. Read [Maintaining this team](page:maintenance) for the complete workflow.
