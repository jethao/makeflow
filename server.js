import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const MAX_PORT_ATTEMPTS = 20;
const OUTPUT_DIR = join(__dirname, "generated");
const ROOT_DIR = resolve(__dirname);
const DEFAULT_MODEL = "gpt-5.4-mini";
const PROMPT_CACHE_RETENTION = process.env.OPENAI_PROMPT_CACHE_RETENTION || "in_memory";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

listen(PORT);

async function handleInspectSpec(request, response) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 500, { error: "OPENAI_API_KEY is not set in the environment." });
    return;
  }

  const payload = await readJsonBody(request);
  const validationError = validatePrdPayload(payload);
  if (validationError) {
    sendJson(response, 400, { error: validationError });
    return;
  }

  let review;
  try {
    review = await callOpenAIForSpecReview(apiKey, payload);
  } catch (error) {
    sendJson(response, 502, {
      error: error.message || "OpenAI request failed."
    });
    return;
  }

  sendJson(response, 200, {
    message: "Spec inspected",
    review
  });
}

async function handleGeneratePrd(request, response) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 500, { error: "OPENAI_API_KEY is not set in the environment." });
    return;
  }

  const payload = await readJsonBody(request);
  const validationError = validatePrdPayload(payload);
  if (validationError) {
    sendJson(response, 400, { error: validationError });
    return;
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const slug = slugify(payload.stage?.name || "prd");
  const inputFilename = `${timestamp}-${slug}-input.json`;
  const outputFilename = `${timestamp}-${slug}-prd.md`;
  const inputPath = join(OUTPUT_DIR, inputFilename);
  const outputPath = join(OUTPUT_DIR, outputFilename);

  const inputDocument = {
    generatedAt: new Date().toISOString(),
    source: "Makeflow",
    ...payload
  };

  await writeFile(inputPath, `${JSON.stringify(inputDocument, null, 2)}\n`, "utf8");

  let prd;
  try {
    prd = await callOpenAI(apiKey, inputDocument);
  } catch (error) {
    sendJson(response, 502, {
      error: error.message || "OpenAI request failed.",
      inputFile: relativeLocalPath(inputPath)
    });
    return;
  }

  await writeFile(outputPath, prd, "utf8");

  sendJson(response, 200, {
    message: "PRD generated",
    inputFile: relativeLocalPath(inputPath),
    outputFile: relativeLocalPath(outputPath),
    prd
  });
}

async function callOpenAIForSpecReview(apiKey, specDocument) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      prompt_cache_key: "makeflow-spec-inspection-v2",
      prompt_cache_retention: PROMPT_CACHE_RETENTION,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are a senior product and engineering reviewer. Review the supplied product spec JSON for readiness to generate a PRD. ONLY examine the fields that already exist in the provided JSON. Do not suggest adding new sections, new checklist items, new stages, or expanding the structure in any way. If the existing fields are complete, internally consistent, testable, and have enough detail, return exactly: approved. If not approved, return a detailed, human-readable review with concrete suggestions. For every issue, name the exact field or checklist item to change, explain what is missing or unclear, and give replacement-ready guidance the user can paste back into that field. Group the review by field names such as product.name, product.formFactor, product.bomTarget, checklist item names, or stage.targetDate. Do not return approved unless there are no blocking gaps."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Inspect this collective spec JSON:\n\n${JSON.stringify(specDocument, null, 2)}`
            }
          ]
        }
      ]
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || `OpenAI request failed with status ${response.status}`;
    throw new Error(message);
  }

  const text = extractResponseText(data);
  if (!text.trim()) {
    throw new Error("OpenAI returned an empty spec inspection.");
  }

  return text.trim();
}

async function callOpenAI(apiKey, inputDocument) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      prompt_cache_key: "makeflow-prd-generation-v2",
      prompt_cache_retention: PROMPT_CACHE_RETENTION,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are a senior hardware/software product manager. Write a clear, professional, human-readable Product Requirements Document in clean GitHub-flavored Markdown. Use descriptive headings, bullet points, numbered lists, and tables where helpful. Organize into these sections at minimum: Overview, Problem & Opportunity, Goals & Success Metrics, Functional & Non-Functional Requirements, Constraints (Hardware / Software / Regulatory), Assumptions & Dependencies, Out of Scope, Open Questions & Risks. Keep language crisp and actionable for engineering and design teams. Base content strictly on the fields present in the supplied JSON input. Output ONLY the Markdown document. Do not wrap in code fences or add any preamble or trailing commentary."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Create a PRD from this source file content:\n\n${JSON.stringify(inputDocument, null, 2)}`
            }
          ]
        }
      ]
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || `OpenAI request failed with status ${response.status}`;
    throw new Error(message);
  }

  const text = extractResponseText(data);
  if (!text.trim()) {
    throw new Error("OpenAI returned an empty PRD.");
  }

  return text.trimEnd() + "\n";
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;

  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("\n")
    .trim();
}

async function readJsonBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) {
      throw new Error("Request body is too large.");
    }
  }

  try {
    return JSON.parse(body || "{}");
  } catch {
    return null;
  }
}

function validatePrdPayload(payload) {
  if (!payload || typeof payload !== "object") return "Request body must be JSON.";
  if (!payload.stage || typeof payload.stage.name !== "string") return "Stage name is required.";
  if (!payload.product?.type) return "Product type is required.";
  if (!Number.isFinite(Number(payload.product?.bomTarget)) || Number(payload.product.bomTarget) <= 0) {
    return "BOM target must be greater than zero.";
  }
  if (!Array.isArray(payload.checklist) || payload.checklist.length === 0) return "Checklist input is required.";
  return "";
}

async function serveStatic(pathname, response, headOnly) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = resolve(__dirname, `.${decodeURIComponent(safePath)}`);

  if (filePath !== ROOT_DIR && !filePath.startsWith(`${ROOT_DIR}/`)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream"
    });
    if (!headOnly) response.end(content);
    else response.end();
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  response.end(JSON.stringify(payload));
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "prd";
}

function relativeLocalPath(filePath) {
  return filePath.replace(`${__dirname}/`, "");
}

function listen(port, attempts = 0) {
  const server = createServer(handleRequest);

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attempts < MAX_PORT_ATTEMPTS) {
      listen(port + 1, attempts + 1);
      return;
    }

    console.error(error);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`Makeflow is running at http://localhost:${port}`);
    console.log("API keys visible to server:");
    console.log("  OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "set" : "NOT SET");
    console.log("  XAI_API_KEY:", process.env.XAI_API_KEY ? "set" : "NOT SET");
  });
}

async function handleRequest(request, response) {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (request.method === "OPTIONS") {
      if (url.pathname === "/api/inspect-spec" || url.pathname === "/api/generate-prd") {
        response.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        });
        response.end();
        return;
      }
    }
    if (request.method === "POST" && url.pathname === "/api/inspect-spec") {
      await handleInspectSpec(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/generate-prd") {
      await handleGeneratePrd(request, response);
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    await serveStatic(url.pathname, response, request.method === "HEAD");
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Unexpected server error" });
  }
}
