import test from "node:test";
import assert from "node:assert/strict";
import {
  buildIndustrialRenderingPromptInstruction,
  parseGeneratedDesignResponse
} from "./industrial-rendering-core.js";

test("industrial design response parses markdown content and rendering spec", () => {
  const response = parseGeneratedDesignResponse("industrial", JSON.stringify({
    content: "# Industrial Design\nUse a compact upright form.",
    rendering: {
      title: "Rotatable industrial design rendering",
      camera: { x: 2, y: 1.4, z: 4 },
      parts: [
        {
          id: "body",
          label: "Body shell",
          shape: "rounded_box",
          position: [0, 0, 0],
          scale: [2.1, 0.8, 1.1],
          color: "#62748a"
        }
      ]
    }
  }));

  assert.match(response.content, /# Industrial Design/);
  assert.equal(response.rendering.title, "Rotatable industrial design rendering");
  assert.equal(response.rendering.parts[0].label, "Body shell");
});

test("non-industrial design response remains markdown-only", () => {
  const response = parseGeneratedDesignResponse("mechanical", "# Mechanical Design");

  assert.equal(response.content, "# Mechanical Design\n");
  assert.equal(response.rendering, null);
});

test("industrial rendering prompt asks for a 3D renderable image schema", () => {
  const instruction = buildIndustrialRenderingPromptInstruction();

  assert.match(instruction, /3D renderable image/i);
  assert.match(instruction, /Return ONLY valid JSON/i);
  assert.match(instruction, /"rendering"/);
  assert.match(instruction, /6-10 primitive parts/);
  assert.match(instruction, /better-looking/i);
  assert.match(instruction, /product-specific/i);
  assert.match(instruction, /hero body/i);
  assert.match(instruction, /avoid generic stacks/i);
});
