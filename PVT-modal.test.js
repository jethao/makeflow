import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("PVT stage render hides the shared step checklist view", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("PVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.PVTStage.renderStage({
    designCostEstimate: {
      stages: [
        {
          stage: "pvt",
          title: "PVT",
          low: 2000,
          high: 4000,
          currency: "USD",
          items: []
        }
      ]
    }
  }, elements);

  assert.equal(elements.heading.style.display, "none");
  assert.equal(elements.actionRow.style.display, "none");
  assert.match(elements.checklist.innerHTML, /PVT workspace/);
  assert.doesNotMatch(elements.checklist.innerHTML, /Step checklist/);
});

test("PVT stage render includes mock discipline progress and test status chart", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("PVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.PVTStage.renderStage({}, elements);

  for (const label of ["Line", "QA", "ME", "EE", "Test"]) {
    assert.match(elements.checklist.innerHTML, new RegExp(`>${label}<`));
  }

  for (const label of ["Passed", "Failed", "Blocker", "Not run"]) {
    assert.match(elements.checklist.innerHTML, new RegExp(label));
  }

  assert.match(elements.checklist.innerHTML, /pvt-test-pie/);
});

test("PVT stage render includes factory readiness and production ramp card", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("PVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.PVTStage.renderStage({}, elements);

  assert.match(elements.checklist.innerHTML, /Factory readiness/);
  assert.match(elements.checklist.innerHTML, /Pilot yield/);
  assert.match(elements.checklist.innerHTML, /Production ramp/);
});

test("PVT stage render includes supplier readiness card", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("PVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.PVTStage.renderStage({}, elements);

  assert.match(elements.checklist.innerHTML, /Supplier readiness/);
  assert.match(elements.checklist.innerHTML, /Critical parts/);
  assert.match(elements.checklist.innerHTML, /Supplier quality/);
});

test("PVT stage render includes compliance readiness card", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("PVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.PVTStage.renderStage({}, elements);

  assert.match(elements.checklist.innerHTML, /Compliance readiness/);
  assert.match(elements.checklist.innerHTML, /Reliability release/);
  assert.match(elements.checklist.innerHTML, /Certification pack/);
});

test("PVT stage render includes MP estimate approval", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("PVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.PVTStage.renderStage({
    designCostEstimate: {
      stages: [
        {
          stage: "mp",
          title: "MP",
          low: 1000,
          high: 2500,
          currency: "USD",
          items: []
        }
      ]
    }
  }, elements);

  assert.match(elements.checklist.innerHTML, /MP estimate/);
  assert.match(elements.checklist.innerHTML, /Approve MP/);
});

test("MP payment closes popup and unlocks MP and Maintenance stages", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("PVT.js", "utf8"), context);

  const product = {
    completed: [true, true, true, true, true, true, true, false, false, false],
    designCostEstimate: {
      stages: [
        {
          stage: "mp",
          title: "MP",
          low: 1000,
          high: 2500,
          currency: "USD",
          items: []
        }
      ]
    }
  };

  let persisted = false;
  let rendered = false;
  context.window.PVTStage.openMpPaymentModal(product, {
    persist: () => { persisted = true; },
    render: () => { rendered = true; },
    logActivity: () => {}
  });

  const modal = context.document.getElementById("mpPaymentModal");
  assert.equal(modal.classList.contains("is-hidden"), false);

  context.document.getElementById("mpPaymentConfirmButton").onclick();

  assert.equal(product.completed[7], true);
  assert.equal(product.completed[9], true);
  assert.equal(persisted, true);
  assert.equal(rendered, true);
  assert.equal(modal.classList.contains("is-hidden"), true);
});

function createStageElements() {
  return {
    productRows: [createElement("productNameRow", "")],
    checklistNextButton: createElement("nextButton", ""),
    heading: createElement("heading", ""),
    actionRow: createElement("actionRow", ""),
    specWorkbench: createClassElement("specWorkbench"),
    checklist: createElement("checklist", ""),
    checklistCount: createElement("checklistCount", "")
  };
}

function createClassElement(id) {
  const element = createElement(id, "");
  element.classList.add = () => {};
  return element;
}

function createBrowserContext() {
  const elements = new Map();
  const document = {
    body: {
      insertAdjacentHTML(_position, html) {
        for (const id of html.matchAll(/id="([^"]+)"/g)) {
          elements.set(id[1], createElement(id[1], html));
        }
      }
    },
    getElementById(id) {
      return elements.get(id) || null;
    },
    addEventListener() {}
  };

  return {
    window: {},
    document,
    Intl,
    Number,
    String
  };
}

function createElement(id, html) {
  const classes = new Set();
  const classMatch = html.match(new RegExp(`id="${id}"[^>]*class="([^"]+)"`));
  if (classMatch) {
    classMatch[1].split(/\s+/).filter(Boolean).forEach((className) => classes.add(className));
  }

  return {
    id,
    innerHTML: "",
    onclick: null,
    style: {},
    focus() {},
    addEventListener(_event, handler) {
      this.onclick = handler;
    },
    classList: {
      add(className) {
        classes.add(className);
      },
      remove(className) {
        classes.delete(className);
      },
      contains(className) {
        return classes.has(className);
      }
    }
  };
}
