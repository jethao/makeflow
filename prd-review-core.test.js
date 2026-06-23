import test from "node:test";
import assert from "node:assert/strict";

import {
  getPrdReviewSource,
  isPrdReviewUnlocked,
  createLocalPrdOutput
} from "./prd-review-core.js";

test("PRD review is unlocked before Spec is complete", () => {
  assert.equal(isPrdReviewUnlocked({ completed: [false, false] }, 1), true);
});

test("other stages still require the previous stage to be complete", () => {
  assert.equal(isPrdReviewUnlocked({ completed: [false, false] }, 0), true);
  assert.equal(isPrdReviewUnlocked({ completed: [false, false, false] }, 2), false);
  assert.equal(isPrdReviewUnlocked({ completed: [true, true, false] }, 2), true);
});

test("completed stages remain accessible even when an intermediate stage is incomplete", () => {
  assert.equal(isPrdReviewUnlocked({ completed: [false, false, false, true] }, 3), true);
});

test("PRD review prefers the accepted PRD review output over generated Spec output", () => {
  const product = {
    prdOutputs: [
      { source: "generated_spec", content: "generated" },
      { source: "local_file", content: "local" }
    ]
  };

  assert.deepEqual(getPrdReviewSource(product), {
    output: product.prdOutputs[1],
    sourceIndex: 1
  });
});

test("PRD review falls back to generated Spec PRD when no review output exists", () => {
  const product = {
    prdOutputs: [
      { source: "generated_spec", content: "generated" },
      null
    ]
  };

  assert.deepEqual(getPrdReviewSource(product), {
    output: product.prdOutputs[0],
    sourceIndex: 0
  });
});

test("local PRD file content is stored as a PRD review output", () => {
  const output = createLocalPrdOutput({
    name: "requirements.md",
    content: "# Requirements"
  });

  assert.equal(output.inputFile, "requirements.md");
  assert.equal(output.outputFile, "requirements.md");
  assert.equal(output.content, "# Requirements");
  assert.equal(output.source, "local_file");
  assert.deepEqual(output.comments, []);
  assert.match(output.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
});
