# Local User Management

Local user management is Kollab's first-run default: leave `AUTH_MODE` unset, or set `AUTH_MODE=local`. It is intended for offline or single-site installations that do not use an OIDC identity provider.

Before the first start, set `JWT_SECRET` to a unique secret of at least 32 bytes. Open Kollab after it starts and it will prompt you to create the first account. That account is automatically a system administrator.

The first-account prompt is available only while the installation has no users, and it closes permanently after successful creation. Public account registration is not available. Sign in as that administrator, then open **Local users** at `/_admin/users` to create accounts, reset passwords, and disable accounts. Disabled users cannot sign in. After five failed sign-in attempts for the same username and source address, Kollab pauses further attempts for 15 minutes.

Choose either local accounts or OIDC for a deployment. Moving to OIDC later should be planned as an identity migration, using the provider's stable subject identifier for administrator bootstrap.

Attachments and previews follow the same page access rules as their parent document. Links copied from the browser only work for an authenticated user who can read that document.
