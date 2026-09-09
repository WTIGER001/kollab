# OpenID Connect Single Sign-On

Kollab uses OpenID Connect (OIDC) for production single sign-on. This works with corporate identity platforms and self-hosted identity hubs such as Authentik.

An administrator must set these server values before starting Kollab:

- `OIDC_AUTHORITY`: the provider's HTTPS issuer URL.
- `OIDC_CLIENT_ID`: the Kollab browser application's client ID.
- `OIDC_REDIRECT_URI`: the exact public URL that users return to after sign-in.
- `BOOTSTRAP_ADMIN_USER_ID`: the stable OIDC `sub` value for the first Kollab administrator.

Kollab discovers the provider configuration automatically and verifies that each sign-in token was issued by that provider for the configured client. Do not use a client secret in the browser or configure a generic shared JWT secret for OIDC.

After the first administrator has logged in and other administrators are configured, remove `BOOTSTRAP_ADMIN_USER_ID` from the deployment configuration. This avoids keeping an implicit permanent administrator grant in infrastructure.

For an organisation that requires SAML, configure the identity hub to accept SAML from the corporate provider and issue OIDC to Kollab. This keeps the Kollab integration simple and lets one identity hub serve the rest of the homelab.
