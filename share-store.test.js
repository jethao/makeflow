import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createShareStore } from "./share-store.js";

test("createShare requires design outputs", async () => {
  const dir = await mkdtemp(join(tmpdir(), "makeflow-share-"));
  try {
    const store = createShareStore({ dataDir: dir });
    await assert.rejects(
      () => store.createShare({
        product: { id: "p1", productName: "X", designOutputs: {} },
        user: { id: "u1", name: "Ada" },
        baseUrl: "http://localhost:4173"
      }),
      (error) => error.code === "NO_DESIGNS"
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("createShare and readShare roundtrip strips private fields", async () => {
  const dir = await mkdtemp(join(tmpdir(), "makeflow-share-"));
  try {
    const store = createShareStore({ dataDir: dir });
    const created = await store.createShare({
      product: {
        id: "p1",
        productName: "Hub",
        productType: "Gateway",
        designOutputs: {
          mechanical: {
            title: "Mechanical Design",
            content: "# Mech\nBody shell notes",
            generatedAt: "2026-01-01T00:00:00.000Z",
            inputFile: "secret-path.json"
          }
        }
      },
      user: { id: "u1", name: "Ada Lovelace" },
      baseUrl: "http://localhost:4173"
    });

    assert.match(created.url, /^http:\/\/localhost:4173\/share\//);
    assert.ok(created.token.length >= 16);

    const publicShare = await store.readShare(created.token);
    assert.equal(publicShare.productName, "Hub");
    assert.equal(publicShare.createdBy.name, "Ada Lovelace");
    assert.equal(publicShare.createdBy.id, undefined);
    assert.equal(publicShare.designOutputs.mechanical.content.includes("Body shell"), true);
    assert.equal(publicShare.designOutputs.mechanical.inputFile, undefined);

    assert.equal(await store.readShare("not-a-real-token-value"), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("deleteShare enforces owner", async () => {
  const dir = await mkdtemp(join(tmpdir(), "makeflow-share-"));
  try {
    const store = createShareStore({ dataDir: dir });
    const created = await store.createShare({
      product: {
        id: "p1",
        productName: "Hub",
        designOutputs: {
          software: { title: "SW", content: "code plan" }
        }
      },
      user: { id: "owner", name: "Owner" },
      baseUrl: "https://example.com"
    });

    await assert.rejects(
      () => store.deleteShare(created.token, "other-user"),
      (error) => error.code === "FORBIDDEN"
    );

    assert.equal(await store.deleteShare(created.token, "owner"), true);
    assert.equal(await store.readShare(created.token), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
