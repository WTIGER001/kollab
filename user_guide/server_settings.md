# Server Settings & Authentication Branding

As a system administrator, you can configure global settings for your Kollab instance and customize the visual branding of the authentication screen to match your organization's identity.

## Accessing Server Settings

To access the Server Settings page:
1. Ensure you are logged in with an account that has `system.admin` privileges.
2. Navigate to the top-right user menu.
3. Select **Server Settings**.

## General Settings

The General Settings tab allows you to configure your **Workspace Branding Name**. This name replaces the default "Kollab" branding throughout the application.

## Authentication Branding

The **Authentication Branding** tab lets you customize the appearance and messaging of the public login screen that users see before they sign in.

You can configure the following elements:
- **Auth Logo URL**: Provide an absolute path (or an internal `/api/images/...` path) to your organization's logo. This replaces the default Kollab logo above the login button. You can upload an image directly to the Image Library from this page.
- **Logo Height**: Select the display size of the logo on the login screen. Options include Small (48px), Medium (80px), Large (120px), or a Custom pixel height.
- **Welcome Screen Title**: A prominent headline displayed below the logo (e.g., "Welcome to Arkloud").
- **Welcome Screen Subtitle (Description)**: A longer descriptive text block explaining the purpose of the workspace.
- **Legal Disclaimer**: A small-print disclaimer displayed at the very bottom of the login screen (useful for Terms of Service or Beta software warnings).
- **Login Button Text**: Customize the call-to-action on the login button itself (e.g., "Log In with SSO" or "Access Workspace").

*Note: If any of these fields are left blank, they will automatically be hidden from the login screen to keep the interface clean.*

## Audit, Retention, and File Previews

The remaining tabs allow you to configure:
- **Audit & Retention**: Set policies for how long page activity logs (Audit Logs) and deleted documents (Trash Bin) should be kept before they are permanently purged from the database.
- **Aspose & Previews**: Enable or disable the Aspose microservice, which is responsible for generating inline previews for Word documents, Excel spreadsheets, and CAD files. If you have an Aspose license key, you can enter it here to remove watermarks.
