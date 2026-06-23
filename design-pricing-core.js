export const DESIGN_PRICING_STAGES = [
  {
    key: "prototype",
    title: "Prototype",
    weight: 0.25,
    basis: "First functional build, prototype validation, integration support, and early test readiness."
  },
  {
    key: "evt",
    title: "EVT",
    weight: 0.25,
    basis: "Engineering validation units, core requirement testing, debug cycles, and engineering fixes."
  },
  {
    key: "dvt",
    title: "DVT",
    weight: 0.225,
    basis: "Design validation units, reliability testing, compliance preparation, and design verification."
  },
  {
    key: "pvt",
    title: "PVT",
    weight: 0.175,
    basis: "Pilot production validation, fixtures, process checks, quality gates, and yield readiness."
  },
  {
    key: "mp",
    title: "MP",
    weight: 0.1,
    basis: "Mass production release support, supplier readiness, launch checks, and production handoff."
  }
];

export function buildStagePricingEstimate(sourceEstimate) {
  const source = sourceEstimate && typeof sourceEstimate === "object" ? sourceEstimate : {};
  const currency = typeof source.currency === "string" && source.currency ? source.currency : "USD";
  const sourceItems = normalizeSourceItems(source.items, currency);

  const stages = distributeAcrossStages(sourceItems, currency);
  return {
    ...source,
    summary: typeof source.summary === "string" && source.summary
      ? source.summary
      : "Pricing estimate by delivery stage.",
    currency,
    sourceItems,
    stages,
    totalLow: stages.reduce((sum, stage) => sum + stage.low, 0),
    totalHigh: stages.reduce((sum, stage) => sum + stage.high, 0)
  };
}

export function getPrototypePricing(estimate) {
  const stage = estimate?.stages?.find((item) => item.stage === "prototype");
  return stage || null;
}

function distributeAcrossStages(sourceItems, currency) {
  return DESIGN_PRICING_STAGES.map((stage, index) => {
    const items = stageItems(sourceItems, index);
    return {
      stage: stage.key,
      title: stage.title,
      low: items.reduce((sum, item) => sum + item.low, 0),
      high: items.reduce((sum, item) => sum + item.high, 0),
      currency,
      basis: stage.basis,
      items
    };
  });
}

function stageItems(sourceItems, stageIndex) {
  return sourceItems.map((item) => {
    const lowValues = distribute(item.low);
    const highValues = distribute(item.high);
    return {
      designType: item.designType,
      title: item.title,
      low: lowValues[stageIndex],
      high: highValues[stageIndex],
      currency: item.currency,
      basis: item.basis
    };
  });
}

function normalizeSourceItems(items, fallbackCurrency) {
  const sourceItems = Array.isArray(items) ? items : [];
  return sourceItems.map((item) => ({
    designType: typeof item?.designType === "string" ? item.designType : "",
    title: typeof item?.title === "string" ? item.title : titleForDesignType(item?.designType),
    low: numeric(item?.low),
    high: numeric(item?.high),
    currency: typeof item?.currency === "string" && item.currency ? item.currency : fallbackCurrency,
    basis: typeof item?.basis === "string" ? item.basis : ""
  }));
}

function titleForDesignType(designType) {
  const titles = {
    mechanical: "ME",
    electrical: "EE",
    software: "SW",
    industrial: "ID",
    test: "TS"
  };
  return titles[designType] || designType || "Design";
}

function distribute(total) {
  const rounded = DESIGN_PRICING_STAGES.map((stage) => Math.round(total * stage.weight));
  const delta = Math.round(total) - rounded.reduce((sum, value) => sum + value, 0);
  rounded[rounded.length - 1] += delta;
  return rounded;
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

if (typeof window !== "undefined") {
  window.DesignPricingCore = {
    DESIGN_PRICING_STAGES,
    buildStagePricingEstimate,
    getPrototypePricing
  };
}
