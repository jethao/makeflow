(function() {
  const MOCK_FACTORY_ISSUES = [
    { title: "Outgoing QA sampling backlog", owner: "Quality", status: "Extra inspector assigned" },
    { title: "Packing line takt slip", owner: "Operations", status: "Station timing review" },
    { title: "Second shift training gap", owner: "Line lead", status: "Certification in progress" },
    { title: "Carton corner crush", owner: "Packaging", status: "Drop sample review" },
    { title: "Regional label mix risk", owner: "Compliance", status: "Scan gate added" }
  ];

  function renderStage(product, elements) {
    const mpPricing = getStagePricing(product, "mp");

    elements.productRows.forEach((row) => { if (row) row.style.display = "none"; });
    if (elements.checklistNextButton) elements.checklistNextButton.style.display = "none";
    if (elements.heading) elements.heading.style.display = "none";
    if (elements.actionRow) elements.actionRow.style.display = "none";
    elements.specWorkbench.classList.add("is-hidden");

    elements.checklist.innerHTML = `
      <li class="check-item prd-drafted">
        <div class="mp-stage">
          <div class="section-heading">
            <h3>MP workspace</h3>
            <span>${mpPricing ? "Estimate ready" : "No MP estimate"}</span>
          </div>
          <p>${mpPricing ? "Use the approved MP estimate to track controlled ramp, launch readiness, and support handoff." : "Approve MP pricing from PVT before starting mass production release."}</p>
          ${mpPricing ? renderStageEstimate("MP estimate", mpPricing) : ""}
          ${renderFactoryRamp()}
          ${renderLaunchReadiness()}
        </div>
      </li>
    `;
    elements.checklistCount.textContent = "";
  }

  function getStagePricing(product, key) {
    return product?.designCostEstimate?.stages?.find((stage) => stage.stage === key) || null;
  }

  function renderStageEstimate(label, pricing) {
    return `
      <div class="mp-stage-estimate">
        <span>${defaultEscapeHtml(label)}</span>
        <strong>${defaultFormatCurrency(pricing.low, pricing.currency)} - ${defaultFormatCurrency(pricing.high, pricing.currency)}</strong>
      </div>
    `;
  }

  function renderFactoryRamp() {
    return `
      <section class="mp-factory-card" aria-label="MP factory ramp">
        <div class="section-heading">
          <h4>Factory ramp</h4>
          <span>Mock yield 97%</span>
        </div>
        <div class="mp-factory-grid">
          <div>
            <span>First lot</span>
            <strong>1,240 / 1,280 units</strong>
            <em>First sellable lot accepted with cosmetic sampling and outgoing QA checks complete.</em>
          </div>
          <div>
            <span>Capacity plan</span>
            <strong>4.8k units / week</strong>
            <em>Second shift staffing, spare fixtures, and packing line takt are ready for launch volume.</em>
          </div>
          <div class="mp-factory-issues-card">
            <span>Top 5 factory issues</span>
            <ol class="mp-factory-issues">
              ${MOCK_FACTORY_ISSUES.map((issue) => `
                <li class="mp-factory-issue">
                  <strong>${defaultEscapeHtml(issue.title)}</strong>
                  <em>${defaultEscapeHtml(issue.owner)} - ${defaultEscapeHtml(issue.status)}</em>
                </li>
              `).join("")}
            </ol>
          </div>
        </div>
      </section>
    `;
  }

  function renderLaunchReadiness() {
    return `
      <section class="mp-launch-card" aria-label="MP launch readiness">
        <div class="section-heading">
          <h4>Launch readiness</h4>
          <span>Mock readiness 93%</span>
        </div>
        <div class="mp-launch-grid">
          <div>
            <span>Inventory plan</span>
            <strong>3 weeks staged</strong>
            <em>Launch allocation, reorder point, and regional buffer stock are staged for release.</em>
          </div>
          <div>
            <span>Support handoff</span>
            <strong>Runbook approved</strong>
            <em>Warranty flow, service scripts, known issues, and escalation owners are ready for launch.</em>
          </div>
        </div>
        ${renderQualityDashboard()}
      </section>
    `;
  }

  function renderQualityDashboard() {
    return `
      <section class="mp-quality-dashboard" aria-label="MP manufacture quality dashboard">
        <div class="section-heading">
          <h4>Manufacture quality dashboard</h4>
          <span>Mock quality pulse</span>
        </div>
        <img class="mp-quality-dashboard-image" src="img/MP-dash.png" alt="MP manufacture quality dashboard">
      </section>
    `;
  }

  function defaultFormatCurrency(value, currency = "USD") {
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0
    }).format(number);
  }

  function defaultEscapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  window.MPStage = {
    renderStage
  };
})();
