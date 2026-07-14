export function isPrdReviewUnlocked(product, index) {
  if (!product) return false;
  if (index === 0 || index === 1) return true;
  if (product.completed?.[index]) return true;
  return Boolean(product.completed?.[index - 1]);
}

export function getPrdReviewSource(product) {
  const reviewOutput = product?.prdOutputs?.[1];
  if (hasPrdContent(reviewOutput)) {
    return {
      output: reviewOutput,
      sourceIndex: 1
    };
  }

  const generatedOutput = product?.prdOutputs?.[0];
  if (hasPrdContent(generatedOutput)) {
    return {
      output: generatedOutput,
      sourceIndex: 0
    };
  }

  return {
    output: null,
    sourceIndex: null
  };
}

export function createLocalPrdOutput({ name, content }) {
  return {
    inputFile: name || "local-prd.md",
    outputFile: name || "local-prd.md",
    generatedAt: new Date().toISOString(),
    content: content || "",
    source: "local_file",
    comments: []
  };
}

/**
 * Pull a product name from PRD markdown.
 * Prefers an explicit "Product name:" field, then H1 patterns like
 * "# FitT Pro V1 Product Requirements Document".
 */
export function extractProductNameFromPrd(content) {
  const text = String(content || "").replace(/^\uFEFF/, "");
  if (!text.trim()) return "";

  const fieldMatch = text.match(
    /(?:^|\n)\s*(?:\*{0,2}|_{0,2})Product\s*name(?:\*{0,2}|_{0,2})\s*[:：]\s*(?:\*{0,2}|_{0,2})(.+?)(?:\*{0,2}|_{0,2})\s*(?=\n|$)/i
  );
  if (fieldMatch) {
    const fromField = cleanProductName(fieldMatch[1]);
    if (fromField) return fromField;
  }

  const headingMatch = text.match(/^\s{0,3}#\s+(.+?)\s*$/m);
  if (headingMatch) {
    let heading = cleanProductName(headingMatch[1]);
    heading = heading
      .replace(/\s*[-–—:|]\s*product\s+requirements\s+document\s*$/i, "")
      .replace(/\s+product\s+requirements\s+document\s*$/i, "")
      .replace(/\s*\((?:prd|product\s+requirements\s+document)\)\s*$/i, "")
      .replace(/\s+prd\s*$/i, "")
      .trim();
    const fromHeading = cleanProductName(heading);
    if (fromHeading && !isGenericPrdTitle(fromHeading)) return fromHeading;
  }

  return "";
}

function cleanProductName(value) {
  return String(value || "")
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function isGenericPrdTitle(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return (
    !normalized
    || normalized === "prd"
    || normalized === "product requirements document"
    || normalized === "spec prd"
    || normalized === "spec prd (mock)"
    || normalized === "requirements"
    || normalized === "overview"
  );
}

export function preserveScrollPositions(targets, action, scheduleRestore) {
  const snapshots = Array.from(targets || [])
    .filter((target, index, list) => target && list.indexOf(target) === index)
    .filter((target) => typeof target.scrollTop === "number" || typeof target.scrollLeft === "number")
    .map((target) => ({
      target,
      top: Number(target.scrollTop) || 0,
      left: Number(target.scrollLeft) || 0
    }));

  const result = typeof action === "function" ? action() : undefined;
  const restore = () => {
    snapshots.forEach(({ target, top, left }) => {
      if (typeof target.scrollTop === "number") target.scrollTop = top;
      if (typeof target.scrollLeft === "number") target.scrollLeft = left;
    });
  };

  restore();
  if (typeof scheduleRestore === "function") scheduleRestore(restore);
  return result;
}

export function preserveScrollPositionBySelector(selector, root, action, scheduleRestore) {
  const queryRoot = root && typeof root.querySelector === "function" ? root : null;
  const before = queryRoot ? queryRoot.querySelector(selector) : null;
  const top = before && typeof before.scrollTop === "number" ? before.scrollTop : 0;
  const left = before && typeof before.scrollLeft === "number" ? before.scrollLeft : 0;

  const result = typeof action === "function" ? action() : undefined;
  const restore = () => {
    const after = queryRoot ? queryRoot.querySelector(selector) : null;
    if (!after) return;
    if (typeof after.scrollTop === "number") after.scrollTop = top;
    if (typeof after.scrollLeft === "number") after.scrollLeft = left;
  };

  restore();
  if (typeof scheduleRestore === "function") scheduleRestore(restore);
  return result;
}

function hasPrdContent(output) {
  return Boolean(output && typeof output.content === "string" && output.content.trim());
}

if (typeof window !== "undefined") {
  window.PrdReviewCore = {
    isPrdReviewUnlocked,
    getPrdReviewSource,
    createLocalPrdOutput,
    extractProductNameFromPrd,
    preserveScrollPositions,
    preserveScrollPositionBySelector
  };
}
