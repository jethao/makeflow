(function() {
  let pvtPaymentModal = null;
  let pvtPaymentModalContent = null;
  let pvtPaymentCloseButton = null;

  const MOCK_PROGRESS = [
    { label: "ME", value: 91 },
    { label: "EE", value: 84 },
    { label: "SW", value: 78 },
    { label: "ID", value: 93 },
    { label: "Test", value: 72 }
  ];

  const MOCK_TEST_STATUS = [
    { label: "Passed", value: 42, color: "#12905a" },
    { label: "Failed", value: 4, color: "#c2410c" },
    { label: "Blocker", value: 2, color: "#b91c1c" },
    { label: "Not run", value: 8, color: "#8791a1" }
  ];

  function renderStage(product, elements) {
    const dvtPricing = getStagePricing(product, "dvt");
    const pvtPricing = getStagePricing(product, "pvt");

    elements.productRows.forEach((row) => { if (row) row.style.display = "none"; });
    if (elements.checklistNextButton) elements.checklistNextButton.style.display = "none";
    if (elements.heading) elements.heading.style.display = "none";
    if (elements.actionRow) elements.actionRow.style.display = "none";
    elements.specWorkbench.classList.add("is-hidden");

    elements.checklist.innerHTML = `
      <li class="check-item prd-drafted">
        <div class="dvt-stage">
          <div class="section-heading">
            <h3>DVT workspace</h3>
            <span>${dvtPricing ? "Estimate ready" : "No DVT estimate"}</span>
          </div>
          <p>${dvtPricing ? "Use the approved DVT estimate to validate full specifications, reliability, and compliance before PVT handoff." : "Approve DVT pricing from EVT before starting design validation."}</p>
          ${dvtPricing ? renderStageEstimate("DVT estimate", dvtPricing) : ""}
          ${renderDvtProgress()}
          ${renderDvtTestChart()}
          ${renderFactoryReadiness()}
          ${renderComplianceReadiness()}
          ${renderPvtEstimate(pvtPricing)}
        </div>
      </li>
    `;
    elements.checklistCount.textContent = "";

    const approvePvtButton = document.getElementById("approvePvtEstimateButton");
    if (approvePvtButton) {
      approvePvtButton.addEventListener("click", () => openPvtPaymentModal(product, app()));
    }
  }

  function openPvtPaymentModal(product, deps = {}) {
    const pvtPricing = getStagePricing(product, "pvt");
    if (!pvtPricing) return;

    createPvtPaymentModalIfNeeded();
    pvtPaymentModalContent.innerHTML = renderPvtPaymentSummary(pvtPricing);
    const confirmButton = document.getElementById("pvtPaymentConfirmButton");
    if (confirmButton) {
      confirmButton.onclick = () => {
        approvePvtPayment(product, deps);
        closePvtPaymentModal();
      };
    }

    pvtPaymentModal.classList.remove("is-hidden");
    confirmButton?.focus();
  }

  function createPvtPaymentModalIfNeeded() {
    if (pvtPaymentModal) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div id="pvtPaymentModal" class="modal-backdrop is-hidden" role="dialog" aria-modal="true" aria-labelledby="pvtPaymentTitle">
        <section class="modal-panel confirm-panel">
          <div class="modal-header">
            <div>
              <span>PVT</span>
              <h3 id="pvtPaymentTitle">Pay PVT estimate</h3>
            </div>
            <button id="pvtPaymentCloseButton" class="icon-button" type="button" aria-label="Close PVT payment window">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div id="pvtPaymentContent" class="confirm-message"></div>
          <div class="modal-footer">
            <button id="pvtPaymentCancelButton" class="secondary-button" type="button">Cancel</button>
            <button id="pvtPaymentConfirmButton" class="primary-button" type="button">Pay mock PVT estimate</button>
          </div>
        </section>
      </div>
    `);

    pvtPaymentModal = document.getElementById("pvtPaymentModal");
    pvtPaymentModalContent = document.getElementById("pvtPaymentContent");
    pvtPaymentCloseButton = document.getElementById("pvtPaymentCloseButton");

    pvtPaymentCloseButton.addEventListener("click", closePvtPaymentModal);
    document.getElementById("pvtPaymentCancelButton").addEventListener("click", closePvtPaymentModal);
    pvtPaymentModal.addEventListener("click", (event) => {
      if (event.target === pvtPaymentModal) closePvtPaymentModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && pvtPaymentModal && !pvtPaymentModal.classList.contains("is-hidden")) closePvtPaymentModal();
    });
  }

  function closePvtPaymentModal() {
    if (!pvtPaymentModal) return;
    pvtPaymentModal.classList.add("is-hidden");
  }

  function approvePvtPayment(product, deps) {
    if (!product || !Array.isArray(product.completed)) return;
    product.completed[6] = true;
    if (typeof deps.logActivity === "function") deps.logActivity("PVT estimate payment mocked and PVT unlocked");
    if (typeof deps.persist === "function") deps.persist();
    if (typeof deps.render === "function") deps.render();
  }

  function getStagePricing(product, key) {
    return product?.designCostEstimate?.stages?.find((stage) => stage.stage === key) || null;
  }

  function renderStageEstimate(label, pricing) {
    return `
      <div class="dvt-stage-estimate">
        <span>${defaultEscapeHtml(label)}</span>
        <strong>${defaultFormatCurrency(pricing.low, pricing.currency)} - ${defaultFormatCurrency(pricing.high, pricing.currency)}</strong>
      </div>
    `;
  }

  function renderPvtEstimate(pvtPricing) {
    if (!pvtPricing) return "";

    return `
      <section class="dvt-pvt-estimate">
        <div>
          <span>PVT estimate</span>
          <strong>${defaultFormatCurrency(pvtPricing.low, pvtPricing.currency)} - ${defaultFormatCurrency(pvtPricing.high, pvtPricing.currency)}</strong>
        </div>
        <button id="approvePvtEstimateButton" class="primary-button" type="button">Approve PVT</button>
      </section>
    `;
  }

  function renderDvtProgress() {
    return `
      <section class="dvt-progress-panel" aria-label="DVT discipline progress">
        <h4>Validation progress</h4>
        <div class="dvt-progress-list">
          ${MOCK_PROGRESS.map((item) => `
            <div class="dvt-progress-row">
              <span>${defaultEscapeHtml(item.label)}</span>
              <div class="dvt-progress-track" aria-label="${defaultEscapeHtml(item.label)} ${item.value}% complete">
                <span style="width: ${item.value}%"></span>
              </div>
              <strong>${item.value}%</strong>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderDvtTestChart() {
    const total = MOCK_TEST_STATUS.reduce((sum, item) => sum + item.value, 0);
    let cursor = 0;
    const segments = MOCK_TEST_STATUS.map((item) => {
      const start = cursor;
      const end = cursor + (item.value / total) * 100;
      cursor = end;
      return `${item.color} ${start}% ${end}%`;
    }).join(", ");

    return `
      <section class="dvt-test-panel" aria-label="DVT test status">
        <h4>Mock test status</h4>
        <div class="dvt-test-layout">
          <div class="dvt-test-pie" style="background: conic-gradient(${segments});" aria-hidden="true"></div>
          <div class="dvt-test-legend">
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
      <section class="dvt-factory-card" aria-label="DVT factory readiness">
        <div class="section-heading">
          <h4>Factory readiness</h4>
          <span>Mock yield 88%</span>
        </div>
        <div class="dvt-factory-grid">
          <div>
            <span>Mock yield</span>
            <strong>53 / 60 units</strong>
            <em>DVT pilot units accepted after enclosure tolerance and RF shield rework.</em>
          </div>
          <div>
            <span>Manufacture schedule</span>
            <strong>Pilot line: Aug 5</strong>
            <em>Fixture validation Aug 1, DVT build Aug 5-9, PVT handoff review Aug 14.</em>
          </div>
        </div>
      </section>
    `;
  }

  function renderComplianceReadiness() {
    return `
      <section class="dvt-compliance-card" aria-label="DVT compliance readiness">
        <div class="section-heading">
          <h4>Compliance readiness</h4>
          <span>Mock reliability 87%</span>
        </div>
        <div class="dvt-compliance-grid">
          <div>
            <span>Reliability run</span>
            <strong>312 / 360 hrs</strong>
            <em>HALT fixtures booked, thermal cycle drift under investigation, burn-in exit review Jul 29.</em>
          </div>
          <div>
            <span>Certification pack</span>
            <strong>Pre-scan ready</strong>
            <em>EMC pre-scan, safety checklist, and material declarations queued for compliance review.</em>
          </div>
        </div>
      </section>
    `;
  }

  function renderPvtPaymentSummary(pvtPricing) {
    return `
      <div class="dvt-payment-summary">
        <p>Mock payment for the PVT estimate.</p>
        <div class="dvt-payment-amount">
          <span>PVT estimate</span>
          <strong>${defaultFormatCurrency(pvtPricing.low, pvtPricing.currency)} - ${defaultFormatCurrency(pvtPricing.high, pvtPricing.currency)}</strong>
        </div>
        ${renderPvtPaymentItems(pvtPricing)}
        <dl class="dvt-payment-fields">
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

  function renderPvtPaymentItems(pvtPricing) {
    const items = Array.isArray(pvtPricing?.items) ? pvtPricing.items : [];
    if (items.length === 0) return "";

    return `
      <div class="dvt-payment-items">
        ${items.map((item) => `
          <div>
            <span>${defaultEscapeHtml(item.title || defaultTitleForDesignType(item.designType))}</span>
            <strong>${defaultFormatCurrency(item.low, item.currency || pvtPricing.currency)} - ${defaultFormatCurrency(item.high, item.currency || pvtPricing.currency)}</strong>
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

  window.DVTStage = {
    renderStage,
    openPvtPaymentModal,
    closePvtPaymentModal
  };
})();
