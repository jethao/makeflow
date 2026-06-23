import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("prototype payment modal closes after mock payment confirm", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("prototype.js", "utf8"), context);

  let confirmed = false;
  context.window.PrototypeStage.openPaymentModal({
    prototypePricing: {
      low: 100,
      high: 200,
      currency: "USD",
      items: []
    },
    onConfirm: () => {
      confirmed = true;
    }
  });

  const modal = context.document.getElementById("prototypePaymentModal");
  assert.equal(modal.classList.contains("is-hidden"), false);

  context.document.getElementById("prototypePaymentConfirmButton").onclick();

  assert.equal(confirmed, true);
  assert.equal(modal.classList.contains("is-hidden"), true);
});

test("prototype stage render hides the shared step checklist view", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("prototype.js", "utf8"), context);

  const elements = {
    productRows: [createElement("productNameRow", "")],
    checklistNextButton: createElement("nextButton", ""),
    heading: createElement("heading", ""),
    actionRow: createElement("actionRow", ""),
    specWorkbench: createClassElement("specWorkbench"),
    checklist: createElement("checklist", ""),
    checklistCount: createElement("checklistCount", "")
  };

  context.window.PrototypeStage.renderStage({
    designCostEstimate: {
      stages: [
        {
          stage: "prototype",
          title: "Prototype",
          low: 100,
          high: 200,
          currency: "USD",
          items: []
        }
      ]
    }
  }, elements);

  assert.equal(elements.heading.style.display, "none");
  assert.equal(elements.actionRow.style.display, "none");
  assert.match(elements.checklist.innerHTML, /Prototype workspace/);
  assert.doesNotMatch(elements.checklist.innerHTML, /Step checklist/);
});

test("prototype stage render includes mock discipline progress and test status chart", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("prototype.js", "utf8"), context);

  const elements = {
    productRows: [],
    checklistNextButton: createElement("nextButton", ""),
    heading: createElement("heading", ""),
    actionRow: createElement("actionRow", ""),
    specWorkbench: createClassElement("specWorkbench"),
    checklist: createElement("checklist", ""),
    checklistCount: createElement("checklistCount", "")
  };

  context.window.PrototypeStage.renderStage({}, elements);

  for (const label of ["ME", "EE", "SW", "ID", "Test"]) {
    assert.match(elements.checklist.innerHTML, new RegExp(`>${label}<`));
  }

  for (const label of ["Passed", "Failed", "Blocker", "Not run"]) {
    assert.match(elements.checklist.innerHTML, new RegExp(label));
  }

  assert.match(elements.checklist.innerHTML, /prototype-test-pie/);
});

test("prototype stage render includes EVT estimate approval", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("prototype.js", "utf8"), context);

  const elements = {
    productRows: [],
    checklistNextButton: createElement("nextButton", ""),
    heading: createElement("heading", ""),
    actionRow: createElement("actionRow", ""),
    specWorkbench: createClassElement("specWorkbench"),
    checklist: createElement("checklist", ""),
    checklistCount: createElement("checklistCount", "")
  };

  context.window.PrototypeStage.renderStage({
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

  assert.match(elements.checklist.innerHTML, /EVT estimate/);
  assert.match(elements.checklist.innerHTML, /Approve EVT/);
});

test("EVT payment closes popup and unlocks EVT stage", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("prototype.js", "utf8"), context);

  const product = {
    completed: [true, true, true, true, false, false],
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
  };

  let persisted = false;
  let rendered = false;
  context.window.PrototypeStage.openEvtPaymentModal(product, {
    persist: () => { persisted = true; },
    render: () => { rendered = true; },
    logActivity: () => {}
  });

  const modal = context.document.getElementById("evtPaymentModal");
  assert.equal(modal.classList.contains("is-hidden"), false);

  context.document.getElementById("evtPaymentConfirmButton").onclick();

  assert.equal(product.completed[4], true);
  assert.equal(persisted, true);
  assert.equal(rendered, true);
  assert.equal(modal.classList.contains("is-hidden"), true);
});

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
