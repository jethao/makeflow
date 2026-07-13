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
npm start
```

Open `http://localhost:4173`. Unauthenticated visitors see the landing page and must log in with Google before using the product dashboard. Generated PRD source snapshots and PRD Markdown files are saved under `generated/`.

If another local server is already using port `4173`, Makeflow prints the next available URL, such as `http://localhost:4174`. Use the printed URL so `Generate PRD` can reach the local API server, and set `APP_BASE_URL` to that same origin for Google OAuth redirects.

### Google OAuth setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Configure the **OAuth consent screen** (External is fine for testing).
3. While the app is in **Testing**, add your Google account under **Test users**.
4. Create **Credentials → OAuth client ID → Web application**.
5. Add authorized redirect URI:
   - Local: `http://localhost:4173/api/auth/google/callback`
   - Production: `https://YOUR-HOST/api/auth/google/callback`
6. Copy the client ID and client secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

The landing page offers **Log in with Google** only (first-time Google users are signed in the same way). Product workflow state remains in browser `localStorage` (per browser/device), not yet synced per account on the server.

## Deploy for access anywhere

Makeflow must be deployed as a Node web service because the UI calls local `/api/*` routes in `server.js` for OpenAI-backed PRD, feasibility, and design generation.

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
5. In Google Cloud, add the Render origin and redirect URI for the OAuth client.
6. Deploy and open the Render-provided HTTPS URL from any device.

### Notes

- Browser workflow state is stored in `localStorage`, so each browser/device has its own saved products.
- Generated server files are written under `generated/` and should be treated as temporary host-local output.
- AI `/api/*` routes require a signed-in session cookie.
- Do not commit `.env`, `generated/`, `.DS_Store`, or `generated.zip`.
