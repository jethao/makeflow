import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("Maintenance stage render hides the shared step checklist view", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("Maintenance.js", "utf8"), context);

  const elements = createStageElements();

  context.window.MaintenanceStage.renderStage({}, elements);

  assert.equal(elements.heading.style.display, "none");
  assert.equal(elements.actionRow.style.display, "none");
  assert.match(elements.checklist.innerHTML, /Maintenance workspace/);
  assert.doesNotMatch(elements.checklist.innerHTML, /Step checklist/);
});

test("Maintenance stage render includes OTA card with release date and features", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("Maintenance.js", "utf8"), context);

  const elements = createStageElements();

  context.window.MaintenanceStage.renderStage({}, elements);

  assert.match(elements.checklist.innerHTML, /OTA release/);
  assert.match(elements.checklist.innerHTML, /Expected release/);
  assert.match(elements.checklist.innerHTML, /Jan 22, 2027/);
  assert.match(elements.checklist.innerHTML, /Battery calibration/);
  assert.match(elements.checklist.innerHTML, /Connectivity recovery/);
});

test("Maintenance stage render includes Mobile App card with release date and features", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("Maintenance.js", "utf8"), context);

  const elements = createStageElements();

  context.window.MaintenanceStage.renderStage({}, elements);

  assert.match(elements.checklist.innerHTML, /Mobile App release/);
  assert.match(elements.checklist.innerHTML, /Feb 5, 2027/);
  assert.match(elements.checklist.innerHTML, /Guided onboarding refresh/);
  assert.match(elements.checklist.innerHTML, /Push notification controls/);
});

test("Maintenance stage render includes Backend card with release date and features", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("Maintenance.js", "utf8"), context);

  const elements = createStageElements();

  context.window.MaintenanceStage.renderStage({}, elements);

  assert.match(elements.checklist.innerHTML, /Backend release/);
  assert.match(elements.checklist.innerHTML, /Feb 12, 2027/);
  assert.match(elements.checklist.innerHTML, /Telemetry rollup API/);
  assert.match(elements.checklist.innerHTML, /Warranty analytics export/);
});

test("Maintenance stage render includes top 10 CX feedback summary", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("Maintenance.js", "utf8"), context);

  const elements = createStageElements();

  context.window.MaintenanceStage.renderStage({}, elements);

  assert.match(elements.checklist.innerHTML, /CX feedback/);
  assert.match(elements.checklist.innerHTML, /Top 10 customer feedback/);
  for (const item of [
    "Battery estimate feels optimistic",
    "Bluetooth reconnect takes too long",
    "Setup copy is unclear",
    "Notification volume is too high",
    "Packaging scuffs during shipping",
    "Warranty status is hard to find",
    "Firmware update progress needs detail",
    "EU charger availability is limited",
    "App dashboard loads slowly",
    "Support response needs more context"
  ]) {
    assert.match(elements.checklist.innerHTML, new RegExp(item));
  }
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
  return {
    window: {},
    document: {
      getElementById() {
        return null;
      },
      addEventListener() {}
    },
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
