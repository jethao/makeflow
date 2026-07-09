import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("design generation stores industrial rendering returned by the API", async () => {
  const fetchCalls = [];
  const context = createBrowserContext({
    fetch: async (_url, options) => {
      const body = JSON.parse(options.body);
      fetchCalls.push(body.designType);
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            title: titleForDesignType(body.designType),
            content: `# ${titleForDesignType(body.designType)}`,
            rendering: body.designType === "industrial" ? sampleRendering() : null
          });
        }
      };
    }
  });
  vm.runInNewContext(readFileSync("design.js", "utf8"), context);

  const product = {
    prdOutputs: [{ content: "# PRD\nA small smart speaker." }],
    feasibilityAnalyses: [{}, {}, { summary: "Feasible" }]
  };
  const elements = createStageElements(context.__elements);

  context.window.DesignStage.renderStage(product, elements);
  await context.document.getElementById("startDesignButton").onclick();

  assert.deepEqual(fetchCalls, ["mechanical", "electrical", "software", "industrial", "test"]);
  assert.equal(product.designOutputs.industrial.rendering.title, "Rotatable industrial design rendering");
  assert.equal(product.designOutputs.industrial.rendering.parts[0].shape, "rounded_box");
  assert.equal(product.designOutputs.mechanical.rendering, null);
});

test("industrial design output modal includes a 3D rendering surface", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("design.js", "utf8"), context);

  const product = {
    designOutputs: {
      industrial: {
        key: "industrial",
        title: "Industrial Design",
        content: "# Industrial Design",
        rendering: sampleRendering()
      }
    }
  };
  const elements = createStageElements(context.__elements);

  context.window.DesignStage.renderStage(product, elements);
  const industrialButton = elements.checklist.querySelectorAll(".design-output-button")
    .find((button) => button.dataset.designKey === "industrial");
  industrialButton.onclick();

  const content = context.document.getElementById("designDocContent").innerHTML;
  assert.match(content, /class="design-rendering-viewer"/);
  assert.match(content, /class="design-rendering-image"/);
  assert.match(content, /<canvas id="industrialDesignRenderingCanvas"/);
  assert.match(content, /Body shell/);
});

test("industrial design output card includes an image preview", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("design.js", "utf8"), context);

  const product = {
    designOutputs: {
      industrial: {
        key: "industrial",
        title: "Industrial Design",
        content: "# Industrial Design",
        rendering: sampleRendering()
      }
    }
  };
  const elements = createStageElements(context.__elements);

  context.window.DesignStage.renderStage(product, elements);

  assert.match(elements.checklist.innerHTML, /class="design-output-thumbnail"/);
  assert.match(elements.checklist.innerHTML, /src="data:image\/svg\+xml/);
  assert.match(elements.checklist.innerHTML, /alt="Industrial Design 3D preview"/);
});

test("electrical and software design output cards use visual SVG icons", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("design.js", "utf8"), context);

  const product = {
    designOutputs: {
      electrical: {
        key: "electrical",
        title: "Electrical Design",
        content: "# Electrical Design"
      },
      software: {
        key: "software",
        title: "Software Design",
        content: "# Software Design"
      }
    }
  };
  const elements = createStageElements(context.__elements);

  context.window.DesignStage.renderStage(product, elements);

  assert.match(elements.checklist.innerHTML, /class="design-output-icon circuit-board-icon"/);
  assert.match(elements.checklist.innerHTML, /aria-label="Circuit board"/);
  assert.match(elements.checklist.innerHTML, /class="design-output-icon terminal-code-icon"/);
  assert.match(elements.checklist.innerHTML, /aria-label="Terminal with code"/);
  assert.doesNotMatch(elements.checklist.innerHTML, />EE<\/span>/);
  assert.doesNotMatch(elements.checklist.innerHTML, />SW<\/span>/);
});

test("industrial design output modal includes an image for older outputs without rendering data", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("design.js", "utf8"), context);

  const product = {
    designOutputs: {
      industrial: {
        key: "industrial",
        title: "Industrial Design",
        content: "# Industrial Design"
      }
    }
  };
  const elements = createStageElements(context.__elements);

  context.window.DesignStage.renderStage(product, elements);
  const industrialButton = elements.checklist.querySelectorAll(".design-output-button")
    .find((button) => button.dataset.designKey === "industrial");
  industrialButton.onclick();

  const content = context.document.getElementById("designDocContent").innerHTML;
  assert.match(content, /class="design-rendering-image"/);
  assert.match(content, /src="data:image\/svg\+xml/);
  assert.match(content, /<canvas id="industrialDesignRenderingCanvas"/);
});

