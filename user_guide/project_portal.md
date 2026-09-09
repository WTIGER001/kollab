# Project Portal

The Project Portal is the root landing page for a specific project workspace. You can access it by clicking on a project from the Organization Directory (`/teams`) or by selecting a project from the Sidebar's space selector.

## Project Overview

At the top of the portal, you'll see the project's **Avatar, Name, Slug, and Description**. This provides an immediate, clear overview of the project's purpose and identity within the broader team.

- **Project Settings**: Click the "Project Settings" button to manage project metadata, update the description, or delete the project entirely (if you have the correct permissions).

## Project Pages Directory

The main content area of the Project Portal displays a **grid of all pages** that belong to this project. 
- You can instantly see each document's title and ID.
- Hovering over a page card will elevate it and highlight it in your active theme's primary color.
- Click "Open Page" or anywhere on a document card to dive straight into the editor for that page.

*If a project doesn't have any pages yet, you'll see a placeholder prompting you to create one using the sidebar.*

## Creating Pages

You can create a new page in a project directly from the left sidebar:
1. Click the **Create Page** button (with the `+` icon) at the top of the space's sidebar to instantly create a new blank page.
2. Or, click the chevron arrow next to "Create Page" to open the creation menu:
   - **Import Markdown File**: Select this option to choose a local `.md` or text file from your computer. A new page will be created automatically. The system will extract the first `# Heading` in your file to use as the page title, and inject the rest of the file into the new page using the Markdown Import macro.
   - **Import Hierarchy**: Upload a `.json` file to automatically generate an entire tree of nested pages and folders.

## Organizing & Moving Pages

You can easily reorganize your document hierarchy or move pages entirely across different spaces (Teams, Projects, or Personal).

1. In the sidebar, hover over the page you want to move.
2. Click the **More Options (`⋮`)** icon next to the page name and select **Move**.
3. In the Move dialog:
   - **Destination Space**: At the top of the dialog, select the space you want to move the page to. It defaults to the current space, but you can select any Team, Project, or your Personal Space that you have access to.
   - **New Parent Page**: Select the new parent folder within the chosen destination space. Select "Top Level (Root)" to place it at the base of the space.
4. Click **Move** to finalize. If the page contains sub-pages, they will all be moved together to the new destination. Choosing your Personal Space moves the entire branch out of its former team or project.
