import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createTemplateCatalog } from "./template-catalog.js";

const templatesDir = join(fileURLToPath(new URL(".", import.meta.url)), "templates");

test("lists bundled starter templates", async () => {
  const catalog = createTemplateCatalog({ templatesDir });
  const list = await catalog.listTemplates();
  assert.ok(list.length >= 3);
  const ids = list.map((item) => item.id);
  assert.ok(ids.includes("iot-sensor-node"));
  assert.ok(ids.includes("wearable-tracker"));
  assert.ok(ids.includes("smart-home-hub"));
  assert.ok(list.every((item) => item.title && item.description));
});

test("getTemplate returns product payload", async () => {
  const catalog = createTemplateCatalog({ templatesDir });
  const template = await catalog.getTemplate("iot-sensor-node");
  assert.equal(template.templateMeta.id, "iot-sensor-node");
  assert.equal(template.product.productName, "AeroSense Node");
  assert.ok(Array.isArray(template.product.checklistContexts));
});

test("getTemplate returns null for unknown id", async () => {
  const catalog = createTemplateCatalog({ templatesDir });
  assert.equal(await catalog.getTemplate("does-not-exist"), null);
  assert.equal(await catalog.getTemplate("../etc/passwd"), null);
});
