# OIDC Authentication Architecture

Kollab is an OIDC relying party and protected API resource. At startup it obtains the provider's discovery document from `OIDC_AUTHORITY/.well-known/openid-configuration`, requires the returned issuer to exactly match the configured issuer, and uses the advertised HTTPS JWKS URI for signature verification.

```mermaid
sequenceDiagram
  participant Browser
  participant IdP as OIDC Provider
  participant API as Kollab API
  Browser->>IdP: Authorization Code with PKCE
  IdP-->>Browser: ID token + access token
  Browser->>API: Bearer access token
  API->>IdP: Fetch cached JWKS on unknown key ID
  API->>API: Verify signature, issuer, API audience, scope, expiry
  API-->>Browser: Authorized response
```

OIDC mode requires five deployment values: `OIDC_AUTHORITY`, `OIDC_CLIENT_ID`, `OIDC_REDIRECT_URI`, `OIDC_API_AUDIENCE`, and `OIDC_API_SCOPE`. The browser client requests the API scope and forwards only the resulting access token. The API rejects an ID token, a token for another audience, a token without the configured scope, HMAC-signed tokens, and tokens whose issuer or expiry validation fails.

In OIDC mode, HMAC-signed local tokens, registration, and password-login endpoints are disabled. The separate `AUTH_MODE=local` path is intentionally explicit and requires a JWT secret of at least 32 bytes; it is for isolated development only.

`BOOTSTRAP_ADMIN_USER_ID` is an optional deployment-time bootstrap. When set, the corresponding immutable OIDC `sub` receives `builtin.admin`; deployments should remove it after establishing normal administrators.

Kollab does not implement SAML endpoints or an embedded SAML service-provider configuration. An identity broker should translate a corporate SAML federation into the OIDC contract above.
