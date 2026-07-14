import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export function createTemplateCatalog({ templatesDir }) {
  if (!templatesDir) throw new Error("templatesDir is required");

  async function listTemplates() {
    const files = await readdir(templatesDir).catch((error) => {
      if (error?.code === "ENOENT") return [];
      throw error;
    });

    const templates = [];
    for (const file of files.filter((name) => name.endsWith(".json")).sort()) {
      try {
        const full = await loadTemplateFile(join(templatesDir, file));
        if (!full) continue;
        templates.push(summarize(full));
      } catch {
        // Skip invalid template files.
      }
    }
    return templates;
  }

  async function getTemplate(id) {
    const safeId = sanitizeTemplateId(id);
    if (!safeId) return null;

    const directPath = join(templatesDir, `${safeId}.json`);
    const direct = await loadTemplateFile(directPath).catch(() => null);
    if (direct) return direct;

    const files = await readdir(templatesDir).catch(() => []);
    for (const file of files.filter((name) => name.endsWith(".json"))) {
      const full = await loadTemplateFile(join(templatesDir, file)).catch(() => null);
      if (full?.templateMeta?.id === safeId || full?.id === safeId) return full;
    }
    return null;
  }

  return {
    listTemplates,
    getTemplate
  };
}

async function loadTemplateFile(path) {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") return null;

  const meta = parsed.templateMeta && typeof parsed.templateMeta === "object"
    ? parsed.templateMeta
    : {};

  const id = sanitizeTemplateId(meta.id || parsed.id);
  if (!id) return null;

  const product = parsed.product && typeof parsed.product === "object"
    ? parsed.product
    : stripMeta(parsed);

  return {
    id,
    templateMeta: {
      id,
      title: typeof meta.title === "string" ? meta.title : id,
      description: typeof meta.description === "string" ? meta.description : "",
      tags: Array.isArray(meta.tags) ? meta.tags.filter((tag) => typeof tag === "string") : [],
      version: typeof meta.version === "string" ? meta.version : "1"
    },
    product
  };
}

function summarize(template) {
  return {
    id: template.templateMeta.id,
    title: template.templateMeta.title,
    description: template.templateMeta.description,
    tags: template.templateMeta.tags,
    version: template.templateMeta.version
  };
}

function stripMeta(parsed) {
  const clone = { ...parsed };
  delete clone.templateMeta;
  delete clone.id;
  delete clone.title;
  delete clone.description;
  delete clone.tags;
  delete clone.version;
  return clone;
}

function sanitizeTemplateId(id) {
  const raw = String(id || "").trim();
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(raw)) return "";
  return raw;
}
