(function() {
  let dvtPaymentModal = null;
  let dvtPaymentModalContent = null;
  let dvtPaymentCloseButton = null;

  const MOCK_PROGRESS = [
    { label: "ME", value: 82 },
    { label: "EE", value: 76 },
    { label: "SW", value: 69 },
    { label: "ID", value: 88 },
    { label: "Test", value: 54 }
  ];

  const MOCK_TEST_STATUS = [
    { label: "Passed", value: 26, color: "#12905a" },
    { label: "Failed", value: 5, color: "#c2410c" },
    { label: "Blocker", value: 3, color: "#b91c1c" },
    { label: "Not run", value: 12, color: "#8791a1" }
  ];

  const MOCK_FACTORY_ISSUES = [
    { title: "Fixture repeatability drift", owner: "Manufacturing", status: "Containment active" },
    { title: "Battery door flash", owner: "Tooling", status: "Mold polish queued" },
    { title: "Antenna solder voids", owner: "SMT", status: "Profile tuning" },
    { title: "Thermal pad placement", owner: "Process", status: "Work instruction update" },
    { title: "Label adhesion variance", owner: "Quality", status: "Material sample review" }
  ];

  function renderStage(product, elements) {
    const evtPricing = getStagePricing(product, "evt");
    const dvtPricing = getStagePricing(product, "dvt");

    elements.productRows.forEach((row) => { if (row) row.style.display = "none"; });
    if (elements.checklistNextButton) elements.checklistNextButton.style.display = "none";
    if (elements.heading) elements.heading.style.display = "none";
    if (elements.actionRow) elements.actionRow.style.display = "none";
    elements.specWorkbench.classList.add("is-hidden");

    elements.checklist.innerHTML = `
      <li class="check-item prd-drafted">
        <div class="evt-stage">
          <div class="section-heading">
            <h3>EVT workspace</h3>
            <span>${evtPricing ? "Estimate ready" : "No EVT estimate"}</span>
          </div>
          <p>${evtPricing ? "Use the approved EVT estimate to track validation progress and prepare DVT handoff." : "Approve EVT pricing from Prototype before starting EVT validation."}</p>
          ${evtPricing ? renderStageEstimate("EVT estimate", evtPricing) : ""}
          ${renderEvtProgress()}
          ${renderEvtTestChart()}
          ${renderFactoryReadiness()}
          ${renderDvtEstimate(dvtPricing)}
        </div>
      </li>
    `;
    elements.checklistCount.textContent = "";

    const approveDvtButton = document.getElementById("approveDvtEstimateButton");
    if (approveDvtButton) {
      approveDvtButton.addEventListener("click", () => openDvtPaymentModal(product, app()));
    }
  }

  function openDvtPaymentModal(product, deps = {}) {
    const dvtPricing = getStagePricing(product, "dvt");
    if (!dvtPricing) return;

    createDvtPaymentModalIfNeeded();
    dvtPaymentModalContent.innerHTML = renderDvtPaymentSummary(dvtPricing);
    const confirmButton = document.getElementById("dvtPaymentConfirmButton");
    if (confirmButton) {
      confirmButton.onclick = () => {
        approveDvtPayment(product, deps);
        closeDvtPaymentModal();
      };
    }

    dvtPaymentModal.classList.remove("is-hidden");
    confirmButton?.focus();
  }

  function createDvtPaymentModalIfNeeded() {
    if (dvtPaymentModal) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div id="dvtPaymentModal" class="modal-backdrop is-hidden" role="dialog" aria-modal="true" aria-labelledby="dvtPaymentTitle">
        <section class="modal-panel confirm-panel">
          <div class="modal-header">
            <div>
              <span>DVT</span>
              <h3 id="dvtPaymentTitle">Pay DVT estimate</h3>
            </div>
            <button id="dvtPaymentCloseButton" class="icon-button" type="button" aria-label="Close DVT payment window">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div id="dvtPaymentContent" class="confirm-message"></div>
          <div class="modal-footer">
            <button id="dvtPaymentCancelButton" class="secondary-button" type="button">Cancel</button>
            <button id="dvtPaymentConfirmButton" class="primary-button" type="button">Pay mock DVT estimate</button>
          </div>
        </section>
      </div>
    `);

    dvtPaymentModal = document.getElementById("dvtPaymentModal");
    dvtPaymentModalContent = document.getElementById("dvtPaymentContent");
    dvtPaymentCloseButton = document.getElementById("dvtPaymentCloseButton");

    dvtPaymentCloseButton.addEventListener("click", closeDvtPaymentModal);
    document.getElementById("dvtPaymentCancelButton").addEventListener("click", closeDvtPaymentModal);
    dvtPaymentModal.addEventListener("click", (event) => {
      if (event.target === dvtPaymentModal) closeDvtPaymentModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && dvtPaymentModal && !dvtPaymentModal.classList.contains("is-hidden")) closeDvtPaymentModal();
    });
  }

  function closeDvtPaymentModal() {
    if (!dvtPaymentModal) return;
    dvtPaymentModal.classList.add("is-hidden");
  }

  function approveDvtPayment(product, deps) {
    if (!product || !Array.isArray(product.completed)) return;
    product.completed[5] = true;
    if (typeof deps.logActivity === "function") deps.logActivity("DVT estimate payment mocked and DVT unlocked");
    if (typeof deps.persist === "function") deps.persist();
    if (typeof deps.render === "function") deps.render();
  }

  function getStagePricing(product, key) {
    return product?.designCostEstimate?.stages?.find((stage) => stage.stage === key) || null;
  }

  function renderStageEstimate(label, pricing) {
    return `
      <div class="evt-stage-estimate">
        <span>${defaultEscapeHtml(label)}</span>
        <strong>${defaultFormatCurrency(pricing.low, pricing.currency)} - ${defaultFormatCurrency(pricing.high, pricing.currency)}</strong>
      </div>
    `;
  }

  function renderDvtEstimate(dvtPricing) {
    if (!dvtPricing) return "";

    return `
      <section class="evt-dvt-estimate">
        <div>
          <span>DVT estimate</span>
          <strong>${defaultFormatCurrency(dvtPricing.low, dvtPricing.currency)} - ${defaultFormatCurrency(dvtPricing.high, dvtPricing.currency)}</strong>
        </div>
        <button id="approveDvtEstimateButton" class="primary-button" type="button">Approve DVT</button>
      </section>
    `;
  }

  function renderEvtProgress() {
    return `
      <section class="evt-progress-panel" aria-label="EVT discipline progress">
        <h4>Validation progress</h4>
        <div class="evt-progress-list">
          ${MOCK_PROGRESS.map((item) => `
            <div class="evt-progress-row">
              <span>${defaultEscapeHtml(item.label)}</span>
              <div class="evt-progress-track" aria-label="${defaultEscapeHtml(item.label)} ${item.value}% complete">
                <span style="width: ${item.value}%"></span>
              </div>
              <strong>${item.value}%</strong>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderEvtTestChart() {
    const total = MOCK_TEST_STATUS.reduce((sum, item) => sum + item.value, 0);
    let cursor = 0;
    const segments = MOCK_TEST_STATUS.map((item) => {
      const start = cursor;
      const end = cursor + (item.value / total) * 100;
      cursor = end;
      return `${item.color} ${start}% ${end}%`;
    }).join(", ");

    return `
      <section class="evt-test-panel" aria-label="EVT test status">
        <h4>Mock test status</h4>
        <div class="evt-test-layout">
          <div class="evt-test-pie" style="background: conic-gradient(${segments});" aria-hidden="true"></div>
          <div class="evt-test-legend">
            ${MOCK_TEST_STATUS.map((item) => `
              <div>
                <span style="background: ${item.color};"></span>
                <strong>${defaultEscapeHtml(item.label)}</strong>
                <em>${item.value}</em>
              </div>
            `).join("")}
          </div>
        </div>
      </section>
    `;
  }

  function renderFactoryReadiness() {
    return `
      <section class="evt-factory-card" aria-label="EVT factory readiness">
        <div class="section-heading">
          <h4>Factory readiness</h4>
          <span>Mock yield 91%</span>
        </div>
        <div class="evt-factory-grid">
          <div>
            <span>Mock yield</span>
            <strong>91%</strong>
            <em>42 / 46 EVT units accepted</em>
          </div>
          <div>
            <span>Manufacture schedule</span>
            <strong>Pilot line: Jul 8</strong>
            <em>Fixture calibration Jul 5, EVT build Jul 8-12, validation review Jul 15.</em>
          </div>
          <div class="evt-factory-issues-card">
            <span>Top 5 factory issues</span>
            <ol class="evt-factory-issues">
              ${MOCK_FACTORY_ISSUES.map((issue) => `
                <li class="evt-factory-issue">
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

  function renderDvtPaymentSummary(dvtPricing) {
    return `
      <div class="evt-payment-summary">
        <p>Mock payment for the DVT estimate.</p>
        <div class="evt-payment-amount">
          <span>DVT estimate</span>
          <strong>${defaultFormatCurrency(dvtPricing.low, dvtPricing.currency)} - ${defaultFormatCurrency(dvtPricing.high, dvtPricing.currency)}</strong>
        </div>
        ${renderDvtPaymentItems(dvtPricing)}
        <dl class="evt-payment-fields">
          <div>
            <dt>Card</dt>
            <dd>4242 4242 4242 4242</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>Mock authorization only</dd>
          </div>
        </dl>
      </div>
    `;
  }

  function renderDvtPaymentItems(dvtPricing) {
    const items = Array.isArray(dvtPricing?.items) ? dvtPricing.items : [];
    if (items.length === 0) return "";

    return `
      <div class="evt-payment-items">
        ${items.map((item) => `
          <div>
            <span>${defaultEscapeHtml(item.title || defaultTitleForDesignType(item.designType))}</span>
            <strong>${defaultFormatCurrency(item.low, item.currency || dvtPricing.currency)} - ${defaultFormatCurrency(item.high, item.currency || dvtPricing.currency)}</strong>
          </div>
        `).join("")}
      </div>
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

  function defaultTitleForDesignType(designType) {
    return designType || "Design";
  }

  function defaultEscapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function app() {
    return window.MakeflowAppState || {};
  }

  window.EVTStage = {
    renderStage,
    openDvtPaymentModal,
    closeDvtPaymentModal
  };
})();
