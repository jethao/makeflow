import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("DVT stage render hides the shared step checklist view", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("DVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.DVTStage.renderStage({
    designCostEstimate: {
      stages: [
        {
          stage: "dvt",
          title: "DVT",
          low: 3000,
          high: 5000,
          currency: "USD",
          items: []
        }
      ]
    }
  }, elements);

  assert.equal(elements.heading.style.display, "none");
  assert.equal(elements.actionRow.style.display, "none");
  assert.match(elements.checklist.innerHTML, /DVT workspace/);
  assert.doesNotMatch(elements.checklist.innerHTML, /Step checklist/);
});

test("DVT stage render includes mock discipline progress and test status chart", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("DVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.DVTStage.renderStage({}, elements);

  for (const label of ["ME", "EE", "SW", "ID", "Test"]) {
    assert.match(elements.checklist.innerHTML, new RegExp(`>${label}<`));
  }

  for (const label of ["Passed", "Failed", "Blocker", "Not run"]) {
    assert.match(elements.checklist.innerHTML, new RegExp(label));
  }

  assert.match(elements.checklist.innerHTML, /dvt-test-pie/);
});

test("DVT stage render includes compliance and reliability readiness card", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("DVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.DVTStage.renderStage({}, elements);

  assert.match(elements.checklist.innerHTML, /Compliance readiness/);
  assert.match(elements.checklist.innerHTML, /Reliability run/);
  assert.match(elements.checklist.innerHTML, /Certification pack/);
});

test("DVT stage render includes factory card before compliance readiness", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("DVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.DVTStage.renderStage({}, elements);

  assert.match(elements.checklist.innerHTML, /Factory readiness/);
  assert.match(elements.checklist.innerHTML, /Mock yield/);
  assert.match(elements.checklist.innerHTML, /Manufacture schedule/);
  assert.ok(
    elements.checklist.innerHTML.indexOf("Factory readiness") < elements.checklist.innerHTML.indexOf("Compliance readiness")
  );
});

test("DVT factory readiness renders top 5 factory issues", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("DVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.DVTStage.renderStage({}, elements);

  assert.match(elements.checklist.innerHTML, /Top 5 factory issues/);
  for (const issue of [
    "RF shield fit gap",
    "Enclosure tolerance stack",
    "Burn-in fixture dropout",
    "Speaker mesh alignment",
    "Torque driver calibration"
  ]) {
    assert.match(elements.checklist.innerHTML, new RegExp(issue));
  }
  assert.equal(elements.checklist.innerHTML.match(/class="dvt-factory-issue"/g)?.length, 5);
});

test("DVT stage render does not include a separate certification requirements card", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("DVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.DVTStage.renderStage({
    contexts: [
      [
        "",
        "",
        "",
        "",
        "",
        "FCC Part 15, CE RED, UL 62368-1"
      ]
    ]
  }, elements);

  assert.doesNotMatch(elements.checklist.innerHTML, /Certification requirements/);
  assert.doesNotMatch(elements.checklist.innerHTML, /FCC Part 15/);
  assert.doesNotMatch(elements.checklist.innerHTML, /CE RED/);
  assert.doesNotMatch(elements.checklist.innerHTML, /UL 62368-1/);
  assert.doesNotMatch(elements.checklist.innerHTML, /Mock readiness/);
});

test("DVT stage render includes PVT estimate approval", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("DVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.DVTStage.renderStage({
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

  assert.match(elements.checklist.innerHTML, /PVT estimate/);
  assert.match(elements.checklist.innerHTML, /Approve PVT/);
});

test("PVT payment closes popup and unlocks PVT stage", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("DVT.js", "utf8"), context);

  const product = {
    completed: [true, true, true, true, true, true, false, false],
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
  };

  let persisted = false;
  let rendered = false;
  context.window.DVTStage.openPvtPaymentModal(product, {
    persist: () => { persisted = true; },
    render: () => { rendered = true; },
    logActivity: () => {}
  });

  const modal = context.document.getElementById("pvtPaymentModal");
  assert.equal(modal.classList.contains("is-hidden"), false);

  context.document.getElementById("pvtPaymentConfirmButton").onclick();

  assert.equal(product.completed[6], true);
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
