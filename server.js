import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FEASIBILITY_SCORE_AREAS, parseFeasibilityAnalysisText } from "./feasibility-core.js";

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

async function handleUpdatePrd(request, response) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 500, { error: "OPENAI_API_KEY is not set in the environment." });
    return;
  }

  const payload = await readJsonBody(request);
  const revisionItems = Array.isArray(payload?.lowAssessments) && payload.lowAssessments.length
    ? payload.lowAssessments
    : Array.isArray(payload?.comments)
      ? payload.comments
      : [];
  if (!payload || typeof payload.currentPrd !== "string" || !payload.currentPrd.trim() || revisionItems.length === 0) {
    sendJson(response, 400, { error: "currentPrd (string) and lowAssessments/comments (array) are required." });
    return;
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const inputFilename = `${timestamp}-prd-update-input.json`;
  const outputFilename = `${timestamp}-prd-updated.md`;
  const inputPath = join(OUTPUT_DIR, inputFilename);
  const outputPath = join(OUTPUT_DIR, outputFilename);

  const inputDocument = {
    generatedAt: new Date().toISOString(),
    source: "Makeflow",
    currentPrd: payload.currentPrd,
    lowAssessments: revisionItems
  };

  await writeFile(inputPath, `${JSON.stringify(inputDocument, null, 2)}\n`, "utf8");

  let updatedPrd;
  try {
    updatedPrd = await callOpenAIForPrdUpdate(apiKey, inputDocument);
  } catch (error) {
    sendJson(response, 502, {
      error: error.message || "OpenAI request failed.",
      inputFile: relativeLocalPath(inputPath)
    });
    return;
  }

  const revisionSummary = summarizePrdRevision(inputDocument.currentPrd, updatedPrd, revisionItems);
  console.log("[OpenAI PRD revision response summary]");
  console.log(JSON.stringify({
    receivedAt: new Date().toISOString(),
    outputFile: relativeLocalPath(outputPath),
    revisionSummary
  }, null, 2));

  await writeFile(outputPath, updatedPrd, "utf8");

  sendJson(response, 200, {
    message: "PRD updated",
    inputFile: relativeLocalPath(inputPath),
    outputFile: relativeLocalPath(outputPath),
    revisionSummary,
    prd: updatedPrd
  });
}

async function handleAnalyzeFeasibility(request, response) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 500, { error: "OPENAI_API_KEY is not set in the environment." });
    return;
  }

  const payload = request.method === "GET"
    ? {
        prd: typeof new URL(request.url || "/", `http://${request.headers.host}`).searchParams.get("prd") === "string"
          ? new URL(request.url || "/", `http://${request.headers.host}`).searchParams.get("prd")
          : ""
      }
    : await readJsonBody(request);
  if (!payload || typeof payload.prd !== "string" || !payload.prd.trim()) {
    sendJson(response, 400, { error: "prd (string) is required." });
    return;
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const inputPath = join(OUTPUT_DIR, `${timestamp}-feasibility-input.json`);
  const outputPath = join(OUTPUT_DIR, `${timestamp}-feasibility-analysis.json`);
  const inputDocument = {
    generatedAt: new Date().toISOString(),
    source: "Makeflow",
    prd: payload.prd
  };

  await writeFile(inputPath, `${JSON.stringify(inputDocument, null, 2)}\n`, "utf8");

  let analysis;
  try {
    analysis = await callOpenAIForFeasibility(apiKey, inputDocument);
  } catch (error) {
    sendJson(response, 502, {
      error: error.message || "OpenAI request failed.",
      inputFile: relativeLocalPath(inputPath)
    });
    return;
  }

  await writeFile(outputPath, `${JSON.stringify(analysis, null, 2)}\n`, "utf8");

  sendJson(response, 200, {
    message: "Feasibility analyzed",
    inputFile: relativeLocalPath(inputPath),
    outputFile: relativeLocalPath(outputPath),
    analysis
  });
}

