export function parseGeneratedDesignResponse(designType, text) {
  if (designType !== "industrial") {
    return {
      content: normalizeMarkdown(text),
      rendering: null
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(stripJsonEnvelope(text));
  } catch {
    throw new Error("OpenAI returned invalid industrial design JSON.");
  }

  const content = normalizeMarkdown(parsed?.content);
  if (!content.trim()) {
    throw new Error("OpenAI returned an empty industrial design document.");
  }

  return {
    content,
    rendering: normalizeIndustrialRendering(parsed?.rendering)
  };
}

export function buildIndustrialRenderingPromptInstruction() {
  return "Return ONLY valid JSON with this exact shape: {\"content\":\"Markdown industrial design document\",\"rendering\":{\"title\":\"Rotatable industrial design rendering\",\"camera\":{\"x\":3,\"y\":2,\"z\":5},\"parts\":[{\"id\":\"body\",\"label\":\"Body shell\",\"shape\":\"box|rounded_box|cylinder|sphere\",\"position\":[0,0,0],\"rotation\":[0,0,0],\"scale\":[1,1,1],\"color\":\"#62748a\"}]}}. The rendering object is a 3D renderable image schema for the ID card modal. Construct a better-looking, product-specific 3D structure from 6-10 primitive parts, not a generic block diagram. Start with one dominant hero body that captures the product silhouette, then add smaller layered details such as controls, display or sensor windows, seams, feet, ports, speaker grilles, handles, trims, bezels, soft-touch areas, or status lights as relevant to the PRD. Use varied positions, scales, colors, and depth so the assembly reads as a coherent industrial design at a three-quarter camera angle. Avoid generic stacks, floating unrelated shapes, flat icon-like layouts, and parts that do not visually support the product concept. Keep every part manufacturable and physically connected or plausibly integrated. Use hex colors only. Do not describe an image without producing the rendering schema.";
}

export function normalizeIndustrialRendering(rendering) {
  const source = rendering && typeof rendering === "object" ? rendering : {};
  const parts = Array.isArray(source.parts)
    ? source.parts.map(normalizeRenderingPart).filter(Boolean)
    : [];

  return {
    title: typeof source.title === "string" && source.title.trim()
      ? source.title.trim()
      : "Rotatable industrial design rendering",
    camera: normalizeVectorObject(source.camera, { x: 3, y: 2, z: 5 }),
    parts
  };
}

function normalizeRenderingPart(part, index) {
  if (!part || typeof part !== "object") return null;
  return {
    id: typeof part.id === "string" && part.id.trim() ? part.id.trim() : `part-${index + 1}`,
    label: typeof part.label === "string" && part.label.trim() ? part.label.trim() : `Part ${index + 1}`,
    shape: normalizeShape(part.shape),
    position: normalizeVectorArray(part.position, [0, 0, 0]),
    rotation: normalizeVectorArray(part.rotation, [0, 0, 0]),
    scale: normalizeVectorArray(part.scale, [1, 1, 1]),
    color: normalizeColor(part.color)
  };
}

function normalizeShape(shape) {
  const value = String(shape || "").toLowerCase();
  return ["box", "rounded_box", "cylinder", "sphere"].includes(value) ? value : "box";
}

function normalizeVectorObject(value, fallback) {
  const source = value && typeof value === "object" ? value : {};
  return {
    x: numeric(source.x, fallback.x),
    y: numeric(source.y, fallback.y),
    z: numeric(source.z, fallback.z)
  };
}

function normalizeVectorArray(value, fallback) {
  const source = Array.isArray(value) ? value : [];
  return [0, 1, 2].map((index) => numeric(source[index], fallback[index]));
}

function normalizeColor(value) {
  const color = typeof value === "string" ? value.trim() : "";
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#62748a";
}

function normalizeMarkdown(value) {
  const text = String(value || "").trimEnd();
  return text ? `${text}\n` : "";
}

function numeric(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function stripJsonEnvelope(text) {
  return String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
}
