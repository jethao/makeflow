import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cloneTemplateProduct,
  createWorkspaceStore,
  emptyWorkspace,
  normalizeWorkspace,
  sanitizeUserId
} from "./workspace-store.js";

test("sanitizeUserId strips unsafe characters", () => {
  assert.equal(sanitizeUserId("abc/../x"), "abc_.._x");
  assert.equal(sanitizeUserId(""), "unknown");
});

test("normalizeWorkspace drops products without ids", () => {
  const result = normalizeWorkspace({
    selectedProductId: "p1",
    products: [{ id: "p1", productName: "A" }, { productName: "bad" }, null]
  });
  assert.equal(result.products.length, 1);
  assert.equal(result.selectedProductId, "p1");
});

test("workspace store read/write roundtrip", async () => {
  const dir = await mkdtemp(join(tmpdir(), "makeflow-ws-"));
  try {
    const store = createWorkspaceStore({ dataDir: dir });
    const empty = await store.readWorkspace("user-1");
    assert.deepEqual(empty.products, []);

    const saved = await store.writeWorkspace("user-1", {
      selectedProductId: "p1",
      products: [{ id: "p1", productName: "Sensor" }]
    });
    assert.equal(saved.products[0].productName, "Sensor");

    const loaded = await store.readWorkspace("user-1");
    assert.equal(loaded.products[0].id, "p1");
    assert.equal(loaded.selectedProductId, "p1");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("workspace store rejects oversized payloads", async () => {
  const dir = await mkdtemp(join(tmpdir(), "makeflow-ws-"));
  try {
    const store = createWorkspaceStore({ dataDir: dir });
    const hugeContent = "x".repeat(store.MAX_WORKSPACE_BYTES);
    await assert.rejects(
      () => store.writeWorkspace("user-1", {
        products: [{ id: "p1", designOutputs: { mechanical: { content: hugeContent } } }]
      }),
      (error) => error.code === "WORKSPACE_TOO_LARGE"
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cloneTemplateProduct assigns new id and activity", () => {
  const product = cloneTemplateProduct({
    templateMeta: { id: "iot-sensor-node", title: "IoT sensor" },
    product: {
      id: "old",
      productName: "Node",
      activity: []
    }
  }, () => "new-id");

  assert.equal(product.id, "new-id");
  assert.equal(product.productName, "Node");
  assert.match(product.activity[0].message, /Imported from template IoT sensor/);
});

test("emptyWorkspace shape", () => {
  const empty = emptyWorkspace();
  assert.equal(empty.version, 1);
  assert.equal(empty.selectedProductId, null);
  assert.deepEqual(empty.products, []);
});