async function callOpenAIForPrdUpdate(apiKey, inputDocument) {
  const revisionItemsText = (inputDocument.lowAssessments || []).map((item, i) => {
    const area = item?.area || `Finding ${i + 1}`;
    const score = item?.score || "low";
    const rationale = item?.rationale || item?.comment || item?.quote || "No rationale provided.";
    return `${i + 1}. Area: ${area}\n   Score: ${score}\n   Rationale: ${rationale}`;
  }).join("\n\n") || "(no low feasibility findings)";

  const requestBody = {
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    prompt_cache_key: "makeflow-prd-update-v2",
    prompt_cache_retention: PROMPT_CACHE_RETENTION,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "You are a senior product manager and system-minded PRD editor. Revise the existing Product Requirements Document using the low feasibility findings provided below. Treat every low finding as a required change target. Strengthen the PRD so it better addresses architecture, hardware, software, manufacturing, compliance, supply chain, risks, assumptions, dependencies, verification, and constraints that make the product more realistic. Preserve accurate existing content where it is still valid, but rewrite any weak or underspecified sections so the PRD is materially better and more actionable. Keep any existing version information and increment the version appropriately if a version is present (e.g. v1.0 -> v1.1). Output ONLY the complete updated Markdown PRD. Do not add any preamble, explanations, or code fences."
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Current PRD:\n\n${inputDocument.currentPrd}\n\nLow feasibility findings to address:\n${revisionItemsText}\n\nRewrite the PRD so these findings are addressed directly and the document is stronger overall.`
          }
        ]
      }
    ]
  };

  console.log("[OpenAI PRD revision request]");
  console.log(JSON.stringify({
    sentAt: new Date().toISOString(),
    endpoint: "https://api.openai.com/v1/responses",
    body: requestBody
  }, null, 2));

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || `OpenAI request failed with status ${response.status}`;
    throw new Error(message);
  }

  const text = extractResponseText(data);
  if (!text.trim()) {
    throw new Error("OpenAI returned an empty updated PRD.");
  }

  return text.trimEnd() + "\n";
}

function summarizePrdRevision(previousPrd, updatedPrd, revisionItems) {
  const changedSections = getChangedMarkdownSections(previousPrd, updatedPrd);
  const areas = (revisionItems || [])
    .map((item) => item?.area || item?.quote || "")
    .filter(Boolean);

  const summary = [];
  if (areas.length) {
    summary.push(`Addressed low feasibility areas: ${areas.join(", ")}.`);
  }
  if (changedSections.length) {
    summary.push(`Updated PRD sections: ${changedSections.slice(0, 8).join(", ")}${changedSections.length > 8 ? ", and more" : ""}.`);
  } else if (String(previousPrd || "") !== String(updatedPrd || "")) {
    summary.push("Updated PRD content without markdown section heading changes.");
  }
  summary.push(`PRD size changed from ${String(previousPrd || "").length} to ${String(updatedPrd || "").length} characters.`);

  return summary;
}

function getChangedMarkdownSections(previousPrd, updatedPrd) {
  const previousSections = parseMarkdownSections(previousPrd);
  const updatedSections = parseMarkdownSections(updatedPrd);
  const headings = new Set([...previousSections.keys(), ...updatedSections.keys()]);

  return [...headings].filter((heading) => {
    return normalizeComparableText(previousSections.get(heading)) !== normalizeComparableText(updatedSections.get(heading));
  });
}

function parseMarkdownSections(markdown) {
  const sections = new Map();
  let currentHeading = "Document body";
  let currentLines = [];

  String(markdown || "").split(/\r?\n/).forEach((line) => {
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (headingMatch) {
      sections.set(currentHeading, currentLines.join("\n"));
      currentHeading = headingMatch[2].trim();
      currentLines = [];
      return;
    }
    currentLines.push(line);
  });

  sections.set(currentHeading, currentLines.join("\n"));
  return sections;
}

function normalizeComparableText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function callOpenAIForFeasibility(apiKey, inputDocument) {
  const areas = FEASIBILITY_SCORE_AREAS.join(", ");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      prompt_cache_key: "makeflow-feasibility-analysis-v1",
      prompt_cache_retention: PROMPT_CACHE_RETENTION,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `You are a principal system architect for real-world connected hardware/software products. Analyze the supplied PRD for product feasibility across these areas only: ${areas}. Consider mechanical design, electrical architecture, embedded/software systems, manufacturing/process readiness, compliance/certification, supply chain, integration risks, reliability, testability, cost, schedule, and dependencies needed to make the real product. Be loose and easy on Compliance: for ordinary consumer, industrial, IoT, appliance, software, or general hardware products, score Compliance high when there is a normal certification path and medium when details are incomplete. Only score Compliance low when the product is explicitly medical, healthcare/clinical, defense, weapons, aerospace defense, or otherwise subject to unusually strict regulated-use approval and the PRD lacks a credible regulatory path. Return ONLY valid JSON with this exact shape: {"summary":"...","scores":[{"area":"Mechanical","score":"high|medium|low","rationale":"..."},{"area":"Electrical","score":"high|medium|low","rationale":"..."},{"area":"Software","score":"high|medium|low","rationale":"..."},{"area":"Manufacture","score":"high|medium|low","rationale":"..."},{"area":"Compliance","score":"high|medium|low","rationale":"..."},{"area":"Supply Chain","score":"high|medium|low","rationale":"..."}],"recommendations":["..."]}. Use high for feasible with clear path, medium for feasible with material risks, and low for major unknowns or blockers.`
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Analyze this PRD for feasibility:\n\n${inputDocument.prd}`
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
    throw new Error("OpenAI returned an empty feasibility analysis.");
  }

  try {
    return parseFeasibilityAnalysisText(text);
  } catch {
    throw new Error("OpenAI returned invalid feasibility analysis JSON.");
  }
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

    // Handle API routes first
    if (url.pathname === "/api/inspect-spec" || url.pathname === "/api/generate-prd" || url.pathname === "/api/update-prd" || url.pathname === "/api/analyze-feasibility") {
      if (request.method === "OPTIONS") {
        response.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        });
        response.end();
        return;
      }
      if (request.method === "POST" || (url.pathname === "/api/analyze-feasibility" && request.method === "GET")) {
        if (url.pathname === "/api/inspect-spec") {
          await handleInspectSpec(request, response);
          return;
        }
        if (url.pathname === "/api/generate-prd") {
          await handleGeneratePrd(request, response);
          return;
        }
        if (url.pathname === "/api/update-prd") {
          await handleUpdatePrd(request, response);
          return;
        }
        if (url.pathname === "/api/analyze-feasibility") {
          await handleAnalyzeFeasibility(request, response);
          return;
        }
      }
      // If API path but wrong method
      response.writeHead(405, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Allow": url.pathname === "/api/analyze-feasibility" ? "GET, POST, OPTIONS" : "POST, OPTIONS"
      });
      response.end(JSON.stringify({ error: "Method not allowed" }));
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
