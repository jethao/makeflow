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
          rendering: result.rendering || null,
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
            ${renderDesignOutputVisual(type, outputs[type.key])}
            <strong>${escapeHtml(outputs[type.key].title || type.title)}</strong>
          </button>
        `).join("")}
      </div>
    `;
  }

  function renderDesignOutputVisual(type, output) {
    if (type.key === "industrial") {
      const rendering = getIndustrialRendering(output);
      return `<img class="design-output-thumbnail" src="${escapeHtml(buildIndustrialPreviewImage(rendering))}" alt="${escapeHtml(type.title)} 3D preview">`;
    }
    return `<span>${escapeHtml(type.icon)}</span>`;
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
    const markdown = app().renderMarkdown ? app().renderMarkdown(output.content) : escapeHtml(output.content);
    designDocContent.innerHTML = `${renderIndustrialRendering(output)}${markdown}`;
    designDocModal.classList.remove("is-hidden");
    const rendering = getIndustrialRendering(output);
    if (rendering) {
      mountIndustrialRendering(rendering);
    }
    designDocCloseButton.focus();
  }

  function renderIndustrialRendering(output) {
    const rendering = getIndustrialRendering(output);
    if (!rendering) return "";
    const parts = Array.isArray(rendering.parts) ? rendering.parts : [];
    const title = rendering.title || "Rotatable industrial design rendering";
    return `
      <section class="design-rendering-viewer" aria-label="${escapeHtml(title)}">
        <div class="design-rendering-header">
          <div>
            <h4>${escapeHtml(title)}</h4>
            <span id="industrialDesignRenderingStatus">Drag to rotate</span>
          </div>
        </div>
        <img class="design-rendering-image" src="${escapeHtml(buildIndustrialPreviewImage(rendering))}" alt="${escapeHtml(title)} preview">
        <canvas id="industrialDesignRenderingCanvas" width="960" height="540"></canvas>
        ${parts.length ? `
          <div class="design-rendering-part-list">
            ${parts.map((part) => `<span>${escapeHtml(part.label || part.id || "Part")}</span>`).join("")}
          </div>
        ` : ""}
      </section>
    `;
  }

  function getIndustrialRendering(output) {
    if (output?.key !== "industrial") return null;
    if (output.rendering && typeof output.rendering === "object") return output.rendering;
    return createDefaultIndustrialRendering();
  }

  function createDefaultIndustrialRendering() {
    return {
      title: "Industrial design preview",
      camera: { x: 3, y: 2, z: 5 },
      parts: [
        {
          id: "body",
          label: "Body shell",
          shape: "rounded_box",
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [2.4, 0.9, 1.2],
          color: "#62748a"
        },
        {
          id: "interface",
          label: "Interaction surface",
          shape: "box",
          position: [0.25, 0.28, 0.62],
          rotation: [0, 0, 0],
          scale: [1.2, 0.08, 0.12],
          color: "#111827"
        }
      ]
    };
  }

  function buildIndustrialPreviewImage(rendering) {
    const parts = Array.isArray(rendering?.parts) && rendering.parts.length
      ? rendering.parts
      : createDefaultIndustrialRendering().parts;
    const title = rendering?.title || "Industrial design preview";
    const shapes = parts.slice(0, 8).map((part, index) => renderPreviewPart(part, index)).join("");
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" role="img" aria-label="${escapeSvg(title)}">
        <defs>
          <linearGradient id="preview-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#f8fafc"/>
            <stop offset="1" stop-color="#e5ebf1"/>
          </linearGradient>
          <filter id="preview-shadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#0f172a" flood-opacity="0.18"/>
          </filter>
        </defs>
        <rect width="320" height="180" rx="18" fill="url(#preview-bg)"/>
        <ellipse cx="164" cy="140" rx="92" ry="18" fill="#cbd5e1" opacity="0.55"/>
        <g filter="url(#preview-shadow)">
          ${shapes}
        </g>
      </svg>
    `.replace(/\s+/g, " ").trim();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function renderPreviewPart(part, index) {
    const scale = Array.isArray(part?.scale) ? part.scale : [1, 1, 1];
    const position = Array.isArray(part?.position) ? part.position : [0, 0, 0];
    const width = clamp(numberOr(scale[0], 1) * 36, 14, 120);
    const height = clamp(numberOr(scale[1], 1) * 36, 10, 76);
    const depth = clamp(numberOr(scale[2], 1) * 18, 8, 44);
    const x = 160 + numberOr(position[0], 0) * 32 - width / 2 + index * 2;
    const y = 102 - numberOr(position[1], 0) * 24 - height / 2 - numberOr(position[2], 0) * 10 - index * 3;
    const color = normalizePreviewColor(part?.color);
    const sideColor = shadeHexColor(color, -24);
    const topColor = shadeHexColor(color, 22);
    const shape = String(part?.shape || "box").toLowerCase();

    if (shape === "sphere") {
      const radius = Math.max(width, height) / 2;
      return `
        <circle cx="${x + width / 2}" cy="${y + height / 2}" r="${radius}" fill="${color}"/>
        <ellipse cx="${x + width / 2 - radius * 0.22}" cy="${y + height / 2 - radius * 0.25}" rx="${radius * 0.35}" ry="${radius * 0.18}" fill="#ffffff" opacity="0.28"/>
      `;
    }

    if (shape === "cylinder") {
      return `
        <path d="M ${x} ${y + depth / 2} C ${x} ${y - depth / 4}, ${x + width} ${y - depth / 4}, ${x + width} ${y + depth / 2} L ${x + width} ${y + height} C ${x + width} ${y + height + depth / 2}, ${x} ${y + height + depth / 2}, ${x} ${y + height} Z" fill="${color}"/>
        <ellipse cx="${x + width / 2}" cy="${y + depth / 2}" rx="${width / 2}" ry="${depth / 2}" fill="${topColor}"/>
      `;
    }

    return `
      <polygon points="${x},${y + depth} ${x + depth},${y} ${x + width + depth},${y} ${x + width},${y + depth}" fill="${topColor}"/>
      <polygon points="${x + width},${y + depth} ${x + width + depth},${y} ${x + width + depth},${y + height} ${x + width},${y + height + depth}" fill="${sideColor}"/>
      <rect x="${x}" y="${y + depth}" width="${width}" height="${height}" rx="${shape === "rounded_box" ? 10 : 2}" fill="${color}"/>
    `;
  }

  async function mountIndustrialRendering(rendering) {
    const canvas = document.getElementById("industrialDesignRenderingCanvas");
    const status = document.getElementById("industrialDesignRenderingStatus");
    if (!canvas || typeof canvas.getContext !== "function") return;

    let THREE;
    try {
      THREE = await import("./node_modules/three/build/three.module.js");
    } catch {
      if (status) status.textContent = "3D renderer unavailable";
      return;
    }

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const cameraPosition = rendering.camera || { x: 3, y: 2, z: 5 };
    const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 100);
    camera.position.set(numberOr(cameraPosition.x, 3), numberOr(cameraPosition.y, 2), numberOr(cameraPosition.z, 5));
    camera.lookAt(0, 0, 0);

    const root = new THREE.Group();
    root.rotation.y = -0.35;
    scene.add(root);

    scene.add(new THREE.AmbientLight(0xffffff, 0.78));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
    fillLight.position.set(-4, 2, -3);
    scene.add(fillLight);

    const parts = Array.isArray(rendering.parts) ? rendering.parts : [];
    parts.forEach((part) => root.add(createRenderingMesh(THREE, part)));
    if (!parts.length) root.add(createRenderingMesh(THREE, {
      label: "Body shell",
      shape: "rounded_box",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [2.2, 0.9, 1.2],
      color: "#62748a"
    }));

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.15;
    scene.add(floor);

    let dragging = false;
    let previousX = 0;
    let previousY = 0;

    canvas.addEventListener("pointerdown", (event) => {
      dragging = true;
      previousX = event.clientX;
      previousY = event.clientY;
      canvas.setPointerCapture?.(event.pointerId);
      if (status) status.textContent = "Rotating";
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const deltaX = event.clientX - previousX;
      const deltaY = event.clientY - previousY;
      root.rotation.y += deltaX * 0.01;
      root.rotation.x = clamp(root.rotation.x + deltaY * 0.008, -0.8, 0.8);
      previousX = event.clientX;
      previousY = event.clientY;
    });
    canvas.addEventListener("pointerup", (event) => {
      dragging = false;
      canvas.releasePointerCapture?.(event.pointerId);
      if (status) status.textContent = "Drag to rotate";
    });
    canvas.addEventListener("pointerleave", () => {
      dragging = false;
      if (status) status.textContent = "Drag to rotate";
    });

    function resize() {
      const width = Math.max(320, canvas.clientWidth || canvas.width || 960);
      const height = Math.max(220, Math.round(width * 0.5625));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function animate() {
      resize();
      if (!dragging) root.rotation.y += 0.002;
      renderer.render(scene, camera);
      window.requestAnimationFrame?.(animate);
    }

    resize();
    animate();
  }

  function createRenderingMesh(THREE, part) {
    const scale = Array.isArray(part.scale) ? part.scale : [1, 1, 1];
    const geometry = createRenderingGeometry(THREE, part.shape, scale);
    const material = new THREE.MeshStandardMaterial({
      color: part.color || "#62748a",
      metalness: 0.08,
      roughness: 0.52
    });
    const mesh = new THREE.Mesh(geometry, material);
    const position = Array.isArray(part.position) ? part.position : [0, 0, 0];
    const rotation = Array.isArray(part.rotation) ? part.rotation : [0, 0, 0];
    mesh.position.set(numberOr(position[0], 0), numberOr(position[1], 0), numberOr(position[2], 0));
    mesh.rotation.set(numberOr(rotation[0], 0), numberOr(rotation[1], 0), numberOr(rotation[2], 0));
    return mesh;
  }

  function createRenderingGeometry(THREE, shape, scale) {
    if (shape === "sphere") {
      return new THREE.SphereGeometry(Math.max(numberOr(scale[0], 1), numberOr(scale[1], 1), numberOr(scale[2], 1)) / 2, 48, 24);
    }
    if (shape === "cylinder") {
      return new THREE.CylinderGeometry(numberOr(scale[0], 1) / 2, numberOr(scale[0], 1) / 2, numberOr(scale[1], 1), 48);
    }
    return new THREE.BoxGeometry(numberOr(scale[0], 1), numberOr(scale[1], 1), numberOr(scale[2], 1), 2, 2, 2);
  }

  function numberOr(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizePreviewColor(value) {
    const color = typeof value === "string" ? value.trim() : "";
    return /^#[0-9a-f]{6}$/i.test(color) ? color : "#62748a";
  }

  function shadeHexColor(color, delta) {
    const normalized = normalizePreviewColor(color).slice(1);
    const channels = [0, 2, 4].map((index) => {
      const value = parseInt(normalized.slice(index, index + 2), 16);
      return clamp(value + delta, 0, 255).toString(16).padStart(2, "0");
    });
    return `#${channels.join("")}`;
  }

  function escapeSvg(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
