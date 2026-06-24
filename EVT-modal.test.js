import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("EVT stage render hides the shared step checklist view", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("EVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.EVTStage.renderStage({
    designCostEstimate: {
      stages: [
        {
          stage: "evt",
          title: "EVT",
          low: 1000,
          high: 2000,
          currency: "USD",
          items: []
        }
      ]
    }
  }, elements);

  assert.equal(elements.heading.style.display, "none");
  assert.equal(elements.actionRow.style.display, "none");
  assert.match(elements.checklist.innerHTML, /EVT workspace/);
  assert.doesNotMatch(elements.checklist.innerHTML, /Step checklist/);
});

test("EVT stage render includes mock discipline progress and test status chart", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("EVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.EVTStage.renderStage({}, elements);

  for (const label of ["ME", "EE", "SW", "ID", "Test"]) {
    assert.match(elements.checklist.innerHTML, new RegExp(`>${label}<`));
  }

  for (const label of ["Passed", "Failed", "Blocker", "Not run"]) {
    assert.match(elements.checklist.innerHTML, new RegExp(label));
  }

  assert.match(elements.checklist.innerHTML, /evt-test-pie/);
});

test("EVT stage render includes factory yield and manufacture schedule card", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("EVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.EVTStage.renderStage({}, elements);

  assert.match(elements.checklist.innerHTML, /Factory readiness/);
  assert.match(elements.checklist.innerHTML, /Mock yield/);
  assert.match(elements.checklist.innerHTML, /Manufacture schedule/);
});

test("EVT factory readiness renders top 5 factory issues", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("EVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.EVTStage.renderStage({}, elements);

  assert.match(elements.checklist.innerHTML, /Top 5 factory issues/);
  for (const issue of [
    "Fixture repeatability drift",
    "Battery door flash",
    "Antenna solder voids",
    "Thermal pad placement",
    "Label adhesion variance"
  ]) {
    assert.match(elements.checklist.innerHTML, new RegExp(issue));
  }
  assert.equal(elements.checklist.innerHTML.match(/class="evt-factory-issue"/g)?.length, 5);
});

test("EVT stage render includes DVT estimate approval", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("EVT.js", "utf8"), context);

  const elements = createStageElements();

  context.window.EVTStage.renderStage({
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

  assert.match(elements.checklist.innerHTML, /DVT estimate/);
  assert.match(elements.checklist.innerHTML, /Approve DVT/);
});

test("DVT payment closes popup and unlocks DVT stage", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("EVT.js", "utf8"), context);

  const product = {
    completed: [true, true, true, true, true, false, false],
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
  };

  let persisted = false;
  let rendered = false;
  context.window.EVTStage.openDvtPaymentModal(product, {
    persist: () => { persisted = true; },
    render: () => { rendered = true; },
    logActivity: () => {}
  });

  const modal = context.document.getElementById("dvtPaymentModal");
  assert.equal(modal.classList.contains("is-hidden"), false);

  context.document.getElementById("dvtPaymentConfirmButton").onclick();

  assert.equal(product.completed[5], true);
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
