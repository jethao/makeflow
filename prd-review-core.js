export function isPrdReviewUnlocked(product, index) {
  if (!product) return false;
  if (index === 0 || index === 1) return true;
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

function hasPrdContent(output) {
  return Boolean(output && typeof output.content === "string" && output.content.trim());
}

if (typeof window !== "undefined") {
  window.PrdReviewCore = {
    isPrdReviewUnlocked,
    getPrdReviewSource,
    createLocalPrdOutput
  };
}
