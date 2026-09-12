# Knowledge directory

A growing workspace needs several ways to find content. This page combines an alphabetical page index, a properties report, and a tag summary. Each serves a different reading task.

## Page index

Use the index when you know a page's name. The macro reads the active space and respects its available document list.

```kollab
{"type":"macroBlock","attrs":{"type":"page-index","config":{"sortBy":"name","groupBy":"none","filterTags":[]}}}
```

## Structured feature inventory

The feature pages carry a page-properties block with an Audience, Area, and Availability field. The builder populates the matching database index so this report works immediately after restore. Editing a page later rebuilds its properties through the normal save path.

```kollab
{"type":"macroBlock","attrs":{"type":"page-properties-report","config":{"key":"Area"}}}
```

## Labels

Tags describe themes that cross page hierarchies. This package labels pages with terms such as authoring, collaboration, operations, architecture, and training. The counts below come from restored metadata; they are not product-usage statistics.

```kollab
{"type":"macroBlock","attrs":{"type":"popular-labels","config":{"title":"Handbook labels","limit":20}}}
```

## Choosing the right tool

Search works across accessible content. A children-display block is useful for the chapters beneath a landing page. A page index helps browse a space alphabetically. A properties report supports a structured review, such as identifying pages in the same Area.
