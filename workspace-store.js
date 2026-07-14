import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const WORKSPACE_VERSION = 1;
const MAX_WORKSPACE_BYTES = 8 * 1024 * 1024;

export function createWorkspaceStore({ dataDir }) {
  if (!dataDir) throw new Error("dataDir is required");

  function userDir(userId) {
    return join(dataDir, "users", sanitizeUserId(userId));
  }

  function workspacePath(userId) {
    return join(userDir(userId), "workspace.json");
  }

  function generatedDir(userId) {
    return join(userDir(userId), "generated");
  }

  async function readWorkspace(userId) {
    const path = workspacePath(userId);
    try {
      const raw = await readFile(path, "utf8");
      const parsed = JSON.parse(raw);
      return normalizeWorkspace(parsed);
    } catch (error) {
      if (error && (error.code === "ENOENT" || error.name === "SyntaxError")) {
        return emptyWorkspace();
      }
      throw error;
    }
  }

  async function writeWorkspace(userId, input) {
    const workspace = normalizeWorkspace({
      ...input,
      updatedAt: new Date().toISOString()
    });
    const serialized = `${JSON.stringify(workspace, null, 2)}\n`;
    if (Buffer.byteLength(serialized, "utf8") > MAX_WORKSPACE_BYTES) {
      const error = new Error(`Workspace exceeds maximum size of ${MAX_WORKSPACE_BYTES} bytes.`);
      error.code = "WORKSPACE_TOO_LARGE";
      throw error;
    }

    const path = workspacePath(userId);
    await mkdir(dirname(path), { recursive: true });
    const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, serialized, "utf8");
    await rename(tempPath, path);
    return workspace;
  }

  return {
    emptyWorkspace,
    readWorkspace,
    writeWorkspace,
    generatedDir,
    MAX_WORKSPACE_BYTES
  };
}

export function emptyWorkspace() {
  return {
    version: WORKSPACE_VERSION,
    updatedAt: new Date().toISOString(),
    selectedProductId: null,
    products: []
  };
}

export function normalizeWorkspace(input) {
  if (!input || typeof input !== "object") return emptyWorkspace();

  const products = Array.isArray(input.products)
    ? input.products.filter((item) => item && typeof item === "object" && typeof item.id === "string")
    : [];

  const selectedProductId = typeof input.selectedProductId === "string"
    && products.some((product) => product.id === input.selectedProductId)
    ? input.selectedProductId
    : null;

  return {
    version: WORKSPACE_VERSION,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : new Date().toISOString(),
    selectedProductId,
    products
  };
}

export function sanitizeUserId(userId) {
  const raw = String(userId || "").trim();
  const safe = raw.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 128);
  return safe || "unknown";
}

export function cloneTemplateProduct(template, createId) {
  if (!template || typeof template !== "object") {
    throw new Error("Template payload is required.");
  }

  const source = template.product && typeof template.product === "object"
    ? template.product
    : template;

  const product = structuredClone(source);
  product.id = typeof createId === "function" ? createId() : `product-${Date.now()}`;
  product.createdAt = new Date().toISOString();

  const templateId = template.templateMeta?.id || template.id || "template";
  const templateTitle = template.templateMeta?.title || template.title || templateId;
  const activityEntry = {
    message: `Imported from template ${templateTitle}`,
    timestamp: new Date().toISOString()
  };

  if (!Array.isArray(product.activity)) product.activity = [];
  product.activity = [activityEntry, ...product.activity].slice(0, 50);
  product.selectedIndex = Number.isFinite(product.selectedIndex) ? product.selectedIndex : 0;

  return product;
}
