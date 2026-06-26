import test from "node:test";
import assert from "node:assert/strict";
import { getDesignPromptGuidance } from "./design-prompt-core.js";

test("electrical design prompt requires a block diagram", () => {
  const guidance = getDesignPromptGuidance("electrical");

  assert.match(guidance, /## Block Diagram/);
  assert.match(guidance, /fenced ASCII block diagram/i);
  assert.match(guidance, /power source/i);
  assert.match(guidance, /PCB/i);
});

test("software design prompt requires a block diagram", () => {
  const guidance = getDesignPromptGuidance("software");

  assert.match(guidance, /## Block Diagram/);
  assert.match(guidance, /fenced ASCII block diagram/i);
  assert.match(guidance, /firmware/i);
  assert.match(guidance, /mobile app/i);
  assert.match(guidance, /backend/i);
});
