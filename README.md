# German Fast Learning A2 → B1

Web app for an 84-day German study program, hosted on **Cloudflare Pages**, with progress stored in **Cloudflare D1** and authenticated with **Google Identity Services**.

## Cloudflare setup

1. Create a Cloudflare Pages project connected to this GitHub repository, with **Framework preset: None**, **Build command: blank**, and **Build output directory: /**.
2. In Cloudflare **D1**, create a database named `german-fast-learning-db`. In its **Console**, run the SQL in [schema.sql](schema.sql).
3. In the Pages project's **Settings → Bindings**, add a **D1 database binding** with variable name **DB**, pointing to the database you just created. Configure it for Production (and Preview if desired).
4. In **Settings → Variables and Secrets**, add:
   - `GOOGLE_CLIENT_ID` = the Web application OAuth client ID from Google Cloud
   - `SESSION_SECRET` = a random, private secret of at least 32 characters, stored as an encrypted secret
5. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), configure an OAuth consent screen (external, with your Google account added as a test user if the app is in testing), then create an **OAuth client ID → Web application**. Under **Authorized JavaScript origins**, add the **exact** Cloudflare Pages origin, e.g. `https://german-fast-learning.pages.dev` (no trailing slash). The site uses the Google Identity Services ID-token flow; no redirect URI is needed.
6. **Redeploy** the Pages project after adding bindings and variables. Visit the Pages URL, click **Sign in with Google**, and test saving a completed lesson, then open the site on another device using the same Google account.

## Notes

- Progress is private per Google account. Google ID tokens are validated server-side with Google, and session cookies are signed, HttpOnly, Secure, SameSite=Lax.
- Cloudflare Pages Functions handle `/api/config`, `/api/auth`, `/api/progress`, and `/api/logout`.
- The existing browser-local progress can be migrated on first login; **do not overwrite existing cloud data** without confirming.
- The local export/import feature remains available for backups.
- This app does not include AI-generated lessons in the site; the **Copiar clase** button generates prompts for ChatGPT.
