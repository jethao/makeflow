(function() {
  let mpPaymentModal = null;
  let mpPaymentModalContent = null;
  let mpPaymentCloseButton = null;

  const MOCK_PROGRESS = [
    { label: "Line", value: 89 },
    { label: "QA", value: 86 },
    { label: "ME", value: 94 },
    { label: "EE", value: 90 },
    { label: "Test", value: 81 }
  ];

  const MOCK_TEST_STATUS = [
    { label: "Passed", value: 58, color: "#12905a" },
    { label: "Failed", value: 6, color: "#c2410c" },
    { label: "Blocker", value: 1, color: "#b91c1c" },
    { label: "Not run", value: 7, color: "#8791a1" }
  ];

  function renderStage(product, elements) {
    const pvtPricing = getStagePricing(product, "pvt");
    const mpPricing = getStagePricing(product, "mp");

    elements.productRows.forEach((row) => { if (row) row.style.display = "none"; });
    if (elements.checklistNextButton) elements.checklistNextButton.style.display = "none";
    if (elements.heading) elements.heading.style.display = "none";
    if (elements.actionRow) elements.actionRow.style.display = "none";
    elements.specWorkbench.classList.add("is-hidden");

    elements.checklist.innerHTML = `
      <li class="check-item prd-drafted">
        <div class="pvt-stage">
          <div class="section-heading">
            <h3>PVT workspace</h3>
            <span>${pvtPricing ? "Estimate ready" : "No PVT estimate"}</span>
          </div>
          <p>${pvtPricing ? "Use the approved PVT estimate to validate the production process, quality controls, and ramp readiness before MP handoff." : "Approve PVT pricing from DVT before starting production validation."}</p>
          ${pvtPricing ? renderStageEstimate("PVT estimate", pvtPricing) : ""}
          ${renderPvtProgress()}
          ${renderPvtTestChart()}
          ${renderFactoryReadiness()}
          ${renderSupplierReadiness()}
          ${renderComplianceReadiness()}
          ${renderMpEstimate(mpPricing)}
        </div>
      </li>
    `;
    elements.checklistCount.textContent = "";

    const approveMpButton = document.getElementById("approveMpEstimateButton");
    if (approveMpButton) {
      approveMpButton.addEventListener("click", () => openMpPaymentModal(product, app()));
    }
  }

  function openMpPaymentModal(product, deps = {}) {
    const mpPricing = getStagePricing(product, "mp");
    if (!mpPricing) return;

    createMpPaymentModalIfNeeded();
    mpPaymentModalContent.innerHTML = renderMpPaymentSummary(mpPricing);
    const confirmButton = document.getElementById("mpPaymentConfirmButton");
    if (confirmButton) {
      confirmButton.onclick = () => {
        approveMpPayment(product, deps);
        closeMpPaymentModal();
      };
    }

    mpPaymentModal.classList.remove("is-hidden");
    confirmButton?.focus();
  }

  function createMpPaymentModalIfNeeded() {
    if (mpPaymentModal) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div id="mpPaymentModal" class="modal-backdrop is-hidden" role="dialog" aria-modal="true" aria-labelledby="mpPaymentTitle">
        <section class="modal-panel confirm-panel">
          <div class="modal-header">
            <div>
              <span>MP</span>
              <h3 id="mpPaymentTitle">Pay MP estimate</h3>
            </div>
            <button id="mpPaymentCloseButton" class="icon-button" type="button" aria-label="Close MP payment window">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div id="mpPaymentContent" class="confirm-message"></div>
          <div class="modal-footer">
            <button id="mpPaymentCancelButton" class="secondary-button" type="button">Cancel</button>
            <button id="mpPaymentConfirmButton" class="primary-button" type="button">Pay mock MP estimate</button>
          </div>
        </section>
      </div>
    `);

    mpPaymentModal = document.getElementById("mpPaymentModal");
    mpPaymentModalContent = document.getElementById("mpPaymentContent");
    mpPaymentCloseButton = document.getElementById("mpPaymentCloseButton");

    mpPaymentCloseButton.addEventListener("click", closeMpPaymentModal);
    document.getElementById("mpPaymentCancelButton").addEventListener("click", closeMpPaymentModal);
    mpPaymentModal.addEventListener("click", (event) => {
      if (event.target === mpPaymentModal) closeMpPaymentModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && mpPaymentModal && !mpPaymentModal.classList.contains("is-hidden")) closeMpPaymentModal();
    });
  }

  function closeMpPaymentModal() {
    if (!mpPaymentModal) return;
    mpPaymentModal.classList.add("is-hidden");
  }

  function approveMpPayment(product, deps) {
    if (!product || !Array.isArray(product.completed)) return;
    product.completed[7] = true;
    if (typeof deps.logActivity === "function") deps.logActivity("MP estimate payment mocked and MP unlocked");
    if (typeof deps.persist === "function") deps.persist();
    if (typeof deps.render === "function") deps.render();
  }

  function getStagePricing(product, key) {
    return product?.designCostEstimate?.stages?.find((stage) => stage.stage === key) || null;
  }

  function renderStageEstimate(label, pricing) {
    return `
      <div class="pvt-stage-estimate">
        <span>${defaultEscapeHtml(label)}</span>
        <strong>${defaultFormatCurrency(pricing.low, pricing.currency)} - ${defaultFormatCurrency(pricing.high, pricing.currency)}</strong>
      </div>
    `;
  }

  function renderMpEstimate(mpPricing) {
    if (!mpPricing) return "";

    return `
      <section class="pvt-mp-estimate">
        <div>
          <span>MP estimate</span>
          <strong>${defaultFormatCurrency(mpPricing.low, mpPricing.currency)} - ${defaultFormatCurrency(mpPricing.high, mpPricing.currency)}</strong>
        </div>
        <button id="approveMpEstimateButton" class="primary-button" type="button">Approve MP</button>
      </section>
    `;
  }

  function renderPvtProgress() {
    return `
      <section class="pvt-progress-panel" aria-label="PVT discipline progress">
        <h4>Validation progress</h4>
        <div class="pvt-progress-list">
          ${MOCK_PROGRESS.map((item) => `
            <div class="pvt-progress-row">
              <span>${defaultEscapeHtml(item.label)}</span>
              <div class="pvt-progress-track" aria-label="${defaultEscapeHtml(item.label)} ${item.value}% complete">
                <span style="width: ${item.value}%"></span>
              </div>
              <strong>${item.value}%</strong>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderPvtTestChart() {
    const total = MOCK_TEST_STATUS.reduce((sum, item) => sum + item.value, 0);
    let cursor = 0;
    const segments = MOCK_TEST_STATUS.map((item) => {
      const start = cursor;
      const end = cursor + (item.value / total) * 100;
      cursor = end;
      return `${item.color} ${start}% ${end}%`;
    }).join(", ");

    return `
      <section class="pvt-test-panel" aria-label="PVT test status">
        <h4>Mock test status</h4>
        <div class="pvt-test-layout">
          <div class="pvt-test-pie" style="background: conic-gradient(${segments});" aria-hidden="true"></div>
          <div class="pvt-test-legend">
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
      <section class="pvt-factory-card" aria-label="PVT factory readiness">
        <div class="section-heading">
          <h4>Factory readiness</h4>
          <span>Mock yield 95%</span>
        </div>
        <div class="pvt-factory-grid">
          <div>
            <span>Pilot yield</span>
            <strong>286 / 302 units</strong>
            <em>Golden sample limits locked, final fixture GRR complete, process escapes under QA review.</em>
          </div>
          <div>
            <span>Production ramp</span>
            <strong>MP gate: Sep 3</strong>
            <em>Line balance Sep 1, first article Sep 2, mass production release review Sep 3.</em>
          </div>
        </div>
      </section>
    `;
  }

  function renderSupplierReadiness() {
    return `
      <section class="pvt-supplier-card" aria-label="PVT supplier readiness">
        <div class="section-heading">
          <h4>Supplier readiness</h4>
          <span>Mock coverage 92%</span>
        </div>
        <div class="pvt-supplier-grid">
          <div>
            <span>Critical parts</span>
            <strong>18 / 20 approved</strong>
            <em>Long-lead IC and injection tooling PPAP remain under final supplier sign-off.</em>
          </div>
          <div>
            <span>Supplier quality</span>
            <strong>4 audits closed</strong>
            <em>Incoming inspection limits, corrective actions, and golden sample criteria are staged for MP.</em>
          </div>
        </div>
      </section>
    `;
  }

  function renderComplianceReadiness() {
    return `
      <section class="pvt-compliance-card" aria-label="PVT compliance readiness">
        <div class="section-heading">
          <h4>Compliance readiness</h4>
          <span>Mock release 90%</span>
        </div>
        <div class="pvt-compliance-grid">
          <div>
            <span>Reliability release</span>
            <strong>Final report queued</strong>
            <em>Burn-in, drop, thermal cycle, and packaging validation are consolidated for MP release.</em>
          </div>
          <div>
            <span>Certification pack</span>
            <strong>Agency files ready</strong>
            <em>Label artwork, declarations, traceability records, and final test evidence are staged for submission.</em>
          </div>
        </div>
      </section>
    `;
  }

  function renderMpPaymentSummary(mpPricing) {
    return `
      <div class="pvt-payment-summary">
        <p>Mock payment for the MP estimate.</p>
        <div class="pvt-payment-amount">
          <span>MP estimate</span>
          <strong>${defaultFormatCurrency(mpPricing.low, mpPricing.currency)} - ${defaultFormatCurrency(mpPricing.high, mpPricing.currency)}</strong>
        </div>
        ${renderMpPaymentItems(mpPricing)}
        <dl class="pvt-payment-fields">
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

  function renderMpPaymentItems(mpPricing) {
    const items = Array.isArray(mpPricing?.items) ? mpPricing.items : [];
    if (items.length === 0) return "";

    return `
      <div class="pvt-payment-items">
        ${items.map((item) => `
          <div>
            <span>${defaultEscapeHtml(item.title || defaultTitleForDesignType(item.designType))}</span>
            <strong>${defaultFormatCurrency(item.low, item.currency || mpPricing.currency)} - ${defaultFormatCurrency(item.high, item.currency || mpPricing.currency)}</strong>
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

  window.PVTStage = {
    renderStage,
    openMpPaymentModal,
    closeMpPaymentModal
  };
})();
