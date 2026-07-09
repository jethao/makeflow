# makeflow

Product idea to real sellable product workflow.

## Run locally

Set an OpenAI API key in the environment, then start the local server:

```sh
export OPENAI_API_KEY="your-key"
npm start
```

Open `http://localhost:4173`. Generated PRD source snapshots and PRD Markdown files are saved under `generated/`.

If another local server is already using port `4173`, Makeflow prints the next available URL, such as `http://localhost:4174`. Use the printed URL so `Generate PRD` can reach the local API server.

## Deploy for access anywhere

Makeflow must be deployed as a Node web service because the UI calls local `/api/*` routes in `server.js` for OpenAI-backed PRD, feasibility, and design generation.

### Render

1. Push this repo to GitHub.
2. In Render, create a new Blueprint or Web Service from the repo.
3. If using the included `render.yaml`, Render will use:
   - Build command: `npm ci`
   - Start command: `npm start`
   - Health check path: `/`
4. Add `OPENAI_API_KEY` in Render's environment settings.
5. Deploy and open the Render-provided HTTPS URL from any device.

### Notes

- Browser workflow state is stored in `localStorage`, so each browser/device has its own saved products.
- Generated server files are written under `generated/` and should be treated as temporary host-local output.
- Do not commit `.env`, `generated/`, `.DS_Store`, or `generated.zip`.
