# User Guide: Searching Documents

Kollab features a hybrid search engine that combines **AI-powered semantic (conceptual) search** with traditional **keyword matching**. This allows you to find documents not just by typing exact words, but by typing general concepts or ideas.

---

## 🔍 How to Open the Search Page

You can navigate to the global search page at any time using either of these methods:
1.  **Sidebar Trigger**: Click on the search bar labeled *"Search document..."* at the top of the sidebar.
2.  **Direct Navigation**: Navigate to `/search` in your browser.

---

## ⌨️ How to Use the Search Page

Once you are on the Search Page:
1.  **Type your query**: Type what you are looking for in the main search bar at the top of the page. You can write:
    *   *Exact terms*: e.g. `Release notes`
    *   *General concepts*: e.g. `How we handle docker container updates` (this triggers AI semantic match to find related pages even if they don't contain the word "docker").
2.  **Toggle Search Mode**: Use the toggle buttons below the search bar to switch between **AI (Semantic)** search and **Keyword** search depending on the precision you need.
3.  **View Results**: The search results will instantly appear below the search bar in a list format, showing the document title, the project it belongs to, and a snippet of the text containing your query.
4.  **Open Document**: Click on any search result card to open that document directly.

---

## 💡 Pro-Tips & FAQ

*   **Active Project Isolation**: If you accessed the search page from within a specific project, the search results will be filtered to show only pages belonging to your *currently active project* to prevent unrelated clutter. You can modify this in the URL parameters or clear the query.
*   **Automatic Backup Search**: If the local AI model server is offline or loading, Kollab will automatically fall back to standard text matching. You will still get fast, accurate results based on exact matches in page titles or content paragraphs.
*   **Plain-text Previews**: Each search result displays a snippet matching your text query to give you quick context before opening the page.
