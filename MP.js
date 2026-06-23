(function() {
  let skuOrderModal = null;
  let skuOrderModalContent = null;
  let skuOrderCloseButton = null;

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

    const orderSkuButton = document.getElementById("orderMoreSkuButton");
    if (orderSkuButton) {
      orderSkuButton.addEventListener("click", openSkuOrderModal);
    }
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
        </div>
        <div class="mp-sku-panel">
          <div>
            <span>SKU progress</span>
            <strong>4 / 6 SKUs released</strong>
          </div>
          <div class="mp-sku-track" aria-label="4 of 6 SKUs released">
            <span style="width: 67%"></span>
          </div>
          <div>
            <span>SKU in queue</span>
            <strong>Graphite / US, Sand / EU</strong>
          </div>
          <div class="mp-sku-process-list">
            <article>
              <div>
                <span>Graphite / US progress</span>
                <strong>83%</strong>
              </div>
              <div class="mp-sku-track" aria-label="Graphite / US 83% complete">
                <span style="width: 83%"></span>
              </div>
              <p>Line trial -> QA sampling -> Packout approval</p>
            </article>
            <article>
              <div>
                <span>Sand / EU progress</span>
                <strong>58%</strong>
              </div>
              <div class="mp-sku-track" aria-label="Sand / EU 58% complete">
                <span style="width: 58%"></span>
              </div>
              <p>Label verification -> Regulatory file -> Pallet build</p>
            </article>
          </div>
          <button id="orderMoreSkuButton" class="secondary-button" type="button">Order more SKU</button>
        </div>
      </section>
    `;
  }

  function openSkuOrderModal() {
    createSkuOrderModalIfNeeded();
    skuOrderModalContent.innerHTML = renderSkuOrderForm();
    skuOrderModal.classList.remove("is-hidden");
    document.getElementById("mpSkuNameInput")?.focus();
  }

  function createSkuOrderModalIfNeeded() {
    if (skuOrderModal) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div id="mpSkuOrderModal" class="modal-backdrop is-hidden" role="dialog" aria-modal="true" aria-labelledby="mpSkuOrderTitle">
        <section class="modal-panel confirm-panel">
          <div class="modal-header">
            <div>
              <span>MP</span>
              <h3 id="mpSkuOrderTitle">Order more SKU</h3>
            </div>
            <button id="mpSkuOrderCloseButton" class="icon-button" type="button" aria-label="Close SKU order window">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div id="mpSkuOrderContent" class="mp-sku-order-content"></div>
          <div class="modal-footer">
            <button id="mpSkuOrderCancelButton" class="secondary-button" type="button">Cancel</button>
            <button id="mpSkuOrderSaveButton" class="primary-button" type="button">Add SKU order</button>
          </div>
        </section>
      </div>
    `);

    skuOrderModal = document.getElementById("mpSkuOrderModal");
    skuOrderModalContent = document.getElementById("mpSkuOrderContent");
    skuOrderCloseButton = document.getElementById("mpSkuOrderCloseButton");

    skuOrderCloseButton.addEventListener("click", closeSkuOrderModal);
    document.getElementById("mpSkuOrderCancelButton").addEventListener("click", closeSkuOrderModal);
    document.getElementById("mpSkuOrderSaveButton").addEventListener("click", closeSkuOrderModal);
    skuOrderModal.addEventListener("click", (event) => {
      if (event.target === skuOrderModal) closeSkuOrderModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && skuOrderModal && !skuOrderModal.classList.contains("is-hidden")) closeSkuOrderModal();
    });
  }

  function closeSkuOrderModal() {
    if (!skuOrderModal) return;
    skuOrderModal.classList.add("is-hidden");
  }

  function renderSkuOrderForm() {
    return `
      <div class="mp-sku-order-grid">
        <label>
          <span>SKU name</span>
          <input id="mpSkuNameInput" type="text" placeholder="e.g. White / JP">
        </label>
        <label>
          <span>Region</span>
          <input id="mpSkuRegionInput" type="text" placeholder="e.g. Japan">
        </label>
        <label>
          <span>Quantity</span>
          <input id="mpSkuQuantityInput" type="number" min="1" step="1" placeholder="1200">
        </label>
        <label>
          <span>Target ship date</span>
          <input id="mpSkuShipDateInput" type="date">
        </label>
      </div>
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
    renderStage,
    openSkuOrderModal,
    closeSkuOrderModal
  };
})();
