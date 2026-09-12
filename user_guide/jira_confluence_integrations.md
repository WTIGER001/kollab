# GitLab, Confluence, and Jira

GitLab issue cards and issue lists use configured GitLab connections. Confluence archive import is available through the migration wizard. Jira remains a prototype.

## Connect GitLab

1. Open **Server Settings → Integrations**, or the integrations section of the relevant team or project settings.
2. Choose **Add Connection**, select **GitLab**, and enter a connection name, instance URL, and API/personal access token.
3. Save the connection. Its credentials stay on the server and are not displayed in connection listings.
4. While editing a page, insert a GitLab issue or issue-list macro, choose the authorized connection, and provide the issue URL or project/group filter requested by the macro.

The connection's account must be allowed to read the requested GitLab content. Page and space permissions still apply in Kollab. Issue lists load the provider's result pages; if the query exceeds the limit or GitLab fails, narrow the filter and retry. Errors are reported instead of substituting sample issues.

## Import Confluence content

Use the [Confluence migration wizard guide](confluence_import_guide.md) to import an exported archive with pages, hierarchy, and referenced attachments. Import is separate from a continuously synchronized live connection.

This release does not expose a live Confluence page-embed setup in the workspace UI. An internal Confluence fetch service exists, but it is not an operator-facing live integration workflow.

## Jira preview

Jira connection and macro screens are prototypes. Do not rely on their example data for live issue tracking. GitHub and Plane connection entries likewise do not imply that every provider-specific macro is implemented; use only the workflows documented for this release.
