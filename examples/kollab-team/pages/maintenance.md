# Maintaining this team

The source repository is the maintained edition of this handbook. The restored team is a browsable, editable snapshot. Changes made inside a running demonstration instance do not automatically write back to Git.

## Source locations

| Content | Source |
| --- | --- |
| Team, projects, reference selection | `examples/kollab-team/catalog.json` |
| Curated walkthroughs and exercises | `examples/kollab-team/pages/` |
| User-facing reference pages | `user_guide/` |
| Engineering reference pages | `design/` |
| PowerPoint content and speaker notes | `examples/kollab-team/slides.json` |
| Conversion and deterministic IDs | `examples/kollab-team/build.mjs` |
| PowerPoint layout | `examples/kollab-team/build-slides.mjs` |
| Restore verification and ZIP creation | `api/internal/http/handler/showcase_archive_test.go` |

## Documentation rule

```kollab
{"type":"macroBlock","attrs":{"type":"excerpt-include","config":{"pageId":"id:reuse-demo","excerptId":"documentation-rule"}}}
```

## Update workflow

1. Update the relevant guide or design document when a feature changes.
2. Update the walkthrough if its control names, macro schema, or expected behavior changed.
3. Update the slide content and notes when the teaching sequence needs the same correction.
4. Run the build and validation commands in the repository README for this package.
5. Review generated content and macro coverage in Git.
6. Run the real-database restore test and retain the new ZIP with its private credentials.
7. Restore to a fresh rehearsal instance and inspect the affected pages before teaching.

## Identity and compatibility

Keep stable source keys when renaming titles. The builder derives UUIDs from those keys, resolves page links, and records hashes of the source inputs. Migration checksums come from the actual application schema during archive construction. Rebuild after schema changes rather than editing the archive's migration ledger to bypass compatibility checks.

## What Git retains

Git retains editable source pages, the catalog, slide source, the finished PowerPoint, generated content, and a source manifest. It excludes private build directories, generated passwords, and full backup ZIPs. A backup includes an administrator password hash and should be handled as private recovery material.

## Capturing changes from a workshop

Copy intentional edits back into the appropriate source file and rebuild. Keep participants' practice pages in their own workspace or export them before replacing an instance. Rebuilding this archive does not perform bidirectional content synchronization and does not preserve ad hoc destination changes.
