# AI assistant

Use **Ask AI Assistant** from the sparkle button in an editable page toolbar, or press `⌘K` (`Ctrl+K` on Windows and Linux). Ask it to draft, rewrite, summarize, or expand content. If text is selected, the response replaces that selection; otherwise it is inserted at your cursor.

The assistant automatically reads the page you have open. You can also paste up to three public `http` or `https` links into your request, for example: `Summarize this announcement: https://example.com/news`.

The assistant reads the visible text of those linked pages as reference material. It cannot open local addresses, private network URLs, pages requiring a login, or non-text downloads. Review generated text before keeping it; use **Regen** to try again or **Discard** to restore selected text.

## Configure OpenAI

Administrators can open **Server Settings → General** and use the **OpenAI assistant** section to paste an API key, select a model, and set an optional API-compatible base URL. After you save, the key is not shown again; leave that field empty later to keep the saved key. Kollab uses OpenAI before Gemini when both keys are configured, and defaults to `gpt-5.6-sol`.

| Setting | When to use it |
| --- | --- |
| `OPENAI_API_KEY` | Required OpenAI API key. `OPENAI_KEY` is also accepted for existing installations. |
| `OPENAI_MODEL` | Optional override for the chat model. |
| `OPENAI_BASE_URL` | Optional API-compatible base URL, including its `/v1` path when your gateway uses one. |
| `OPENAI_EMBED_MODEL` | Optional embedding model override. |

The Admin UI encrypts the saved key with the server's settings-encryption key. For multi-replica deployments, set the same `KOLLAB_SETTINGS_ENCRYPTION_KEY` on every API replica. If it is omitted, Kollab uses the server's shared `JWT_SECRET` as the encryption key.

Restart the API service after changing server environment variables. If OpenAI is not configured, Kollab can still use a configured Gemini key or local Ollama service.
