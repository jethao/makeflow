(function() {
  let paymentModal = null;
  let paymentModalContent = null;
  let paymentCloseButton = null;
  let confirmPayment = null;
  let evtPaymentModal = null;
  let evtPaymentModalContent = null;
  let evtPaymentCloseButton = null;

  const MOCK_PROGRESS = [
    { label: "ME", value: 72 },
    { label: "EE", value: 58 },
    { label: "SW", value: 64 },
    { label: "ID", value: 46 },
    { label: "Test", value: 35 }
  ];

  const MOCK_TEST_STATUS = [
    { label: "Passed", value: 18, color: "#12905a" },
    { label: "Failed", value: 4, color: "#c2410c" },
    { label: "Blocker", value: 2, color: "#b91c1c" },
    { label: "Not run", value: 10, color: "#8791a1" }
  ];

  function renderStage(product, elements) {
    const prototypePricing = getPrototypePricing(product);
    const evtPricing = getEvtPricing(product);

    elements.productRows.forEach((row) => { if (row) row.style.display = "none"; });
    if (elements.checklistNextButton) elements.checklistNextButton.style.display = "none";
    if (elements.heading) elements.heading.style.display = "none";
    if (elements.actionRow) elements.actionRow.style.display = "none";
    elements.specWorkbench.classList.add("is-hidden");

    elements.checklist.innerHTML = `
      <li class="check-item prd-drafted">
        <div class="prototype-stage">
          <div class="section-heading">
            <h3>Prototype workspace</h3>
            <span>${prototypePricing ? "Estimate ready" : "No prototype estimate"}</span>
          </div>
          <p>${prototypePricing ? "Use the approved prototype estimate to coordinate build planning and validation work." : "Approve design pricing to prepare the prototype handoff."}</p>
          ${prototypePricing ? renderPrototypeEstimate(prototypePricing) : ""}
          ${renderPrototypeProgress()}
          ${renderPrototypeTestChart()}
          ${renderEvtEstimate(evtPricing)}
        </div>
      </li>
    `;
    elements.checklistCount.textContent = "";

    const approveEvtButton = document.getElementById("approveEvtEstimateButton");
    if (approveEvtButton) {
      approveEvtButton.addEventListener("click", () => openEvtPaymentModal(product, app()));
    }
  }

  function openPaymentModal(options) {
    const prototypePricing = options?.prototypePricing;
    if (!prototypePricing) return;

    confirmPayment = typeof options.onConfirm === "function" ? options.onConfirm : null;
    createPrototypePaymentModalIfNeeded();
    paymentModalContent.innerHTML = renderPrototypePaymentSummary(prototypePricing, options);

    const confirmButton = document.getElementById("prototypePaymentConfirmButton");
    if (confirmButton) confirmButton.onclick = () => {
      if (confirmPayment) confirmPayment();
      closePaymentModal();
    };

    paymentModal.classList.remove("is-hidden");
    confirmButton?.focus();
  }

  function createPrototypePaymentModalIfNeeded() {
    if (paymentModal) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div id="prototypePaymentModal" class="modal-backdrop is-hidden" role="dialog" aria-modal="true" aria-labelledby="prototypePaymentTitle">
        <section class="modal-panel confirm-panel">
          <div class="modal-header">
            <div>
              <span>Prototype</span>
              <h3 id="prototypePaymentTitle">Pay pricing estimate</h3>
            </div>
            <button id="prototypePaymentCloseButton" class="icon-button" type="button" aria-label="Close payment window">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div id="prototypePaymentContent" class="confirm-message"></div>
          <div class="modal-footer">
            <button id="prototypePaymentCancelButton" class="secondary-button" type="button">Cancel</button>
            <button id="prototypePaymentConfirmButton" class="primary-button" type="button">Pay mock estimate</button>
          </div>
        </section>
      </div>
    `);

    paymentModal = document.getElementById("prototypePaymentModal");
    paymentModalContent = document.getElementById("prototypePaymentContent");
    paymentCloseButton = document.getElementById("prototypePaymentCloseButton");

    paymentCloseButton.addEventListener("click", closePaymentModal);
    document.getElementById("prototypePaymentCancelButton").addEventListener("click", closePaymentModal);
    paymentModal.addEventListener("click", (event) => {
      if (event.target === paymentModal) closePaymentModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && paymentModal && !paymentModal.classList.contains("is-hidden")) closePaymentModal();
    });
  }

  function closePaymentModal() {
    if (!paymentModal) return;
    paymentModal.classList.add("is-hidden");
  }

  function getPrototypePricing(product) {
    return product?.designCostEstimate?.stages?.find((stage) => stage.stage === "prototype") || null;
  }

  function getEvtPricing(product) {
    return product?.designCostEstimate?.stages?.find((stage) => stage.stage === "evt") || null;
  }

  function renderPrototypeEstimate(prototypePricing) {
    return `
      <div class="prototype-stage-estimate">
        <span>Prototype estimate</span>
        <strong>${defaultFormatCurrency(prototypePricing.low, prototypePricing.currency)} - ${defaultFormatCurrency(prototypePricing.high, prototypePricing.currency)}</strong>
      </div>
    `;
  }

  function renderEvtEstimate(evtPricing) {
    if (!evtPricing) return "";

    return `
      <section class="prototype-evt-estimate">
        <div>
          <span>EVT estimate</span>
          <strong>${defaultFormatCurrency(evtPricing.low, evtPricing.currency)} - ${defaultFormatCurrency(evtPricing.high, evtPricing.currency)}</strong>
        </div>
        <button id="approveEvtEstimateButton" class="primary-button" type="button">Approve EVT</button>
      </section>
    `;
  }

  function openEvtPaymentModal(product, deps = {}) {
    const evtPricing = getEvtPricing(product);
    if (!evtPricing) return;

    createEvtPaymentModalIfNeeded();
    evtPaymentModalContent.innerHTML = renderEvtPaymentSummary(evtPricing);
    const confirmButton = document.getElementById("evtPaymentConfirmButton");
    if (confirmButton) {
      confirmButton.onclick = () => {
        approveEvtPayment(product, deps);
        closeEvtPaymentModal();
      };
    }

    evtPaymentModal.classList.remove("is-hidden");
    confirmButton?.focus();
  }

  function createEvtPaymentModalIfNeeded() {
    if (evtPaymentModal) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div id="evtPaymentModal" class="modal-backdrop is-hidden" role="dialog" aria-modal="true" aria-labelledby="evtPaymentTitle">
        <section class="modal-panel confirm-panel">
          <div class="modal-header">
            <div>
              <span>EVT</span>
              <h3 id="evtPaymentTitle">Pay EVT estimate</h3>
            </div>
            <button id="evtPaymentCloseButton" class="icon-button" type="button" aria-label="Close EVT payment window">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div id="evtPaymentContent" class="confirm-message"></div>
          <div class="modal-footer">
            <button id="evtPaymentCancelButton" class="secondary-button" type="button">Cancel</button>
            <button id="evtPaymentConfirmButton" class="primary-button" type="button">Pay mock EVT estimate</button>
          </div>
        </section>
      </div>
    `);

    evtPaymentModal = document.getElementById("evtPaymentModal");
    evtPaymentModalContent = document.getElementById("evtPaymentContent");
    evtPaymentCloseButton = document.getElementById("evtPaymentCloseButton");

    evtPaymentCloseButton.addEventListener("click", closeEvtPaymentModal);
    document.getElementById("evtPaymentCancelButton").addEventListener("click", closeEvtPaymentModal);
    evtPaymentModal.addEventListener("click", (event) => {
      if (event.target === evtPaymentModal) closeEvtPaymentModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && evtPaymentModal && !evtPaymentModal.classList.contains("is-hidden")) closeEvtPaymentModal();
    });
  }

  function renderEvtPaymentSummary(evtPricing) {
    return `
      <div class="prototype-payment-summary">
        <p>Mock payment for the EVT estimate.</p>
        <div class="prototype-payment-amount">
          <span>EVT estimate</span>
          <strong>${defaultFormatCurrency(evtPricing.low, evtPricing.currency)} - ${defaultFormatCurrency(evtPricing.high, evtPricing.currency)}</strong>
        </div>
        ${renderEvtPaymentItems(evtPricing)}
        <dl class="prototype-payment-fields">
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

  function renderEvtPaymentItems(evtPricing) {
    const items = Array.isArray(evtPricing?.items) ? evtPricing.items : [];
    if (items.length === 0) return "";

    return `
      <div class="prototype-payment-items">
        ${items.map((item) => `
          <div>
            <span>${defaultEscapeHtml(item.title || defaultTitleForDesignType(item.designType))}</span>
            <strong>${defaultFormatCurrency(item.low, item.currency || evtPricing.currency)} - ${defaultFormatCurrency(item.high, item.currency || evtPricing.currency)}</strong>
          </div>
        `).join("")}
      </div>
    `;
  }

  function approveEvtPayment(product, deps) {
    if (!product || !Array.isArray(product.completed)) return;
    product.completed[4] = true;
    if (typeof deps.logActivity === "function") deps.logActivity("EVT estimate payment mocked and EVT unlocked");
    if (typeof deps.persist === "function") deps.persist();
    if (typeof deps.render === "function") deps.render();
  }

  function closeEvtPaymentModal() {
    if (!evtPaymentModal) return;
    evtPaymentModal.classList.add("is-hidden");
  }

  function renderPrototypeProgress() {
    return `
      <section class="prototype-progress-panel" aria-label="Prototype discipline progress">
        <h4>Build progress</h4>
        <div class="prototype-progress-list">
          ${MOCK_PROGRESS.map((item) => `
            <div class="prototype-progress-row">
              <span>${defaultEscapeHtml(item.label)}</span>
              <div class="prototype-progress-track" aria-label="${defaultEscapeHtml(item.label)} ${item.value}% complete">
                <span style="width: ${item.value}%"></span>
              </div>
              <strong>${item.value}%</strong>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderPrototypeTestChart() {
    const total = MOCK_TEST_STATUS.reduce((sum, item) => sum + item.value, 0);
    let cursor = 0;
    const segments = MOCK_TEST_STATUS.map((item) => {
      const start = cursor;
      const end = cursor + (item.value / total) * 100;
      cursor = end;
      return `${item.color} ${start}% ${end}%`;
    }).join(", ");

    return `
      <section class="prototype-test-panel" aria-label="Prototype test status">
        <h4>Mock test status</h4>
        <div class="prototype-test-layout">
          <div class="prototype-test-pie" style="background: conic-gradient(${segments});" aria-hidden="true"></div>
          <div class="prototype-test-legend">
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

  function renderPrototypePaymentSummary(prototypePricing, options) {
    const formatCurrency = typeof options?.formatCurrency === "function" ? options.formatCurrency : defaultFormatCurrency;
    const escapeHtml = typeof options?.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml;

    return `
      <div class="prototype-payment-summary">
        <p>Mock payment for the Prototype pricing estimate.</p>
        <div class="prototype-payment-amount">
          <span>Prototype estimate</span>
          <strong>${formatCurrency(prototypePricing.low, prototypePricing.currency)} - ${formatCurrency(prototypePricing.high, prototypePricing.currency)}</strong>
        </div>
        ${renderPrototypePaymentItems(prototypePricing, options)}
        <dl class="prototype-payment-fields">
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

  function renderPrototypePaymentItems(prototypePricing, options) {
    const items = Array.isArray(prototypePricing?.items) ? prototypePricing.items : [];
    if (items.length === 0) return "";

    const formatCurrency = typeof options?.formatCurrency === "function" ? options.formatCurrency : defaultFormatCurrency;
    const titleForDesignType = typeof options?.titleForDesignType === "function" ? options.titleForDesignType : defaultTitleForDesignType;
    const escapeHtml = typeof options?.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml;

    return `
      <div class="prototype-payment-items">
        ${items.map((item) => `
          <div>
            <span>${escapeHtml(item.title || titleForDesignType(item.designType))}</span>
            <strong>${formatCurrency(item.low, item.currency || prototypePricing.currency)} - ${formatCurrency(item.high, item.currency || prototypePricing.currency)}</strong>
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

  window.PrototypeStage = {
    renderStage,
    openPaymentModal,
    openEvtPaymentModal,
    closePaymentModal
  };
})();
