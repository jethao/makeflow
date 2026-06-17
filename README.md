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
