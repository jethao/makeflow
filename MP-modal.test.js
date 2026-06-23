import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("MP stage render hides the shared step checklist view", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("MP.js", "utf8"), context);

  const elements = createStageElements();

  context.window.MPStage.renderStage({
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

  assert.equal(elements.heading.style.display, "none");
  assert.equal(elements.actionRow.style.display, "none");
  assert.match(elements.checklist.innerHTML, /MP workspace/);
  assert.doesNotMatch(elements.checklist.innerHTML, /Step checklist/);
});

test("MP stage render omits ramp progress and mock release status cards", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("MP.js", "utf8"), context);

  const elements = createStageElements();

  context.window.MPStage.renderStage({}, elements);

  assert.doesNotMatch(elements.checklist.innerHTML, /Ramp progress/);
  assert.doesNotMatch(elements.checklist.innerHTML, /Mock release status/);
  assert.doesNotMatch(elements.checklist.innerHTML, /mp-test-pie/);
});

test("MP stage render includes mass production estimate", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("MP.js", "utf8"), context);

  const elements = createStageElements();

  context.window.MPStage.renderStage({
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
  assert.match(elements.checklist.innerHTML, /\$1,000 - \$2,500/);
});

test("MP stage render includes factory ramp and launch readiness cards", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("MP.js", "utf8"), context);

  const elements = createStageElements();

  context.window.MPStage.renderStage({}, elements);

  assert.match(elements.checklist.innerHTML, /Factory ramp/);
  assert.match(elements.checklist.innerHTML, /First lot/);
  assert.match(elements.checklist.innerHTML, /Capacity plan/);
  assert.match(elements.checklist.innerHTML, /Launch readiness/);
  assert.match(elements.checklist.innerHTML, /Inventory plan/);
  assert.match(elements.checklist.innerHTML, /Support handoff/);
});

test("MP factory ramp card includes mock SKU progress and queued SKUs", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("MP.js", "utf8"), context);

  const elements = createStageElements();

  context.window.MPStage.renderStage({}, elements);

  assert.match(elements.checklist.innerHTML, /SKU progress/);
  assert.match(elements.checklist.innerHTML, /4 \/ 6 SKUs released/);
  assert.match(elements.checklist.innerHTML, /SKU in queue/);
  assert.match(elements.checklist.innerHTML, /Graphite \/ US/);
  assert.match(elements.checklist.innerHTML, /Sand \/ EU/);
});

test("MP factory ramp card includes progress for each queued SKU", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("MP.js", "utf8"), context);

  const elements = createStageElements();

  context.window.MPStage.renderStage({}, elements);

  assert.match(elements.checklist.innerHTML, /Graphite \/ US progress/);
  assert.match(elements.checklist.innerHTML, /83%/);
  assert.match(elements.checklist.innerHTML, /Sand \/ EU progress/);
  assert.match(elements.checklist.innerHTML, /58%/);
});

test("MP factory ramp card lists process for each queued SKU", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("MP.js", "utf8"), context);

  const elements = createStageElements();

  context.window.MPStage.renderStage({}, elements);

  assert.match(elements.checklist.innerHTML, /Graphite \/ US/);
  assert.match(elements.checklist.innerHTML, /Line trial/);
  assert.match(elements.checklist.innerHTML, /QA sampling/);
  assert.match(elements.checklist.innerHTML, /Packout approval/);
  assert.match(elements.checklist.innerHTML, /Sand \/ EU/);
  assert.match(elements.checklist.innerHTML, /Label verification/);
  assert.match(elements.checklist.innerHTML, /Regulatory file/);
  assert.match(elements.checklist.innerHTML, /Pallet build/);
});

test("MP factory ramp card opens order more SKU modal with SKU information fields", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("MP.js", "utf8"), context);

  const elements = createStageElements();

  context.window.MPStage.renderStage({}, elements);

  assert.match(elements.checklist.innerHTML, /Order more SKU/);

  context.window.MPStage.openSkuOrderModal();

  const modal = context.document.getElementById("mpSkuOrderModal");
  assert.equal(modal.classList.contains("is-hidden"), false);
  assert.match(context.document.getElementById("mpSkuOrderContent").innerHTML, /SKU name/);
  assert.match(context.document.getElementById("mpSkuOrderContent").innerHTML, /Region/);
  assert.match(context.document.getElementById("mpSkuOrderContent").innerHTML, /Quantity/);
  assert.match(context.document.getElementById("mpSkuOrderContent").innerHTML, /Target ship date/);
});

function createStageElements() {
  const elements = new Map();
  return {
    productRows: [createElement("productNameRow", "", elements)],
    checklistNextButton: createElement("nextButton", "", elements),
    heading: createElement("heading", "", elements),
    actionRow: createElement("actionRow", "", elements),
    specWorkbench: createClassElement("specWorkbench", elements),
    checklist: createElement("checklist", "", elements),
    checklistCount: createElement("checklistCount", "", elements)
  };
}

function createClassElement(id, elements) {
  const element = createElement(id, "", elements);
  element.classList.add = () => {};
  return element;
}

function createBrowserContext() {
  const elements = new Map();
  return {
    window: {},
    document: {
      body: {
        insertAdjacentHTML(_position, html) {
          for (const id of html.matchAll(/id="([^"]+)"/g)) {
            elements.set(id[1], createElement(id[1], html, elements));
          }
        }
      },
      getElementById(id) {
        return elements.get(id) || null;
      },
      addEventListener() {}
    },
    Intl,
    Number,
    String
  };
}

function createElement(id, html, elements = new Map()) {
  const classes = new Set();
  const classMatch = html.match(new RegExp(`id="${id}"[^>]*class="([^"]+)"`));
  if (classMatch) {
    classMatch[1].split(/\s+/).filter(Boolean).forEach((className) => classes.add(className));
  }

  const element = {
    id,
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
  let innerHTML = "";
  Object.defineProperty(element, "innerHTML", {
    get() {
      return innerHTML;
    },
    set(value) {
      innerHTML = String(value);
      for (const match of innerHTML.matchAll(/id="([^"]+)"/g)) {
        elements.set(match[1], createElement(match[1], innerHTML, elements));
      }
    }
  });
  elements.set(id, element);
  return element;
}