test("design pricing table and approve button stay hidden before estimate", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("design.js", "utf8"), context);

  const product = {
    prdOutputs: [{ content: "# PRD" }],
    feasibilityAnalyses: [{}, {}, { summary: "Feasible" }],
    designOutputs: createAllDesignOutputs()
  };
  const elements = createStageElements(context.__elements);

  context.window.DesignStage.renderStage(product, elements);

  assert.match(elements.checklist.innerHTML, /id="estimateDesignPricingButton"/);
  assert.doesNotMatch(elements.checklist.innerHTML, /class="design-pricing-table"/);
  assert.doesNotMatch(elements.checklist.innerHTML, /id="approveDesignPricingButton"/);
});

test("design pricing table and approve button show after estimate exists", () => {
  const context = createBrowserContext();
  vm.runInNewContext(readFileSync("design.js", "utf8"), context);

  const product = {
    prdOutputs: [{ content: "# PRD" }],
    feasibilityAnalyses: [{}, {}, { summary: "Feasible" }],
    designOutputs: createAllDesignOutputs(),
    designCostEstimate: {
      summary: "Estimated design cost.",
      currency: "USD",
      stages: [
        {
          stage: "prototype",
          title: "Prototype",
          low: 1000,
          high: 2000,
          currency: "USD",
          basis: "Prototype work",
          items: []
        }
      ],
      totalLow: 1000,
      totalHigh: 2000
    }
  };
  const elements = createStageElements(context.__elements);

  context.window.DesignStage.renderStage(product, elements);

  assert.match(elements.checklist.innerHTML, /class="design-pricing-table"/);
  assert.match(elements.checklist.innerHTML, /id="approveDesignPricingButton"/);
});

function sampleRendering() {
  return {
    title: "Rotatable industrial design rendering",
    camera: { x: 3, y: 2, z: 5 },
    parts: [
      {
        id: "body",
        label: "Body shell",
        shape: "rounded_box",
        position: [0, 0, 0],
        scale: [2.4, 0.9, 1.2],
        color: "#5f6f7d"
      }
    ]
  };
}

function createAllDesignOutputs() {
  return {
    mechanical: { key: "mechanical", title: "Mechanical Design", content: "# Mechanical Design" },
    electrical: { key: "electrical", title: "Electrical Design", content: "# Electrical Design" },
    software: { key: "software", title: "Software Design", content: "# Software Design" },
    industrial: { key: "industrial", title: "Industrial Design", content: "# Industrial Design" },
    test: { key: "test", title: "Test Spec", content: "# Test Spec" }
  };
}

function createStageElements(elements = new Map()) {
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

function createBrowserContext(overrides = {}) {
  const elements = new Map();
  const appState = {
    persist() {},
    render() {},
    logActivity() {},
    renderMarkdown(value) {
      return String(value || "");
    }
  };
  const window = { MakeflowAppState: appState };
  return {
    __elements: elements,
    window,
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
    fetch: overrides.fetch || (async () => { throw new Error("fetch not implemented"); }),
    alert() {},
    Intl,
    Number,
    Promise,
    String,
    console: { error() {} },
    setTimeout
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
    dataset: {},
    onclick: null,
    style: {},
    focus() {},
    addEventListener(_event, handler) {
      this.onclick = handler;
    },
    querySelectorAll(selector) {
      if (selector !== ".design-output-button") return [];
      return [...elements.values()].filter((item) => item.classList.contains("design-output-button"));
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
      for (const match of innerHTML.matchAll(/<button\b[^>]*class="([^"]*\bdesign-output-button\b[^"]*)"[^>]*data-design-key="([^"]+)"[^>]*>/g)) {
        const button = createElement(`designOutputButton-${match[2]}`, match[0], elements);
        button.dataset.designKey = match[2];
        button.classList.add("design-output-button");
        elements.set(button.id, button);
      }
      for (const match of innerHTML.matchAll(/id="([^"]+)"/g)) {
        elements.set(match[1], createElement(match[1], innerHTML, elements));
      }
    }
  });
  elements.set(id, element);
  return element;
}

function titleForDesignType(designType) {
  const titles = {
    mechanical: "Mechanical Design",
    electrical: "Electrical Design",
    software: "Software Design",
    industrial: "Industrial Design",
    test: "Test Spec"
  };
  return titles[designType] || "Design";
}
