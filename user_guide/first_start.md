# Getting Started with Kollab

When Kollab has no recent pages to show, it opens a short welcome path instead of an empty list. The path helps you create a home for your work before you begin writing.

## Create your local administrator

On a completely new installation, Kollab first shows **Create the first administrator**. This is local account setup; you do not need Logto, single sign-on, or another identity provider.

Enter a username and password. Your name and email are optional. Each field has a visible label, so you can tell exactly what information belongs in it. Select **Create administrator**, then use that account to create your first team, project, and page.

Use the sun or moon button in the upper-right corner to switch between light and dark appearance before you sign in. Kollab remembers that choice in this browser, including when you return to the sign-in screen.

## Start a shared workspace

1. On the **Welcome to Kollab** page, choose whether to start in **Personal Space** or a **Shared workspace**.
2. To start shared work, select **Create team space**. If you already belong to a team, the shared option opens that workspace first and leaves a smaller link for creating a new one.
3. Give the space a name and a short, unique URL abbreviation. You can add a description if it will help your team recognize the space.
4. Select **Create Team Space**. Kollab takes you directly to the new team.

## Add a project

In a new team, select **Create a project**. A project is useful when an initiative needs its own pages and settings. The team is preselected, so you only need to provide the project name and abbreviation.

## Create the first page

On a new project page, select **Create your first page**. Choose a blank page, **Project Brief**, **Meeting Notes**, **Team Wiki**, or another template in the page creator. After it is created, Kollab opens the page and it begins appearing in **Recent Pages** as you work.

Your personal space keeps its pages separate from shared team spaces.

## Continue setup at your pace

After the first page exists, the project portal shows a compact setup card with options to create another page or manage team members. Select its close icon to dismiss it for that project; Kollab remembers the choice in this browser. It never blocks the editor with a mandatory tour.

## Return to recent work

Once you have opened or edited pages, use **Recent Pages** from the top navigation to find them. The normal search, activity filter, and sorting controls appear when there is recent work to browse.

## If creating a space fails

Creating a team space needs a running Kollab API. If the form reports a connection failure, check that the local development services are running, then try again without closing the form. In the standard local setup, run `./dev.sh` from the project folder; it starts the database and API, then starts the frontend at `http://localhost:8090`. The local API uses host port `8081`, leaving `8080` available for other tools.
