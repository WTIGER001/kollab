# Technical Implementation

Kollab uses a React and Tiptap client, a Go API, PostgreSQL with pgvector, and a shared uploads filesystem. The standard deployment places multiple API replicas behind Caddy. This project explains the contracts connecting those components and points to the source modules that implement them.

## Reading order

1. [Architecture walkthrough](page:architecture) explains the deployment and request paths.
2. [Document model and macro contracts](page:document-model) explains the persisted editor tree.
3. [Consistency, recovery, and synchronization](page:consistency) follows an edit through persistence and recovery.
4. Browse the source-linked design references for subsystem details.

```kollab
{"type":"calloutPanel","attrs":{"type":"note","title":"Implementation versus design intent"},"content":[{"type":"paragraph","content":[{"type":"text","text":"The curated walkthroughs describe the current code. Imported design references also retain planned architecture where the source says so. Treat API handlers, migrations, and registered editor extensions as the authority when a historical design section differs from the running build."}]}]}
```

## Design directory

```kollab
{"type":"macroBlock","attrs":{"type":"children-display","config":{"depth":"all","sortBy":"title","sortOrder":"asc","displayType":"titles","layoutStyle":"bullets"}}}
```
