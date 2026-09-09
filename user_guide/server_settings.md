# User Guide: Server Settings, Branding & Security Classification Banner

This guide explains how system administrators can configure global server settings, custom branding, and the **Security Classification Top Banner** in Kollab.

---

## Accessing Server Settings

1. Sign in with an account that has `system.admin` access.
2. Open the user menu and select **Server Settings**.

## Authentication Branding

The authentication branding section controls the public login screen. You can set the logo, logo height, welcome title and subtitle, legal disclaimer, and login-button text. Leave a value blank to hide it from the login screen.

## Audit, Retention, and File Previews

Use the remaining settings to control audit-log and trash retention, AI limits, and the Aspose document-preview service.

## Security Classification Top Banner Setup

Administrators can enable a thin, high-visibility security banner across the top of all Kollab pages.

### How to Configure:
1. Navigate to **System Administration** > **Server Settings** (`/_admin/settings`).
2. Locate the **Security Classification Banner** card under the General / Branding tab.
3. Toggle the **Enable Security Classification Banner** switch to **ON**.
4. Choose a quick preset or customize the settings:
   - 🟢 **UNCLASSIFIED** (Green background)
   - 🟡 **PROPRIETARY** (Yellow/Gold background)
   - 🟠 **CONFIDENTIAL** (Orange background)
   - 🔴 **RESTRICTED** (Red background)
5. Optionally edit the **Classification Text**, **Background theme variable**, and **Text theme variable**. Use the provided `var(--...)` values so the banner adapts to your selected light/dark theme.
6. View the **Live Preview** box to verify contrast and readability.
7. Click **Save Changes**. The banner will instantly display across the top of all user sessions.
