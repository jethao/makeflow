(function() {
  let modal = null;
  let modalContent = null;
  let closeButton = null;
  let feasibilityModal = null;
  let feasibilityModalContent = null;
  let feasibilityCloseButton = null;
  let progressModal = null;
  let progressContent = null;
  let designDocModal = null;
  let designDocTitle = null;
  let designDocContent = null;
  let designDocCloseButton = null;
  let isGeneratingDesigns = false;
  let isEstimatingPricing = false;

  const DESIGN_TYPES = [
    { key: "mechanical", title: "Mechanical Design", icon: "ME" },
    { key: "electrical", title: "Electrical Design", icon: "EE" },
    { key: "software", title: "Software Design", icon: "SW" },
    { key: "industrial", title: "Industrial Design", icon: "ID" },
    { key: "test", title: "Test Spec", icon: "TS" }
  ];

  function renderStage(product, elements) {
    const prd = getLatestPrd(product);
    const feasibility = getFeasibilityAnalysis(product);

    elements.productRows.forEach((row) => { if (row) row.style.display = "none"; });
    if (elements.checklistNextButton) elements.checklistNextButton.style.display = "none";
    if (elements.heading) elements.heading.style.display = "none";
    if (elements.actionRow) elements.actionRow.style.display = "none";
    elements.specWorkbench.classList.add("is-hidden");

    elements.checklist.innerHTML = `
      <li class="check-item prd-drafted">
        <div class="design-stage">
          <div class="section-heading">
            <h3>Design workspace</h3>
            <span>${prd ? "PRD ready" : "No PRD"}</span>
          </div>
          <p>${prd ? "Use the approved PRD and feasibility output to prepare the design package." : "Complete PRD review and feasibility analysis before starting design."}</p>
          <div class="design-prd-row">
            <button id="openDesignPrdButton" class="design-prd-link" type="button" ${prd ? "" : "disabled"}>
              View PRD
            </button>
            <button id="openDesignFeasibilityButton" class="design-prd-link" type="button" ${feasibility ? "" : "disabled"}>
              View Feasibility
            </button>
            <button id="startDesignButton" class="primary-button" type="button" ${prd && !isGeneratingDesigns ? "" : "disabled"}>
              Design
            </button>
          </div>
          ${renderDesignOutputIcons(product)}
          ${renderEstimatePricingSection(product)}
        </div>
      </li>
    `;
    elements.checklistCount.textContent = "";

    const prdButton = document.getElementById("openDesignPrdButton");
    if (prdButton) prdButton.addEventListener("click", () => openPrdModal(prd));
    const feasibilityButton = document.getElementById("openDesignFeasibilityButton");
    if (feasibilityButton) feasibilityButton.addEventListener("click", () => openFeasibilityModal(feasibility));
    const designButton = document.getElementById("startDesignButton");
    if (designButton) designButton.addEventListener("click", () => startDesignGeneration(product, prd, feasibility));
    elements.checklist.querySelectorAll(".design-output-button").forEach((button) => {
      button.addEventListener("click", () => openDesignOutput(product.designOutputs?.[button.dataset.designKey]));
    });
    const estimateButton = document.getElementById("estimateDesignPricingButton");
    if (estimateButton) estimateButton.addEventListener("click", () => estimateDesignPricing(product, prd, feasibility));
    const approveButton = document.getElementById("approveDesignPricingButton");
    if (approveButton) approveButton.addEventListener("click", () => approveDesign(product));
  }

  async function startDesignGeneration(product, prd, feasibility) {
    if (!prd?.content || isGeneratingDesigns) return;

    isGeneratingDesigns = true;
    const statuses = Object.fromEntries(DESIGN_TYPES.map((type) => [type.key, {
      title: type.title,
      status: "running",
      message: "Generating..."
    }]));
    showProgressModal(statuses);

    const tasks = DESIGN_TYPES.map(async (type) => {
      try {
        const result = await requestDesign(type.key, prd.content, feasibility);
        if (!product.designOutputs) product.designOutputs = {};
        product.designOutputs[type.key] = {
          key: type.key,
          title: result.title || type.title,
          content: result.content,
          generatedAt: new Date().toISOString(),
          inputFile: result.inputFile || "",
          outputFile: result.outputFile || ""
        };
        statuses[type.key] = {
          ...statuses[type.key],
          status: "done",
          message: "Done"
        };
        app().persist();
        updateProgressModal(statuses);
        return result;
      } catch (error) {
        statuses[type.key] = {
          ...statuses[type.key],
          status: "failed",
          message: error.message || "Failed"
        };
        updateProgressModal(statuses);
        throw error;
      }
    });

    const results = await Promise.allSettled(tasks);
    isGeneratingDesigns = false;
    app().render();

    if (results.every((result) => result.status === "fulfilled")) {
      hideProgressModal();
      app().logActivity("Design package generated");
      return;
    }

    app().logActivity("Design package generation failed");
  }

  async function requestDesign(designType, prd, feasibility) {
    let response;
    try {
      response = await fetch("/api/generate-design", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ designType, prd, feasibility })
      });
    } catch {
      throw new Error("Could not reach the design generation server. Start the app with npm start and open the localhost URL printed by the server.");
    }

    const rawBody = await response.text().catch(() => "");
    const result = parseResponseBody(rawBody);
    if (!response.ok) {
      if (response.status === 405) {
        throw new Error("Design API route is not active. Restart the Makeflow server and open the localhost URL printed by the server, then try Design again.");
      }
      throw new Error(result?.error || `Unable to generate design. (HTTP ${response.status})`);
    }
    if (!result.content) {
      throw new Error("The generated design was not returned.");
    }
    return result;
  }

  async function estimateDesignPricing(product, prd, feasibility) {
    if (!prd?.content || !hasAllDesignOutputs(product) || isEstimatingPricing) return;

    isEstimatingPricing = true;
    showPricingProgressModal();

    try {
      const result = await requestPricingEstimate(prd.content, feasibility, product.designOutputs);
      product.designCostEstimate = normalizeStagePricingEstimate(result.estimate);
      app().logActivity("Design pricing estimated");
      app().persist();
      hidePricingProgressModal();
      app().render();
    } catch (error) {
      hidePricingProgressModal();
      app().logActivity("Design pricing estimate failed");
      alert(`Pricing estimate failed: ${error.message || error}`);
    } finally {
      isEstimatingPricing = false;
    }
  }

  async function requestPricingEstimate(prd, feasibility, designs) {
    let response;
    try {
      response = await fetch("/api/estimate-design-pricing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prd, feasibility, designs })
      });
    } catch {
      throw new Error("Could not reach the pricing estimate server. Start the app with npm start and open the localhost URL printed by the server.");
    }

    const rawBody = await response.text().catch(() => "");
    const result = parseResponseBody(rawBody);
    if (!response.ok) {
      if (response.status === 405) {
        throw new Error("Pricing estimate API route is not active. Restart the Makeflow server and open the localhost URL printed by the server, then try again.");
      }
      throw new Error(result?.error || `Unable to estimate design pricing. (HTTP ${response.status})`);
    }
    if (!result.estimate) {
      throw new Error("The pricing estimate was not returned.");
    }
    return result;
  }

  function approveDesign(product) {
    if (!product?.designCostEstimate?.stages?.length) return;
    openPrototypePaymentModal(product);
  }

  function completeDesignApproval(product) {
    if (!Array.isArray(product.completed)) return;
    product.completed[3] = true;
    app().logActivity("Prototype pricing payment mocked and design pricing approved");
    app().persist();
    app().render();
  }

  function openPrdModal(prd) {
    if (!prd?.content) return;

    createModalIfNeeded();
    modalContent.innerHTML = app().renderMarkdown ? app().renderMarkdown(prd.content) : escapeHtml(prd.content);
    modal.classList.remove("is-hidden");
    closeButton.focus();
  }

  function createModalIfNeeded() {
    if (modal) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div id="designPrdModal" class="modal-backdrop is-hidden" role="dialog" aria-modal="true" aria-labelledby="designPrdTitle">
        <section class="modal-panel design-prd-panel">
          <div class="modal-header">
            <div>
              <span>Design</span>
              <h3 id="designPrdTitle">PRD handoff</h3>
            </div>
            <button id="designPrdCloseButton" class="icon-button" type="button" aria-label="Close PRD handoff">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div id="designPrdContent" class="design-prd-content prd-markdown"></div>
        </section>
      </div>
    `);

    modal = document.getElementById("designPrdModal");
    modalContent = document.getElementById("designPrdContent");
    closeButton = document.getElementById("designPrdCloseButton");

    closeButton.addEventListener("click", closePrdModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closePrdModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal && !modal.classList.contains("is-hidden")) closePrdModal();
    });
  }

  function closePrdModal() {
    if (!modal) return;
    modal.classList.add("is-hidden");
  }

  function openFeasibilityModal(analysis) {
    if (!analysis) return;

    createFeasibilityModalIfNeeded();
    feasibilityModalContent.innerHTML = renderFeasibilityAssessment(analysis);
    feasibilityModal.classList.remove("is-hidden");
    feasibilityCloseButton.focus();
  }

  function createFeasibilityModalIfNeeded() {
    if (feasibilityModal) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div id="designFeasibilityModal" class="modal-backdrop is-hidden" role="dialog" aria-modal="true" aria-labelledby="designFeasibilityTitle">
        <section class="modal-panel design-prd-panel">
          <div class="modal-header">
            <div>
              <span>Design</span>
              <h3 id="designFeasibilityTitle">Feasibility assessment</h3>
            </div>
            <button id="designFeasibilityCloseButton" class="icon-button" type="button" aria-label="Close feasibility assessment">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div id="designFeasibilityContent" class="design-prd-content"></div>
        </section>
      </div>
    `);

    feasibilityModal = document.getElementById("designFeasibilityModal");
    feasibilityModalContent = document.getElementById("designFeasibilityContent");
    feasibilityCloseButton = document.getElementById("designFeasibilityCloseButton");

    feasibilityCloseButton.addEventListener("click", closeFeasibilityModal);
    feasibilityModal.addEventListener("click", (event) => {
      if (event.target === feasibilityModal) closeFeasibilityModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && feasibilityModal && !feasibilityModal.classList.contains("is-hidden")) closeFeasibilityModal();
    });
  }

  function closeFeasibilityModal() {
    if (!feasibilityModal) return;
    feasibilityModal.classList.add("is-hidden");
  }

  function showProgressModal(statuses) {
    createProgressModalIfNeeded();
    updateProgressModal(statuses);
    progressModal.classList.remove("is-hidden");
  }

  function updateProgressModal(statuses) {
    if (!progressContent) return;
    progressContent.innerHTML = `
      <div class="design-progress-list">
        ${DESIGN_TYPES.map((type) => {
          const item = statuses[type.key] || { title: type.title, status: "pending", message: "Pending" };
          return `
            <div class="design-progress-item">
              <span class="design-progress-dot ${escapeHtml(item.status)}"></span>
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.message)}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function hideProgressModal() {
    if (progressModal) progressModal.classList.add("is-hidden");
  }

  function createProgressModalIfNeeded() {
    if (progressModal) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div id="designProgressModal" class="modal-backdrop is-hidden" role="dialog" aria-modal="true" aria-labelledby="designProgressTitle">
        <section class="modal-panel confirm-panel">
          <div class="modal-header">
            <div>
              <span>Design</span>
              <h3 id="designProgressTitle">Generating design package</h3>
            </div>
          </div>
          <div id="designProgressContent" class="design-progress-content"></div>
        </section>
      </div>
    `);

    progressModal = document.getElementById("designProgressModal");
    progressContent = document.getElementById("designProgressContent");
  }

  function showPricingProgressModal() {
    createPricingProgressModalIfNeeded();
    document.getElementById("designPricingProgressContent").textContent = "Estimation in progress...";
    document.getElementById("designPricingProgressModal").classList.remove("is-hidden");
  }

  function hidePricingProgressModal() {
    const pricingModal = document.getElementById("designPricingProgressModal");
    if (pricingModal) pricingModal.classList.add("is-hidden");
  }

  function createPricingProgressModalIfNeeded() {
    if (document.getElementById("designPricingProgressModal")) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div id="designPricingProgressModal" class="modal-backdrop is-hidden" role="alertdialog" aria-modal="true" aria-labelledby="designPricingProgressTitle">
        <section class="modal-panel confirm-panel">
          <div class="modal-header">
            <div>
              <span>Design</span>
              <h3 id="designPricingProgressTitle">Estimate pricing</h3>
            </div>
          </div>
          <div id="designPricingProgressContent" class="confirm-message">Estimation in progress...</div>
        </section>
      </div>
    `);
  }

  function renderFeasibilityAssessment(analysis) {
    const scores = Array.isArray(analysis?.scores) ? analysis.scores : [];
    return `
      <div class="design-feasibility-view">
        ${analysis?.summary ? `<p>${escapeHtml(analysis.summary)}</p>` : ""}
        <div class="feasibility-score-grid">
          ${scores.map((item) => {
            const score = normalizeScore(item?.score);
            return `
              <article class="feasibility-score-card">
                <div>
                  <strong>${escapeHtml(item?.area || "Feasibility")}</strong>
                  <span class="score-pill ${score}">${score}</span>
                </div>
                <p>${escapeHtml(item?.rationale || "No rationale returned.")}</p>
              </article>
            `;
          }).join("")}
        </div>
        ${Array.isArray(analysis?.recommendations) && analysis.recommendations.length ? `
          <h4>Recommendations</h4>
          <ul class="feasibility-recommendations">
            ${analysis.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        ` : ""}
      </div>
    `;
  }

  function renderDesignOutputIcons(product) {
    const outputs = product?.designOutputs || {};
    const available = DESIGN_TYPES.filter((type) => outputs[type.key]?.content);
    if (available.length === 0) return "";

    return `
      <div class="design-output-grid">
        ${available.map((type) => `
          <button class="design-output-button" type="button" data-design-key="${escapeHtml(type.key)}" aria-label="Open ${escapeHtml(type.title)}">
            <span>${escapeHtml(type.icon)}</span>
            <strong>${escapeHtml(outputs[type.key].title || type.title)}</strong>
          </button>
        `).join("")}
      </div>
    `;
  }

  function renderEstimatePricingSection(product) {
    if (!hasAllDesignOutputs(product)) return "";

    return `
      <div class="design-pricing-section">
        <button id="estimateDesignPricingButton" class="secondary-button" type="button" ${isEstimatingPricing ? "disabled" : ""}>
          Estimate pricing
        </button>
        ${renderPricingTable(product.designCostEstimate)}
      </div>
    `;
  }

  function renderPricingTable(estimate) {
    const normalized = estimate?.stages?.length ? estimate : normalizeStagePricingEstimate(estimate);
    const stages = Array.isArray(normalized?.stages) ? normalized.stages : [];
    if (stages.length === 0) return "";

    return `
      <div class="design-pricing-table-wrap">
        ${normalized?.summary ? `<p>${escapeHtml(normalized.summary)}</p>` : ""}
        <table class="design-pricing-table">
          <thead>
            <tr>
              <th>Stage</th>
              <th>Item</th>
              <th>Low</th>
              <th>High</th>
              <th>Basis</th>
            </tr>
          </thead>
          <tbody>
            ${stages.map((item) => `
              <tr class="design-pricing-stage-row">
                <td colspan="2">
                  <strong>${escapeHtml(item.title || item.stage || "Stage")}</strong>
                </td>
                <td>${formatCurrency(item.low, item.currency || normalized.currency)}</td>
                <td>${formatCurrency(item.high, item.currency || normalized.currency)}</td>
                <td>${escapeHtml(item.basis || "")}</td>
              </tr>
              ${renderPricingStageItems(item, normalized.currency)}
            `).join("")}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="2">Total</th>
              <th>${formatCurrency(normalized.totalLow, normalized.currency)}</th>
              <th>${formatCurrency(normalized.totalHigh, normalized.currency)}</th>
              <th></th>
            </tr>
          </tfoot>
        </table>
        <button id="approveDesignPricingButton" class="primary-button" type="button">
          Approve
        </button>
      </div>
    `;
  }

  function renderPricingStageItems(stage, fallbackCurrency) {
    const items = Array.isArray(stage?.items) ? stage.items : [];
    if (items.length === 0) return "";

    return items.map((item) => `
      <tr class="design-pricing-item-row">
        <td></td>
        <td>${escapeHtml(item.title || titleForDesignType(item.designType))}</td>
        <td>${formatCurrency(item.low, item.currency || fallbackCurrency)}</td>
        <td>${formatCurrency(item.high, item.currency || fallbackCurrency)}</td>
        <td>${escapeHtml(item.basis || "")}</td>
      </tr>
    `).join("");
  }

  function openDesignOutput(output) {
    if (!output?.content) return;

    createDesignDocModalIfNeeded();
    designDocTitle.textContent = output.title || "Design";
    designDocContent.innerHTML = app().renderMarkdown ? app().renderMarkdown(output.content) : escapeHtml(output.content);
    designDocModal.classList.remove("is-hidden");
    designDocCloseButton.focus();
  }

  function createDesignDocModalIfNeeded() {
    if (designDocModal) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div id="designDocModal" class="modal-backdrop is-hidden" role="dialog" aria-modal="true" aria-labelledby="designDocTitle">
        <section class="modal-panel design-prd-panel">
          <div class="modal-header">
            <div>
              <span>Design</span>
              <h3 id="designDocTitle">Design</h3>
            </div>
            <button id="designDocCloseButton" class="icon-button" type="button" aria-label="Close design document">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div id="designDocContent" class="design-prd-content prd-markdown"></div>
        </section>
      </div>
    `);

    designDocModal = document.getElementById("designDocModal");
    designDocTitle = document.getElementById("designDocTitle");
    designDocContent = document.getElementById("designDocContent");
    designDocCloseButton = document.getElementById("designDocCloseButton");

    designDocCloseButton.addEventListener("click", closeDesignOutput);
    designDocModal.addEventListener("click", (event) => {
      if (event.target === designDocModal) closeDesignOutput();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && designDocModal && !designDocModal.classList.contains("is-hidden")) closeDesignOutput();
    });
  }

  function closeDesignOutput() {
    if (!designDocModal) return;
    designDocModal.classList.add("is-hidden");
  }

  function openPrototypePaymentModal(product) {
    const prototypePricing = designPricingCore().getPrototypePricing(product?.designCostEstimate);
    if (!prototypePricing) return;
    if (!window.PrototypeStage?.openPaymentModal) return;
    window.PrototypeStage.openPaymentModal({
      prototypePricing,
      formatCurrency,
      titleForDesignType,
      escapeHtml,
      onConfirm: () => completeDesignApproval(product)
    });
  }

  function getLatestPrd(product) {
    return product?.prdOutputs?.[1] || product?.prdOutputs?.[0] || null;
  }

  function getFeasibilityAnalysis(product) {
    return product?.feasibilityAnalyses?.[2] || null;
  }

  function hasAllDesignOutputs(product) {
    return DESIGN_TYPES.every((type) => product?.designOutputs?.[type.key]?.content);
  }

  function titleForDesignType(designType) {
    return DESIGN_TYPES.find((type) => type.key === designType)?.title || designType || "Design";
  }

  function normalizeStagePricingEstimate(estimate) {
    return {
      ...designPricingCore().buildStagePricingEstimate(estimate),
      estimatedAt: new Date().toISOString()
    };
  }

  function designPricingCore() {
    return window.DesignPricingCore || fallbackDesignPricingCore();
  }

  function fallbackDesignPricingCore() {
    const stages = [
      ["prototype", "Prototype", 0.25, "First functional build, prototype validation, integration support, and early test readiness."],
      ["evt", "EVT", 0.25, "Engineering validation units, core requirement testing, debug cycles, and engineering fixes."],
      ["dvt", "DVT", 0.225, "Design validation units, reliability testing, compliance preparation, and design verification."],
      ["pvt", "PVT", 0.175, "Pilot production validation, fixtures, process checks, quality gates, and yield readiness."],
      ["mp", "MP", 0.1, "Mass production release support, supplier readiness, launch checks, and production handoff."]
    ];
    return {
      buildStagePricingEstimate(sourceEstimate) {
        const source = sourceEstimate && typeof sourceEstimate === "object" ? sourceEstimate : {};
        const currency = typeof source.currency === "string" && source.currency ? source.currency : "USD";
        const items = normalizeSourcePricingItems(source.items, currency);
        const stageRows = stages.map((stage, index) => {
          const stageItems = items.map((item) => {
            const lowValues = distribute(item.low, stages);
            const highValues = distribute(item.high, stages);
            return {
              designType: item.designType,
              title: item.title,
              low: lowValues[index],
              high: highValues[index],
              currency: item.currency,
              basis: item.basis
            };
          });
          return {
            stage: stage[0],
            title: stage[1],
            low: stageItems.reduce((sum, item) => sum + item.low, 0),
            high: stageItems.reduce((sum, item) => sum + item.high, 0),
            currency,
            basis: stage[3],
            items: stageItems
          };
        });
        return {
          ...source,
          summary: typeof source.summary === "string" && source.summary ? source.summary : "Pricing estimate by delivery stage.",
          currency,
          sourceItems: items,
          stages: stageRows,
          totalLow: stageRows.reduce((sum, item) => sum + item.low, 0),
          totalHigh: stageRows.reduce((sum, item) => sum + item.high, 0)
        };
      },
      getPrototypePricing(estimate) {
        return estimate?.stages?.find((stage) => stage.stage === "prototype") || null;
      }
    };
  }

  function normalizeSourcePricingItems(items, fallbackCurrency) {
    return (Array.isArray(items) ? items : []).map((item) => ({
      designType: typeof item?.designType === "string" ? item.designType : "",
      title: typeof item?.title === "string" ? item.title : titleForDesignType(item?.designType),
      low: numeric(item?.low),
      high: numeric(item?.high),
      currency: typeof item?.currency === "string" && item.currency ? item.currency : fallbackCurrency,
      basis: typeof item?.basis === "string" ? item.basis : ""
    }));
  }

  function distribute(total, stages) {
    const rounded = stages.map((stage) => Math.round(total * stage[2]));
    const delta = Math.round(total) - rounded.reduce((sum, value) => sum + value, 0);
    rounded[rounded.length - 1] += delta;
    return rounded;
  }

  function numeric(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function formatCurrency(value, currency = "USD") {
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0
    }).format(number);
  }

  function normalizeScore(score) {
    const value = String(score || "").toLowerCase();
    return value === "high" || value === "medium" || value === "low" ? value : "low";
  }

  function parseResponseBody(body) {
    if (!body) return {};
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  function app() {
    return window.MakeflowAppState;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  window.DesignStage = {
    renderStage
  };
})();
