import test from "node:test";
import assert from "node:assert/strict";

import {
  DESIGN_PRICING_STAGES,
  buildStagePricingEstimate,
  getPrototypePricing
} from "./design-pricing-core.js";

test("design pricing always includes Prototype, EVT, DVT, PVT, and MP stages", () => {
  const estimate = buildStagePricingEstimate({
    currency: "USD",
    items: [
      { title: "Mechanical Design", low: 1000, high: 2000, basis: "Mechanics" },
      { title: "Software Design", low: 2000, high: 3000, basis: "Firmware" }
    ]
  });

  assert.deepEqual(
    estimate.stages.map((stage) => stage.stage),
    DESIGN_PRICING_STAGES.map((stage) => stage.key)
  );
  assert.deepEqual(
    estimate.stages.map((stage) => stage.title),
    ["Prototype", "EVT", "DVT", "PVT", "MP"]
  );
});

test("design pricing distributes source estimate across stage percentages", () => {
  const estimate = buildStagePricingEstimate({
    currency: "USD",
    items: [
      { title: "Mechanical Design", low: 1000, high: 2000 },
      { title: "Software Design", low: 3000, high: 6000 }
    ]
  });

  assert.equal(estimate.totalLow, 4000);
  assert.equal(estimate.totalHigh, 8000);
  assert.deepEqual(
    estimate.stages.map((stage) => stage.low),
    [1000, 1000, 900, 700, 400]
  );
  assert.deepEqual(
    estimate.stages.map((stage) => stage.high),
    [2000, 2000, 1800, 1400, 800]
  );
});

test("each pricing stage includes every source design item", () => {
  const estimate = buildStagePricingEstimate({
    currency: "USD",
    items: [
      { designType: "mechanical", title: "ME", low: 1000, high: 2000 },
      { designType: "electrical", title: "EE", low: 2000, high: 4000 },
      { designType: "software", title: "SW", low: 3000, high: 6000 }
    ]
  });

  assert.deepEqual(
    estimate.stages[0].items.map((item) => item.title),
    ["ME", "EE", "SW"]
  );
  assert.deepEqual(
    estimate.stages[0].items.map((item) => item.low),
    [250, 500, 750]
  );
  assert.deepEqual(
    estimate.stages[1].items.map((item) => item.high),
    [500, 1000, 1500]
  );
});

test("prototype pricing is selected for the mock payment approval window", () => {
  const estimate = buildStagePricingEstimate({
    items: [
      { title: "Mechanical Design", low: 1200, high: 1800 },
      { title: "Electrical Design", low: 800, high: 1200 }
    ]
  });

  assert.deepEqual(getPrototypePricing(estimate), {
    stage: "prototype",
    title: "Prototype",
    low: 500,
    high: 750,
    currency: "USD",
    basis: "First functional build, prototype validation, integration support, and early test readiness.",
    items: [
      {
        designType: "",
        title: "Mechanical Design",
        low: 300,
        high: 450,
        currency: "USD",
        basis: ""
      },
      {
        designType: "",
        title: "Electrical Design",
        low: 200,
        high: 300,
        currency: "USD",
        basis: ""
      }
    ]
  });
});
