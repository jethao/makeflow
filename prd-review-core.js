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

function hasPrdContent(output) {
  return Boolean(output && typeof output.content === "string" && output.content.trim());
}

if (typeof window !== "undefined") {
  window.PrdReviewCore = {
    isPrdReviewUnlocked,
    getPrdReviewSource,
    createLocalPrdOutput,
    preserveScrollPositions
  };
}
