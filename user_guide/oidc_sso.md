# OpenID Connect Single Sign-On

Kollab uses OpenID Connect (OIDC) for production single sign-on. This works with corporate identity platforms and self-hosted identity hubs such as Authentik.

An administrator must set these server values before starting Kollab:

- `OIDC_AUTHORITY`: the provider's HTTPS issuer URL.
- `OIDC_CLIENT_ID`: the Kollab browser application's client ID.
- `OIDC_REDIRECT_URI`: the exact public URL that users return to after sign-in.
- `OIDC_API_AUDIENCE`: the identity provider's audience identifier for the Kollab API resource.
- `OIDC_API_SCOPE`: the delegated scope the browser must request before it can call the Kollab API.
- `BOOTSTRAP_ADMIN_USER_ID`: the stable OIDC `sub` value for the first Kollab administrator.

Kollab discovers the provider configuration automatically. After sign-in, the browser receives an ID token and an access token; Kollab sends only the access token to its API. The API verifies the token's issuer, signature, expiry, configured API audience, and delegated API scope. Do not use a client secret in the browser or configure a generic shared JWT secret for OIDC.

After the first administrator has logged in and other administrators are configured, remove `BOOTSTRAP_ADMIN_USER_ID` from the deployment configuration. This avoids keeping an implicit permanent administrator grant in infrastructure.

For an organisation that requires SAML, configure the identity hub to accept SAML from the corporate provider and issue OIDC to Kollab. This keeps the Kollab integration simple and lets one identity hub serve the rest of the homelab.
