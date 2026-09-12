# User Guide: Server Settings, Branding & Security Classification Banner

This guide explains how system administrators can configure global server settings, custom branding, and the **Security Classification Top Banner** in Kollab.

---

## Accessing Server Settings

1. Sign in with an account that has `system.admin` access.
2. Open the user menu and select **Server Settings**.

Kollab replaces the usual workspace sidebar with the **Server settings** sidebar while you are in administration. Use it to move between General, Appearance, Authentication, Users (local deployments), Audit & retention, Document previews, Backup & sync, and Integrations. Each section has its own address, so you can bookmark a specific setting. Select **Back to workspace** at the top of the sidebar when you are finished.

The **Save changes** button only saves the section currently open. Review the setting and save before moving to another section.

## Local users

For local-account deployments, choose **Users** in the Server settings sidebar. This opens the dedicated users page where administrators can add accounts, edit a display name or email address, reset passwords, enable or disable sign-in, and permanently remove an account. Usernames are permanent account IDs and cannot be changed after creation.

Disabling is the safer choice when you may need to preserve the account. Removed accounts can no longer sign in; Kollab keeps existing page history but may no longer show that person’s profile details. For safety, the account currently signed in cannot disable or remove itself.

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

For bidirectional package exchange and conflict review, see [Synchronization](synchronization.md).

The in-app **Server Admin Guide** describes accounts, backups, conflict review, replicas, and deployment. Its back arrow returns to Server Settings. For the complete operating procedure, see [Administration and deployment](admin_deployment_guide.md).
