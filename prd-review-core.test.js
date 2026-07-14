import test from "node:test";
import assert from "node:assert/strict";

import {
  getPrdReviewSource,
  isPrdReviewUnlocked,
  createLocalPrdOutput,
  extractProductNameFromPrd,
  preserveScrollPositions,
  preserveScrollPositionBySelector
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

test("extractProductNameFromPrd prefers Product name field", () => {
  const content = `# FitT Pro V1 Product Requirements Document

## Overview

**Product name:** FitT Pro V1  
**Owner:** Alex
`;
  assert.equal(extractProductNameFromPrd(content), "FitT Pro V1");
});

test("extractProductNameFromPrd falls back to H1 without PRD suffix", () => {
  assert.equal(
    extractProductNameFromPrd("# AeroSense Node Product Requirements Document\n\n## Overview\n"),
    "AeroSense Node"
  );
  assert.equal(
    extractProductNameFromPrd("# PulseBand Lite PRD\n\nBody"),
    "PulseBand Lite"
  );
});

test("extractProductNameFromPrd ignores generic titles", () => {
  assert.equal(extractProductNameFromPrd("# Spec PRD (Mock)\n\nMock body"), "");
  assert.equal(extractProductNameFromPrd(""), "");
});

test("preserveScrollPositions restores scroll after a render callback", () => {
  const scrollArea = { scrollTop: 640, scrollLeft: 12 };
  let scheduledRestore = null;

  const result = preserveScrollPositions([scrollArea], () => {
    scrollArea.scrollTop = 0;
    scrollArea.scrollLeft = 0;
    return "saved";
  }, (restore) => {
    scheduledRestore = restore;
  });

  assert.equal(result, "saved");
  assert.equal(scrollArea.scrollTop, 640);
  assert.equal(scrollArea.scrollLeft, 12);

  scrollArea.scrollTop = 0;
  scrollArea.scrollLeft = 0;
  scheduledRestore();

  assert.equal(scrollArea.scrollTop, 640);
  assert.equal(scrollArea.scrollLeft, 12);
});

test("preserveScrollPositionBySelector restores scroll on replaced content", () => {
  const oldPanel = { scrollTop: 520, scrollLeft: 0 };
  const newPanel = { scrollTop: 0, scrollLeft: 0 };
  const root = {
    current: oldPanel,
    querySelector(selector) {
      assert.equal(selector, ".prd-drafted-content");
      return this.current;
    }
  };
  let scheduledRestore = null;

  preserveScrollPositionBySelector(".prd-drafted-content", root, () => {
    root.current = newPanel;
  }, (restore) => {
    scheduledRestore = restore;
  });

  assert.equal(newPanel.scrollTop, 520);

  newPanel.scrollTop = 0;
  scheduledRestore();

  assert.equal(newPanel.scrollTop, 520);
});
