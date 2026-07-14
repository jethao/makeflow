# makeflow

Product idea to real sellable product workflow.

## Run locally

Set an OpenAI API key and Google OAuth env vars, then start the local server:

```sh
export OPENAI_API_KEY="your-key"
export GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
export SESSION_SECRET="$(openssl rand -hex 32)"
export APP_BASE_URL="http://localhost:4173"
# Optional: durable data root (workspaces, shares, per-user generated files)
# export DATA_DIR="/var/lib/makeflow"
npm start
```

Open `http://localhost:4173`. Unauthenticated visitors see the landing page (including starter templates) and must log in with Google before using the product dashboard.

If another local server is already using port `4173`, Makeflow prints the next available URL, such as `http://localhost:4174`. Use the printed URL so AI APIs can reach the local server, and set `APP_BASE_URL` to that same origin for Google OAuth redirects.

### Google OAuth setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Configure the **OAuth consent screen** (External is fine for testing).
3. While the app is in **Testing**, add your Google account under **Test users**.
4. Create **Credentials → OAuth client ID → Web application**.
5. Add authorized redirect URI:
   - Local: `http://localhost:4173/api/auth/google/callback`
   - Production: `https://YOUR-HOST/api/auth/google/callback`
6. Copy the client ID and client secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Cloud workspace, templates, and sharing

- After Google login, the full multi-product workspace is stored **per account** under `DATA_DIR` (default `./data`) as `data/users/{userId}/workspace.json`.
- Browser `localStorage` is a cache. On first login, any existing local products are migrated to the server if the cloud workspace is empty.
- **Starter templates** live in `templates/` and are listed on the landing page. Visitors can download JSON; signed-in users can import a template into their workspace.
- **Share design** (Design stage) creates a public read-only snapshot at `/share/{token}` that does not require login.
- AI generation snapshots are written under `data/users/{userId}/generated/` (legacy root `generated/` is no longer used for authenticated runs).

## Deploy for access anywhere

Makeflow must be deployed as a Node web service because the UI calls `/api/*` routes in `server.js` for auth, workspace sync, templates, shares, and OpenAI-backed generation.

### Render

1. Push this repo to GitHub.
2. In Render, create a new Blueprint or Web Service from the repo.
3. If using the included `render.yaml`, Render will use:
   - Build command: `npm ci`
   - Start command: `npm start`
   - Health check path: `/`
4. Add environment variables:
   - `OPENAI_API_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `SESSION_SECRET` (long random string)
   - `APP_BASE_URL` (your Render HTTPS URL, no trailing slash)
   - `DATA_DIR` (optional; path to a **persistent disk** mount for workspaces/shares)
5. Attach a persistent disk for production data if you need workspaces to survive redeploys (free web service disks are ephemeral).
6. In Google Cloud, add the Render origin and redirect URI for the OAuth client.
7. Deploy and open the Render-provided HTTPS URL from any device.

### Notes

- Cloud workspace is the source of truth for signed-in users; `localStorage` is a cache and migration source.
- Do not commit `.env`, `data/`, `generated/`, `.DS_Store`, or `generated.zip`.
- AI `/api/*` routes and workspace writes require a signed-in session cookie.
- Public routes: landing, `/api/templates*`, `/api/shares/:token`, `/share/:token`.
