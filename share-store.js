import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join } from "node:path";

export function createShareStore({ dataDir }) {
  if (!dataDir) throw new Error("dataDir is required");

  function sharesDir() {
    return join(dataDir, "shares");
  }

  function sharePath(token) {
    return join(sharesDir(), `${sanitizeToken(token)}.json`);
  }

  async function createShare({ product, user, baseUrl }) {
    if (!product || typeof product !== "object") {
      const error = new Error("Product is required.");
      error.code = "INVALID_SHARE";
      throw error;
    }

    const designOutputs = pickDesignOutputs(product.designOutputs);
    if (Object.keys(designOutputs).length === 0) {
      const error = new Error("Product has no design outputs to share.");
      error.code = "NO_DESIGNS";
      throw error;
    }

    const token = randomBytes(18).toString("base64url");
    const record = {
      token,
      createdAt: new Date().toISOString(),
      createdBy: {
        id: String(user?.id || ""),
        name: typeof user?.name === "string" ? user.name : "Makeflow user"
      },
      productName: typeof product.productName === "string" && product.productName.trim()
        ? product.productName.trim()
        : "Shared design package",
      productType: typeof product.productType === "string" ? product.productType : "",
      designOutputs,
      designCostEstimate: product.designCostEstimate && typeof product.designCostEstimate === "object"
        ? product.designCostEstimate
        : null
    };

    await mkdir(sharesDir(), { recursive: true });
    const path = sharePath(token);
    const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    await rename(tempPath, path);

    const origin = String(baseUrl || "").replace(/\/$/, "");
    return {
      token,
      url: `${origin}/share/${token}`,
      createdAt: record.createdAt
    };
  }

  async function readShare(token) {
    const safe = sanitizeToken(token);
    if (!safe) return null;

    try {
      const raw = await readFile(sharePath(safe), "utf8");
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return {
        token: safe,
        createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : "",
        createdBy: {
          name: typeof parsed.createdBy?.name === "string" ? parsed.createdBy.name : "Makeflow user"
        },
        productName: typeof parsed.productName === "string" ? parsed.productName : "Shared design package",
        productType: typeof parsed.productType === "string" ? parsed.productType : "",
        designOutputs: pickDesignOutputs(parsed.designOutputs),
        designCostEstimate: parsed.designCostEstimate && typeof parsed.designCostEstimate === "object"
          ? parsed.designCostEstimate
          : null
      };
    } catch (error) {
      if (error?.code === "ENOENT" || error?.name === "SyntaxError") return null;
      throw error;
    }
  }

  async function deleteShare(token, userId) {
    const safe = sanitizeToken(token);
    if (!safe) return false;

    try {
      const raw = await readFile(sharePath(safe), "utf8");
      const parsed = JSON.parse(raw);
      if (parsed?.createdBy?.id && String(parsed.createdBy.id) !== String(userId)) {
        const error = new Error("Not allowed to delete this share.");
        error.code = "FORBIDDEN";
        throw error;
      }
      await unlink(sharePath(safe));
      return true;
    } catch (error) {
      if (error?.code === "ENOENT") return false;
      throw error;
    }
  }

  return {
    createShare,
    readShare,
    deleteShare
  };
}

function pickDesignOutputs(outputs) {
  if (!outputs || typeof outputs !== "object") return {};

  return Object.fromEntries(Object.entries(outputs)
    .filter(([, output]) => output && typeof output === "object" && typeof output.content === "string" && output.content.trim())
    .map(([key, output]) => [key, {
      key,
      title: typeof output.title === "string" ? output.title : key,
      content: output.content,
      rendering: output.rendering && typeof output.rendering === "object" ? output.rendering : null,
      generatedAt: typeof output.generatedAt === "string" ? output.generatedAt : ""
    }]));
}

function sanitizeToken(token) {
  const raw = String(token || "").trim();
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(raw)) return "";
  return raw;
}
