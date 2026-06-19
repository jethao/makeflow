const stages = [
  {
    name: "Spec",
    summary: "Define the product idea, customer problem, success metrics, and hard constraints before deeper planning starts.",
    owner: "Alex Kim",
    target: "Jun 21, 2026",
    deliverable: "Approved concept spec",
    gate: "The opportunity, target user, problem statement, and measurable outcome are clear enough for PRD work.",
    evidence: "Product description, target customer, core use cases, and success metrics.",
    checklist: ["Product description", "Target customer", "Primary use cases", "Hardware constraints", "Software constraints", "Regulatory/compliance", "Success metric", "Key assumptions"]
  },
  {
    name: "PRD review",
    summary: "Review and approve the Product Requirements Document with stakeholders.",
    owner: "Alex Kim",
    target: "Jun 28, 2026",
    deliverable: "Approved PRD",
    gate: "The PRD is complete, aligned with business goals, and accepted by product, design, and engineering.",
    evidence: "Reviewed PRD, open questions resolved, acceptance criteria, release scope, and sign-off notes.",
    checklist: ["Stakeholder review", "Feedback incorporated", "Acceptance criteria approved", "Final sign-off"]
  },
  {
    name: "Feasibility Analysis",
    summary: "Evaluate technical, financial, operational, compliance, and supply feasibility.",
    owner: "Maya Chen",
    target: "Jul 10, 2026",
    deliverable: "Feasibility memo",
    gate: "Major risks have owners, mitigation paths, and a decision on whether to proceed.",
    evidence: "Architecture options, BOM estimate, supply assumptions, risk register, and go/no-go recommendation.",
    checklist: ["Technical path checked", "Cost range estimated", "Operational risks logged", "Compliance needs mapped", "Go/no-go recommendation"]
  },
  {
    name: "Design",
    summary: "Translate requirements and feasibility decisions into product, UX, industrial, and engineering design.",
    owner: "Priya Singh",
    target: "Jul 24, 2026",
    deliverable: "Design package",
    gate: "The team has a reviewed design package that is buildable and testable.",
    evidence: "User flows, visual design, CAD or system architecture, interface definitions, and review decisions.",
    checklist: ["User flow approved", "System design drafted", "Design review complete", "Interface specs written", "Prototype scope locked"]
  },
  {
    name: "Prototype",
    summary: "Build a functional prototype to prove critical product behaviors before engineering validation.",
    owner: "Noah Patel",
    target: "Aug 14, 2026",
    deliverable: "Working prototype",
    gate: "Critical assumptions have been tested with a representative prototype.",
    evidence: "Prototype build notes, demo recording, usability findings, test logs, and issue list.",
    checklist: ["Prototype plan", "Critical path built", "Bench test complete", "User feedback captured", "Prototype issues triaged"]
  },
  {
    name: "EVT",
    summary: "Engineering Validation Test confirms the product can meet core engineering requirements.",
    owner: "Noah Patel",
    target: "Sep 11, 2026",
    deliverable: "EVT report",
    gate: "Engineering risks are understood and the product is ready for design validation iterations.",
    evidence: "EVT units, test plan, pass/fail data, root cause notes, and corrective actions.",
    checklist: ["EVT units built", "Test plan executed", "Failures analyzed", "Corrections assigned", "EVT review passed"]
  },
  {
    name: "DVT",
    summary: "Design Validation Test confirms the product design meets the full specification.",
    owner: "Maya Chen",
    target: "Oct 9, 2026",
    deliverable: "DVT report",
    gate: "The design is validated against requirements, reliability expectations, and regulatory needs.",
    evidence: "DVT test data, reliability results, compliance checks, design fixes, and approval record.",
    checklist: ["DVT units built", "Full spec test run", "Reliability checked", "Compliance evidence gathered", "DVT review passed"]
  },
  {
    name: "PVT",
    summary: "Production Validation Test proves the manufacturing process can repeatedly produce acceptable units.",
    owner: "Lena Ortiz",
    target: "Nov 6, 2026",
    deliverable: "PVT report",
    gate: "The production line, fixtures, process controls, and quality checks are ready for ramp.",
    evidence: "Pilot run data, yield analysis, process controls, fixture validation, and quality plan.",
    checklist: ["Pilot build run", "Yield reviewed", "Process controls verified", "Quality plan approved", "PVT review passed"]
  },
  {
    name: "MP",
    summary: "Mass Production ramps approved units through controlled manufacturing and launch readiness.",
    owner: "Lena Ortiz",
    target: "Dec 4, 2026",
    deliverable: "MP release",
    gate: "Manufacturing, support, logistics, and launch teams are ready for sellable production.",
    evidence: "Release approval, supplier readiness, inventory plan, launch checklist, and support handoff.",
    checklist: ["MP approval", "Supply locked", "Launch checklist complete", "Support handoff", "First production lot accepted"]
  },
  {
    name: "Maintenance",
    summary: "Monitor production quality, customer feedback, and improvement work after launch.",
    owner: "Alex Kim",
    target: "Ongoing",
    deliverable: "Lifecycle backlog",
    gate: "Post-launch signals are tracked and recurring maintenance decisions have clear ownership.",
    evidence: "Defect trends, customer feedback, firmware or service backlog, quality actions, and lifecycle plan.",
    checklist: ["Signal dashboard reviewed", "Defect triage running", "Support themes logged", "Improvement backlog ranked", "Lifecycle review scheduled"]
  }
];

const STORAGE_KEY = "makeflow-state-v1";
const defaultDates = stages.map((stage) => parseDisplayDate(stage.target));
const FEATURE_TEMPLATE = `Use case:

How to use:

Operating condition:

Acceptance criteria (create test cases):

Metrics:`;

const state = loadState();
let selectedIndex = Math.min(activeProduct()?.selectedIndex || 0, stages.length - 1);

const dashboardButton = document.querySelector("#dashboardButton");
const navDashboardButton = document.querySelector("#navDashboardButton");
const topbarProductLabel = document.querySelector("#topbarProductLabel");
const dashboardView = document.querySelector("#dashboardView");
const emptyDashboard = document.querySelector("#emptyDashboard");
const emptyAddProductButton = document.querySelector("#emptyAddProductButton");
const productDashboard = document.querySelector("#productDashboard");
const dashboardAddProductButton = document.querySelector("#dashboardAddProductButton");
const productGrid = document.querySelector("#productGrid");
const workflowView = document.querySelector("#workflowView");
const stepList = document.querySelector("#stepList");
const stageTitle = document.querySelector("#stageTitle");
const stageStatus = document.querySelector("#stageStatus");
const stageSummary = document.querySelector("#stageSummary");
const stageOwner = document.querySelector("#stageOwner");
const stageDateInput = document.querySelector("#stageDateInput");
const stageDeliverable = document.querySelector("#stageDeliverable");
const productTypeSelect = document.querySelector("#productTypeSelect");
const bomTargetInput = document.querySelector("#bomTargetInput");
const productNameInput = document.querySelector("#productNameInput");
const formFactorInput = document.querySelector("#formFactorInput");
const checklist = document.querySelector("#checklist");
const checklistCount = document.querySelector("#checklistCount");
const checklistNextButton = document.querySelector("#checklistNextButton");
const specWorkbench = document.querySelector("#specWorkbench");
const aggregateSpecInput = document.querySelector("#aggregateSpecInput");
const aggregateSpecState = document.querySelector("#aggregateSpecState");
const specReviewResults = document.querySelector("#specReviewResults");

const completionHint = document.querySelector("#completionHint");
const inspectSpecButton = document.querySelector("#inspectSpecButton");
const completeButton = document.querySelector("#completeButton");
const activityList = document.querySelector("#activityList");
const contextModal = document.querySelector("#contextModal");
const modalStage = document.querySelector("#modalStage");
const modalTitle = document.querySelector("#modalTitle");
const contextInput = document.querySelector("#contextInput");
const modalCloseButton = document.querySelector("#modalCloseButton");
const modalDoneButton = document.querySelector("#modalDoneButton");
const modalSaveState = document.querySelector("#modalSaveState");
const deleteProductModal = document.querySelector("#deleteProductModal");
const deleteProductMessage = document.querySelector("#deleteProductMessage");
const deleteProductCloseButton = document.querySelector("#deleteProductCloseButton");
const deleteProductCancelButton = document.querySelector("#deleteProductCancelButton");
const deleteProductConfirmButton = document.querySelector("#deleteProductConfirmButton");

let activeContext = null;
let pendingDeleteProductId = null;
let isGeneratingPrd = false;
let isInspectingSpec = false;
let isUpdatingPrd = false;
let prdGenerationError = "";
let specInspectionError = "";
let aggregateSpecParseError = "";

function loadState() {
  const empty = {
    products: [],
    selectedProductId: null
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return empty;

    if (Array.isArray(saved.products)) {
      const products = saved.products.map(normalizeProduct).filter(Boolean);
      return {
        products,
        selectedProductId: products.some((product) => product.id === saved.selectedProductId) ? saved.selectedProductId : null
      };
    }

    if (!hasLegacyProductData(saved)) return empty;

    const product = createProduct({
      id: saved.productId || createProductId(),
      createdAt: saved.createdAt || new Date().toISOString(),
      completed: stages.map((_, index) => Boolean(saved.completed?.[index])),
      checks: stages.map((_, index) => Array.isArray(saved.checks?.[index]) ? saved.checks[index] : []),
      checklistContexts: stages.map((stage, index) => normalizeContexts(saved.checklistContexts?.[index], stage.checklist.length)),
      checklistFeatures: stages.map((stage, index) => normalizeFeatureLists(saved.checklistFeatures?.[index], stage.checklist.length)),
      productName: typeof saved.productName === "string" ? saved.productName : "",
      formFactor: typeof saved.formFactor === "string" ? saved.formFactor : "",
      productType: typeof saved.productType === "string" ? saved.productType : "",
      bomTarget: normalizePrice(saved.bomTarget),
      targetDates: stages.map((_, index) => typeof saved.targetDates?.[index] === "string" ? saved.targetDates[index] : defaultDates[index]),
      specReviews: stages.map((_, index) => normalizeSpecReview(saved.specReviews?.[index])),
      prdOutputs: stages.map((_, index) => normalizePrdOutput(saved.prdOutputs?.[index])),

      activity: normalizeActivity(saved.activity),
      selectedIndex: Math.min(saved.selectedIndex || 0, stages.length - 1)
    });

    return {
      products: [product],
      selectedProductId: null
    };
  } catch {
    return empty;
  }
}

function createProduct(overrides = {}) {
  return {
    id: createProductId(),
    createdAt: new Date().toISOString(),
    completed: Array(stages.length).fill(false),
    checks: stages.map(() => []),
    checklistContexts: stages.map((stage) => Array(stage.checklist.length).fill("")),
    checklistFeatures: stages.map((stage) => stage.checklist.map(() => [])),
    productName: "",
    formFactor: "",
    productType: "",
    bomTarget: 0,
    targetDates: defaultDates,
    specReviews: Array(stages.length).fill(null),
    specWorkbenchOpen: Array(stages.length).fill(false),
    prdOutputs: Array(stages.length).fill(null),

    activity: [createActivity("Workflow started")],
    selectedIndex: 0,
    ...overrides
  };
}

function normalizeProduct(product) {
  if (!product || typeof product !== "object") return null;

  return createProduct({
    id: typeof product.id === "string" ? product.id : createProductId(),
    createdAt: typeof product.createdAt === "string" ? product.createdAt : new Date().toISOString(),
    completed: stages.map((_, index) => Boolean(product.completed?.[index])),
    checks: stages.map((_, index) => Array.isArray(product.checks?.[index]) ? product.checks[index] : []),
    checklistContexts: stages.map((stage, index) => normalizeContexts(product.checklistContexts?.[index], stage.checklist.length)),
    checklistFeatures: stages.map((stage, index) => normalizeFeatureLists(product.checklistFeatures?.[index], stage.checklist.length)),
    productName: typeof product.productName === "string" ? product.productName : "",
    formFactor: typeof product.formFactor === "string" ? product.formFactor : "",
    productType: typeof product.productType === "string" ? product.productType : "",
    bomTarget: normalizePrice(product.bomTarget),
    targetDates: stages.map((_, index) => typeof product.targetDates?.[index] === "string" ? product.targetDates[index] : defaultDates[index]),
    specReviews: stages.map((_, index) => normalizeSpecReview(product.specReviews?.[index])),
    specWorkbenchOpen: stages.map((_, index) => Boolean(product.specWorkbenchOpen?.[index])),
    prdOutputs: stages.map((_, index) => normalizePrdOutput(product.prdOutputs?.[index])),

    activity: normalizeActivity(product.activity),
    selectedIndex: Math.min(product.selectedIndex || 0, stages.length - 1)
  });
}

function persist() {
  const product = activeProduct();
  if (product) product.selectedIndex = selectedIndex;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function activeProduct() {
  return state.products.find((product) => product.id === state.selectedProductId) || null;
}

function isUnlocked(index) {
  const product = activeProduct();
  return Boolean(product) && (index === 0 || product.completed[index - 1]);
}

function statusFor(index) {
  const product = activeProduct();
  if (!product) return "locked";
  if (product.completed[index]) return "completed";
  if (!isUnlocked(index)) return "locked";
  return "current";
}

function iconFor(status) {
  if (status === "completed") return '<svg class="status-icon completed" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  if (status === "locked") return '<svg class="status-icon locked" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
  return '<svg class="status-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5l3 2"/></svg>';
}

function renderSteps() {
  stepList.innerHTML = stages.map((stage, index) => {
    const status = statusFor(index);
    const label = status === "completed" ? "Completed" : status === "locked" ? "Blocked" : "In progress";
    const selectedClass = index === selectedIndex ? " is-current" : "";
    return `
      <li>
        <button class="step-button${selectedClass}" type="button" data-index="${index}" ${status === "locked" ? "disabled" : ""}>
          ${iconFor(status)}
          <span class="step-index">${index + 1}</span>
          <span>
            <span class="step-name">${stage.name}</span>
            <span class="step-state">${label}</span>
          </span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </li>
    `;
  }).join("");

  stepList.querySelectorAll(".step-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedIndex = Number(button.dataset.index);
      persist();
      render();
    });
  });
}

function renderDetails() {
  const product = activeProduct();
  if (!product) return;

  const stage = stages[selectedIndex];
  const status = statusFor(selectedIndex);
  const statusText = status === "completed" ? "Completed" : status === "locked" ? "Blocked" : "In progress";
  const contexts = product.checklistContexts[selectedIndex];
  const documentedCount = getDocumentedCount(selectedIndex);

  stageTitle.textContent = `${selectedIndex + 1}. ${stage.name}`;
  stageStatus.textContent = statusText;
  stageStatus.className = `status-label ${status}`;
  stageSummary.textContent = stage.summary;
  stageOwner.textContent = stage.owner;
  stageDateInput.value = product.targetDates[selectedIndex];
  stageDateInput.disabled = status === "locked";
  stageDateInput.setAttribute("aria-label", `${stage.name} target date`);
  stageDeliverable.textContent = stage.deliverable;
  productTypeSelect.value = product.productType;
  productTypeSelect.disabled = status === "locked";
  bomTargetInput.value = product.bomTarget;
  bomTargetInput.disabled = status === "locked";
  productNameInput.value = product.productName || "";
  productNameInput.disabled = status === "locked";
  formFactorInput.value = product.formFactor || "";
  formFactorInput.disabled = status === "locked";
  checklistNextButton.disabled = status === "locked";

  // Reset any PRD-stage hides when (re)rendering non-PRD or before applying
  const productRows = document.querySelectorAll('.product-name-row, .product-type-row, .form-factor-row, .bom-target-row');
  productRows.forEach(row => { if (row) row.style.display = ''; });
  if (checklistNextButton) checklistNextButton.style.display = '';
  const heading = document.querySelector('.checklist-card .section-heading');
  if (heading) heading.style.display = '';
  const actionRow = document.querySelector('.action-row');
  if (actionRow) actionRow.style.display = '';

  if (selectedIndex === 1) {
    // PRD review stage only: hide Product name, Product type, form factor, BOM target, checklist heading and all other standard views
    // Show PRD context (the generated markdown content) instead
    productRows.forEach(row => { if (row) row.style.display = 'none'; });
    if (checklistNextButton) checklistNextButton.style.display = 'none';
    if (heading) heading.style.display = 'none';
    if (actionRow) actionRow.style.display = 'none';

    // Force-hide spec workbench and collected spec editor for this stage
    specWorkbench.classList.add('is-hidden');

    const prd = product.prdOutputs && product.prdOutputs[0];
    if (prd && prd.content) {
      const rendered = window.renderMarkdown ? window.renderMarkdown(prd.content) : escapeHtml(prd.content);
      checklist.innerHTML = `
        <li class="check-item prd-drafted">
          <div class="prd-drafted-content prd-markdown">
            ${rendered}
          </div>
        </li>
      `;
      checklistCount.textContent = '';

      // Apply any saved highlights / comments on the freshly rendered content
      const prdBox = document.querySelector(".prd-drafted-content");
      if (prdBox) {
        applyPrdComments(prdBox, prd.comments || []);
      }

      // Add "Update PRD" button under PRD display but above activity (only if unresolved comments)
      const oldUpdate = document.getElementById('updatePrdSection');
      if (oldUpdate) oldUpdate.remove();
      const unresolved = (prd.comments || []).filter(c => !c.resolved);
      if (unresolved.length > 0) {
        const updateSection = document.createElement('div');
        updateSection.id = 'updatePrdSection';
        updateSection.style.cssText = 'margin-top: 12px; padding: 0 4px;';
        const btnDisabled = isUpdatingPrd ? ' disabled' : '';
        updateSection.innerHTML = `
          <button id="updatePrdBtn" class="secondary-button"${btnDisabled}>
            Update PRD (${unresolved.length} to address)
          </button>
        `;
        const ul = document.getElementById('checklist');
        if (ul && ul.parentNode) {
          ul.parentNode.insertBefore(updateSection, ul.nextSibling);
        }
        const updateBtn = document.getElementById('updatePrdBtn');
        if (updateBtn) {
          updateBtn.disabled = !!isUpdatingPrd;
          updateBtn.addEventListener('click', () => openUpdatePrdPopup(prd));
        }
      }
    } else {
      checklist.innerHTML = '<li class="check-item"><div class="prd-drafted-content"><em>No PRD generated yet. Generate from the Spec stage.</em></div></li>';
      checklistCount.textContent = '';
    }
  } else {
    const oldUpdate = document.getElementById('updatePrdSection');
    if (oldUpdate) oldUpdate.remove();
    checklist.innerHTML = stage.checklist.map((item, index) => {
      if (isFeatureItem(item)) {
        return renderFeatureChecklistItem(stage, selectedIndex, index, status);
      }

      const value = contexts[index] || "";
      const hasContext = Boolean(value.trim());
      const helper = hasContext ? summarizeContext(value) : "Add description";
      return `
        <li class="check-item">
          <button class="check-button${hasContext ? " has-context" : ""}" type="button" data-check="${index}" ${status === "locked" ? "disabled" : ""}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h10"/></svg>
            <span>
              <strong>${escapeHtml(item)}</strong>
              <span>${escapeHtml(helper)}</span>
            </span>
          </button>
        </li>
      `;
    }).join("");

    checklistCount.textContent = `${documentedCount} / ${stage.checklist.length} documented`;
  }


  const allDocumented = documentedCount === stage.checklist.length;
  const hasProductName = Boolean(product.productName && product.productName.trim());
  const hasProductType = Boolean(product.productType);
  const hasFormFactor = Boolean(product.formFactor && product.formFactor.trim());
  const hasBomTarget = product.bomTarget > 0;
  const workbenchOpen = Boolean(product.specWorkbenchOpen?.[selectedIndex]);
  const specApproved = isCurrentSpecApproved(product, selectedIndex);
  renderSpecWorkbench(product, selectedIndex, workbenchOpen);
  if (selectedIndex === 1) {
    specWorkbench.classList.add('is-hidden');
  }
  inspectSpecButton.disabled = isInspectingSpec || isGeneratingPrd || Boolean(aggregateSpecParseError);
  inspectSpecButton.innerHTML = getInspectSpecButtonMarkup();
  completeButton.disabled = isGeneratingPrd || isInspectingSpec;
  completeButton.innerHTML = getCompleteButtonMarkup(status);

  if (status === "locked") {
    completionHint.textContent = `Complete ${stages[selectedIndex - 1].name} before this step can start.`;
  } else if (status === "completed") {
    const output = product.prdOutputs[selectedIndex];
    completionHint.textContent = output?.outputFile
      ? `PRD saved locally at ${output.outputFile}.`
      : "This gate is complete. You can move to the next unlocked stage.";
  } else if (isGeneratingPrd) {
    completionHint.textContent = "Generating PRD from the collected inputs...";
  } else if (isInspectingSpec) {
    completionHint.textContent = "Inspecting spec with OpenAI...";
  } else if (prdGenerationError) {
    completionHint.textContent = prdGenerationError;
  } else if (specInspectionError) {
    completionHint.textContent = "Spec inspection failed. See inspection results.";
  } else if (selectedIndex === 1) {
    const prd = product.prdOutputs && product.prdOutputs[0];
    completionHint.textContent = (prd && prd.content)
      ? "PRD content shown in the step checklist area."
      : "PRD will be shown here after generation from Spec.";
  } else if (!hasProductName) {
    completionHint.textContent = "Enter a product name before completing this stage.";
  } else if (!hasProductType) {
    completionHint.textContent = "Select a product type before completing this stage.";
  } else if (!hasFormFactor) {
    completionHint.textContent = "Enter a form factor before completing this stage.";
  } else if (!hasBomTarget) {
    completionHint.textContent = "Set a BOM target before completing this stage.";
  } else if (!allDocumented) {
    completionHint.textContent = "Add descriptions for every checklist item and at least one primary use case.";
  } else if (!specApproved && product.specReviews[selectedIndex]) {
    completionHint.textContent = "Spec inspection needs changes or is out of date. See inspection results, then inspect again.";
  } else if (!specApproved) {
    completionHint.textContent = "Click Next, inspect the spec, and receive approved before generating the PRD.";
  } else {
    completionHint.textContent = "Spec approved. You can generate the PRD.";
  }

  if (selectedIndex !== 1) {
    checklist.querySelectorAll(".check-button").forEach((button) => {
      button.addEventListener("click", () => {
        openContextModal(Number(button.dataset.check));
      });
    });
    checklist.querySelectorAll(".feature-add-button").forEach((button) => {
      button.addEventListener("click", () => {
        openFeatureModal(Number(button.dataset.check));
      });
    });
    checklist.querySelectorAll(".feature-edit-button").forEach((button) => {
      button.addEventListener("click", () => {
        openFeatureModal(Number(button.dataset.check), Number(button.dataset.feature));
      });
    });
    checklist.querySelectorAll(".feature-delete-button").forEach((button) => {
      button.addEventListener("click", () => {
        deleteFeature(Number(button.dataset.check), Number(button.dataset.feature));
      });
    });
  }
}

function renderActivity() {
  const product = activeProduct();
  const items = [...(product?.activity || [])].reverse();
  activityList.innerHTML = items.map((item) => `
    <li>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
      <span>
        <strong>${escapeHtml(item.message)}</strong>
        <span>${formatActivityTime(item.timestamp)}</span>
      </span>
    </li>
  `).join("");
}

function completeCurrentStep() {
  if (isGeneratingPrd) return;
  openPrdReviewModal(selectedIndex);
}

function renderSpecWorkbench(product, stageIndex, isOpen) {
  specWorkbench.classList.toggle("is-hidden", !isOpen);

  if (!isOpen) {
    aggregateSpecParseError = "";
    return;
  }

  if (document.activeElement !== aggregateSpecInput) {
    aggregateSpecInput.value = JSON.stringify(buildPrdPayload(stageIndex), null, 2);
    aggregateSpecParseError = "";
    aggregateSpecState.textContent = "Synced";
    aggregateSpecState.className = "";
  }

  specReviewResults.innerHTML = renderSpecReviewResults(product, stageIndex);
}

function renderSpecReviewResults(product, stageIndex) {
  if (isInspectingSpec) {
    return '<p class="empty-result">Inspection running...</p>';
  }

  const review = product.specReviews?.[stageIndex];
  if (!review?.review) {
    return '<p class="empty-result">No inspection results yet.</p>';
  }

  const status = review.status === "approved" ? "Approved" : review.status === "error" ? "Error" : "Needs changes";
  return `
    <div class="result-status ${escapeHtml(review.status)}">${status}</div>
    <pre>${escapeHtml(review.review)}</pre>
  `;
}

function syncAggregateSpecToChecklist() {
  const product = activeProduct();
  if (!product) return false;

  try {
    const payload = JSON.parse(aggregateSpecInput.value);
    applySpecPayloadToProduct(payload, product, selectedIndex);
    aggregateSpecParseError = "";
    aggregateSpecState.textContent = "Synced";
    aggregateSpecState.className = "";
    persist();
    return true;
  } catch {
    aggregateSpecParseError = "Invalid JSON";
    aggregateSpecState.textContent = "Invalid JSON";
    aggregateSpecState.className = "error";
    inspectSpecButton.disabled = true;
    return false;
  }
}

function applySpecPayloadToProduct(payload, product, stageIndex) {
  if (payload.stage && typeof payload.stage === "object" && typeof payload.stage.targetDate === "string") {
    product.targetDates[stageIndex] = payload.stage.targetDate;
  }

  if (payload.product && typeof payload.product === "object") {
    product.productName = typeof payload.product.name === "string" ? payload.product.name : product.productName;
    product.productType = typeof payload.product.type === "string" ? payload.product.type : product.productType;
    product.formFactor = typeof payload.product.formFactor === "string" ? payload.product.formFactor : product.formFactor;
    product.bomTarget = normalizePrice(payload.product.bomTarget);
  }



  if (!Array.isArray(payload.checklist)) return;

  const stage = stages[stageIndex];
  payload.checklist.forEach((entry) => {
    if (!entry || typeof entry.item !== "string") return;
    const checkIndex = stage.checklist.indexOf(entry.item);
    if (checkIndex === -1) return;

    if (isFeatureItem(entry.item)) {
      const useCases = Array.isArray(entry.useCases) ? entry.useCases : Array.isArray(entry.features) ? entry.features : [];
      product.checklistFeatures[stageIndex][checkIndex] = useCases.filter((item) => typeof item === "string");
      return;
    }

    product.checklistContexts[stageIndex][checkIndex] = typeof entry.description === "string" ? entry.description : "";
  });
}

async function inspectCurrentSpec() {
  const product = activeProduct();
  if (!product || isInspectingSpec) return;
  if (!syncAggregateSpecToChecklist()) return;

  const stageIndex = selectedIndex;
  isInspectingSpec = true;
  specInspectionError = "";
  prdGenerationError = "";
  logActivity(`${stages[stageIndex].name} spec inspection started`);
  persist();
  render();

  try {
    const payload = buildPrdPayload(stageIndex);
    const result = await inspectSpec(stageIndex, payload);
    const review = result.review.trim();
    const approved = isApprovedReview(review);
    product.specReviews[stageIndex] = {
      status: approved ? "approved" : "needs_changes",
      review,
      reviewedAt: new Date().toISOString(),
      specSignature: specSignature(payload)
    };
    logActivity(`${stages[stageIndex].name} spec inspection completed`);
  } catch (error) {
    specInspectionError = "failed";
    product.specReviews[stageIndex] = {
      status: "error",
      review: error.message,
      reviewedAt: new Date().toISOString(),
      specSignature: specSignature(buildPrdPayload(stageIndex))
    };
    logActivity(`${stages[stageIndex].name} spec inspection failed`);
  } finally {
    isInspectingSpec = false;
    persist();
    render();
  }
}

function render() {
  renderDashboard();

  const product = activeProduct();
  if (!product) {
    dashboardView.classList.remove("is-hidden");
    workflowView.classList.add("is-hidden");
    topbarProductLabel.textContent = "Product dashboard";
    return;
  }

  dashboardView.classList.add("is-hidden");
  workflowView.classList.remove("is-hidden");
  topbarProductLabel.textContent = productDisplayName(product);

  if (!isUnlocked(selectedIndex)) {
    selectedIndex = product.completed.findIndex((done, index) => !done && isUnlocked(index));
    if (selectedIndex === -1) selectedIndex = stages.length - 1;
  }

  renderSteps();
  renderDetails();
  renderActivity();
}

function renderDashboard() {
  const hasProducts = state.products.length > 0;
  emptyDashboard.classList.toggle("is-hidden", hasProducts);
  productDashboard.classList.toggle("is-hidden", !hasProducts);

  if (!hasProducts) {
    productGrid.innerHTML = "";
    return;
  }

  productGrid.innerHTML = state.products.map((product) => {
    const progress = productCompletionPercent(product);
    const currentStage = currentStageName(product);
    return `
      <article class="product-card">
        <div class="product-card-top">
          <span class="product-icon">${productIcon(product)}</span>
          <button class="product-delete-button" type="button" data-delete-product-id="${escapeHtml(product.id)}" aria-label="Delete ${escapeHtml(productDisplayName(product))}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/></svg>
          </button>
        </div>
        <span class="product-card-main">
          <strong>${escapeHtml(productDisplayName(product))}</strong>
          <span>${escapeHtml(product.productType || currentStage)}</span>
        </span>
        <span class="completion-bar" aria-label="${progress}% complete">
          <span style="width: ${progress}%"></span>
        </span>
        <span class="completion-label">${progress}% complete</span>
        <button class="secondary-button product-open-button" type="button" data-product-id="${escapeHtml(product.id)}">Open</button>
      </article>
    `;
  }).join("");
}

function createAndOpenProduct() {
  const product = createProduct();
  state.products.push(product);
  openProduct(product.id);
  logActivity("Product created");
  persist();
  render();
}

function openProduct(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;

  state.selectedProductId = product.id;
  selectedIndex = Math.min(product.selectedIndex || 0, stages.length - 1);
  persist();
  render();
}

stageDateInput.addEventListener("change", () => {
  const product = activeProduct();
  if (!product) return;
  product.targetDates[selectedIndex] = stageDateInput.value;
  logActivity(`${stages[selectedIndex].name} target date updated`);
  persist();
  renderActivity();
});

productTypeSelect.addEventListener("change", () => {
  const product = activeProduct();
  if (!product) return;
  product.productType = productTypeSelect.value;
  logActivity(product.productType ? `Product type set to ${product.productType}` : "Product type cleared");
  persist();
  render();
});

bomTargetInput.addEventListener("change", () => {
  updateBomTarget(bomTargetInput.value);
});

bomTargetInput.addEventListener("input", () => {
  const product = activeProduct();
  if (!product) return;
  product.bomTarget = normalizePrice(bomTargetInput.value);
  persist();
});

productNameInput.addEventListener("change", () => {
  const product = activeProduct();
  if (!product) return;
  const val = productNameInput.value.trim();
  if (product.productName !== val) {
    product.productName = val;
    logActivity(val ? `Product name set to ${val}` : "Product name cleared");
    persist();
    render();
  }
});

productNameInput.addEventListener("input", () => {
  const product = activeProduct();
  if (!product) return;
  product.productName = productNameInput.value.trim();
  persist();
});

formFactorInput.addEventListener("change", () => {
  const product = activeProduct();
  if (!product) return;
  const val = formFactorInput.value.trim();
  if (product.formFactor !== val) {
    product.formFactor = val;
    logActivity(val ? `Form factor set to ${val}` : "Form factor cleared");
    persist();
    render();
  }
});

formFactorInput.addEventListener("input", () => {
  const product = activeProduct();
  if (!product) return;
  product.formFactor = formFactorInput.value.trim();
  persist();
});

checklistNextButton.addEventListener("click", () => {
  const product = activeProduct();
  if (!product) return;

  product.specWorkbenchOpen[selectedIndex] = true;
  persist();
  render();
  aggregateSpecInput.focus();
});

aggregateSpecInput.addEventListener("input", () => {
  syncAggregateSpecToChecklist();
});

aggregateSpecInput.addEventListener("blur", () => {
  render();
});

inspectSpecButton.addEventListener("click", inspectCurrentSpec);

dashboardButton.addEventListener("click", () => {
  state.selectedProductId = null;
  persist();
  render();
});
navDashboardButton.addEventListener("click", () => {
  state.selectedProductId = null;
  persist();
  render();
});
emptyAddProductButton.addEventListener("click", createAndOpenProduct);
dashboardAddProductButton.addEventListener("click", createAndOpenProduct);
productGrid.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-product-id]");
  if (deleteButton) {
    openDeleteProductModal(deleteButton.dataset.deleteProductId);
    return;
  }

  const openButton = event.target.closest("[data-product-id]");
  if (!openButton) return;
  openProduct(openButton.dataset.productId);
});

modalCloseButton.addEventListener("click", closeContextModal);
modalDoneButton.addEventListener("click", closeContextModal);
contextModal.addEventListener("click", (event) => {
  if (event.target === contextModal) closeContextModal();
});
deleteProductCloseButton.addEventListener("click", closeDeleteProductModal);
deleteProductCancelButton.addEventListener("click", closeDeleteProductModal);
deleteProductConfirmButton.addEventListener("click", deletePendingProduct);
deleteProductModal.addEventListener("click", (event) => {
  if (event.target === deleteProductModal) closeDeleteProductModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !contextModal.classList.contains("is-hidden")) {
    closeContextModal();
  } else if (event.key === "Escape" && !deleteProductModal.classList.contains("is-hidden")) {
    closeDeleteProductModal();
  }
});

completeButton.addEventListener("click", () => {
  completeCurrentStep();
});

// Markdown renderer used by the PRD review panel (and modal success state)
function renderMarkdown(md) {
  if (!md || typeof md !== "string") return "";

  // Start from escaped source (prevents XSS from any raw HTML in source)
  let text = escapeHtml(md);

  // Extract fenced code blocks and replace with placeholders
  const codeBlocks = [];
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const safeCode = code.replace(/^\n+|\n+$/g, "");
    const langAttr = lang ? ` class="language-${lang}"` : "";
    codeBlocks.push(`<pre><code${langAttr}>${safeCode}</code></pre>`);
    return `\n__MD_CODE_BLOCK_${codeBlocks.length - 1}__\n`;
  });

  const lines = text.split(/\r?\n/);
  const htmlParts = [];
  let i = 0;

  function trim(str) { return str.replace(/^\s+|\s+$/g, ""); }

  function processInline(str) {
    if (!str) return "";
    return str
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_\n]+)__/g, "<strong>$1</strong>")
      .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
      .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function parseTable(tableLines) {
    if (!tableLines.length) return "";
    const headerRow = tableLines[0].trim();
    const cells = headerRow.replace(/^\||\|$/g, "").split("|").map(c => trim(c));
    let sepIndex = 1;
    if (tableLines[1] && /^\s*\|?\s*[:\-]+\s*\|/.test(tableLines[1])) sepIndex = 2;
    const bodyLines = tableLines.slice(sepIndex);

    let html = '<table><thead><tr>';
    cells.forEach(cell => { html += `<th>${processInline(cell)}</th>`; });
    html += '</tr></thead><tbody>';

    bodyLines.forEach(rowLine => {
      if (!rowLine.trim() || !rowLine.includes("|")) return;
      const rowCells = rowLine.replace(/^\||\|$/g, "").split("|").map(c => trim(c));
      html += '<tr>';
      rowCells.forEach(cell => { html += `<td>${processInline(cell)}</td>`; });
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function parseList(startIndex, ordered) {
    const items = [];
    let j = startIndex;
    const baseIndent = (lines[j].match(/^\s*/)[0] || "").length;

    while (j < lines.length) {
      let line = lines[j];
      if (!line.trim()) { j++; continue; }
      const indent = (line.match(/^\s*/)[0] || "").length;
      const listMarker = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/;
      if (indent < baseIndent || !listMarker.test(line)) break;

      let content = line.replace(listMarker, "");
      j++;

      const cont = [];
      while (j < lines.length) {
        const nextLine = lines[j];
        const nIndent = (nextLine.match(/^\s*/)[0] || "").length;
        if (nIndent > baseIndent && nextLine.trim() && !/^\s*([-*+]|\d+\.)\s/.test(nextLine)) {
          cont.push(nextLine.trim());
          j++;
        } else if (!nextLine.trim()) {
          cont.push("");
          j++;
        } else {
          break;
        }
      }

      let itemContent = processInline(content);
      if (cont.length) {
        const extra = cont.filter(Boolean).join(" ");
        if (extra) itemContent += " " + processInline(extra);
      }
      items.push(`<li>${itemContent}</li>`);
    }

    const tag = ordered ? "ol" : "ul";
    return { html: `<${tag}>${items.join("")}</${tag}>`, next: j };
  }

  while (i < lines.length) {
    let line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (/^__MD_CODE_BLOCK_(\d+)__$/.test(line.trim())) {
      const m = line.trim().match(/^__MD_CODE_BLOCK_(\d+)__$/);
      const idx = parseInt(m[1], 10);
      if (codeBlocks[idx]) htmlParts.push(codeBlocks[idx]);
      i++; continue;
    }

    if (/^\s*([-*_]\s*){3,}\s*$/.test(line)) { htmlParts.push("<hr>"); i++; continue; }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = Math.min(6, headingMatch[1].length);
      htmlParts.push(`<h${level}>${processInline(headingMatch[2].trim())}</h${level}>`);
      i++; continue;
    }

    if (/^\s*\|/.test(line) && line.includes("|")) {
      const tableLines = [];
      while (i < lines.length && /^\s*\|/.test(lines[i]) && lines[i].includes("|")) {
        tableLines.push(lines[i]); i++;
      }
      const t = parseTable(tableLines);
      if (t) htmlParts.push(t);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const res = parseList(i, false); htmlParts.push(res.html); i = res.next; continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const res = parseList(i, true); htmlParts.push(res.html); i = res.next; continue;
    }

    const para = [];
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) break;
      if (/^(#{1,6}\s|[-*+]\s|\d+\.\s|\s*\|)/.test(l)) break;
      if (/^\s*([-*_]\s*){3,}\s*$/.test(l)) break;
      para.push(l); i++;
    }
    if (para.length) {
      const joined = para.map(l => l.trim()).join(" ");
      htmlParts.push(`<p>${processInline(joined)}</p>`);
    }
  }

  return htmlParts.join("\n");
}
window.renderMarkdown = renderMarkdown;

// ---------- PRD comment / annotation support ----------

function applyPrdComments(container, comments) {
  if (!container || !Array.isArray(comments) || comments.length === 0) return;

  // Remove existing highlight wrappers (unwrap)
  container.querySelectorAll(".prd-comment-highlight").forEach((el) => {
    const parent = el.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(el.textContent || ""), el);
      parent.normalize();
    }
  });

  // Remove image highlight classes
  container.querySelectorAll("img.prd-comment-highlight").forEach((img) => {
    img.classList.remove("prd-comment-highlight");
    delete img.dataset.commentId;
    img.title = img.title && !img.title.includes("Comment:") ? img.title : "";
  });

  comments.forEach((c) => {
    if (!c || !c.quote || c.resolved) return;
    if (c.type === "image") {
      highlightImageComment(container, c);
    } else {
      highlightTextComment(container, c);
    }
  });
}

function highlightTextComment(container, comment) {
  const search = comment.quote.trim();
  if (!search) return;

  const lowerSearch = search.toLowerCase();
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let node;
  const matches = [];

  while ((node = walker.nextNode())) {
    const val = node.nodeValue || "";
    const pos = val.toLowerCase().indexOf(lowerSearch);
    if (pos !== -1) {
      matches.push({ node, pos });
      break; // first match only per comment (keeps things simple & non-overlapping)
    }
  }

  matches.forEach(({ node, pos }) => {
    const val = node.nodeValue || "";
    const before = val.slice(0, pos);
    const matchText = val.slice(pos, pos + search.length);
    const after = val.slice(pos + search.length);

    const span = document.createElement("span");
    span.className = "prd-comment-highlight";
    span.dataset.commentId = comment.id || "";
    span.title = "Comment: " + comment.comment;
    span.textContent = matchText;

    span.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const prd = getCurrentPrd();
      const cm = prd && prd.comments && prd.comments.find((x) => x.id === comment.id);
      if (cm) showPrdComment(cm, span);
    });

    const frag = document.createDocumentFragment();
    if (before) frag.appendChild(document.createTextNode(before));
    frag.appendChild(span);
    if (after) frag.appendChild(document.createTextNode(after));
    node.parentNode.replaceChild(frag, node);
  });
}

function highlightImageComment(container, comment) {
  const imgs = container.querySelectorAll("img");
  for (const img of imgs) {
    const alt = (img.getAttribute("alt") || "").toLowerCase();
    const src = (img.getAttribute("src") || "").toLowerCase();
    const q = comment.quote.toLowerCase();
    if (alt.includes(q) || src.includes(q) || q.includes(alt) || (alt === "" && src)) {
      img.classList.add("prd-comment-highlight");
      img.dataset.commentId = comment.id || "";
      img.title = "Comment: " + comment.comment;
      img.style.cursor = "pointer";
      img.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const prd = getCurrentPrd();
        const cm = prd && prd.comments && prd.comments.find((x) => x.id === comment.id);
        if (cm) showPrdComment(cm, img);
      }, { once: true });
      break;
    }
  }
}

function getCurrentPrd() {
  const product = activeProduct();
  return product && product.prdOutputs ? product.prdOutputs[0] : null;
}

function handlePrdRightClick(e) {
  if (selectedIndex !== 1) return;
  const prdBox = e.target.closest(".prd-drafted-content");
  if (!prdBox) return;

  e.preventDefault();

  // If clicking an existing highlight, offer to edit that comment instead
  const existingHl = e.target.closest(".prd-comment-highlight, img.prd-comment-highlight");
  if (existingHl && existingHl.dataset.commentId) {
    const prd = getCurrentPrd();
    const cm = prd && prd.comments && prd.comments.find((x) => x.id === existingHl.dataset.commentId);
    if (cm) {
      showPrdComment(cm, existingHl);
      return;
    }
  }

  const sel = window.getSelection && window.getSelection();
  let quote = sel ? sel.toString().trim() : "";
  let ctype = "text";

  if (!quote) {
    const t = e.target;
    if (t.tagName === "IMG") {
      quote = t.getAttribute("alt") || t.src || "[image]";
      ctype = "image";
    } else {
      // grab nearest sensible block content as quote context
      const block = t.closest("p,li,td,th,h1,h2,h3,h4,h5,h6,pre,blockquote");
      if (block) {
        quote = (block.textContent || "").trim().slice(0, 160);
      }
    }
  }

  if (!quote) return;

  openAddPrdCommentUI(quote, ctype, (commentText) => {
    const product = activeProduct();
    if (!product) return;
    const prd = product.prdOutputs && product.prdOutputs[0];
    if (!prd) return;
    if (!Array.isArray(prd.comments)) prd.comments = [];
    prd.comments.push({
      id: "c_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9),
      quote,
      comment: commentText,
      createdAt: new Date().toISOString(),
      type: ctype,
      resolved: false
    });
    persist();
    render();
  });
}

function openAddPrdCommentUI(quote, type, onSave) {
  const old = document.getElementById("prdCommentDialog");
  if (old) old.remove();

  const bd = document.createElement("div");
  bd.id = "prdCommentDialog";
  bd.className = "modal-backdrop";

  const safeQuote = escapeHtml(quote).slice(0, 280) + (quote.length > 280 ? "…" : "");

  bd.innerHTML = `
    <section class="modal-panel" style="max-width:440px">
      <div class="modal-header">
        <div>
          <span>PRD</span>
          <h3>Add comment</h3>
        </div>
        <button class="icon-button" type="button" aria-label="Close">×</button>
      </div>
      <div style="padding:0 16px 4px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">Selection / context:</div>
        <div style="max-height:78px;overflow:auto;background:var(--surface-soft);border:1px solid var(--line);padding:6px 8px;border-radius:4px;font-size:13px;white-space:pre-wrap;">${safeQuote}</div>

        <label style="display:block;margin:10px 0 4px;font-size:13px;">Comment</label>
        <textarea id="prdCommentInput" rows="4" style="width:100%;box-sizing:border-box;resize:vertical;" placeholder="Write your note, question or feedback..."></textarea>
      </div>
      <div class="modal-footer">
        <button class="secondary-button" id="prdCommentCancel">Cancel</button>
        <button class="primary-button" id="prdCommentSave">Add comment</button>
      </div>
    </section>`;

  document.body.appendChild(bd);

  const close = () => bd.remove();
  bd.querySelector(".icon-button").onclick = close;
  bd.onclick = (ev) => { if (ev.target === bd) close(); };

  const ta = bd.querySelector("#prdCommentInput");
  const save = bd.querySelector("#prdCommentSave");
  const cancel = bd.querySelector("#prdCommentCancel");

  cancel.onclick = close;
  save.onclick = () => {
    const val = (ta.value || "").trim();
    if (!val) {
      ta.focus();
      return;
    }
    close();
    onSave(val);
  };

  setTimeout(() => { ta.focus(); ta.select && ta.select(); }, 0);
}

function showPrdComment(comment, anchorEl) {
  const old = document.getElementById("prdCommentDialog");
  if (old) old.remove();

  const bd = document.createElement("div");
  bd.id = "prdCommentDialog";
  bd.className = "modal-backdrop";

  const q = escapeHtml(comment.quote || "").slice(0, 180) + ((comment.quote || "").length > 180 ? "…" : "");
  const c = comment.comment || "";

  bd.innerHTML = `
    <section class="modal-panel" style="max-width:440px">
      <div class="modal-header">
        <div>
          <span>PRD</span>
          <h3>Comment</h3>
        </div>
        <button class="icon-button" type="button" aria-label="Close">×</button>
      </div>
      <div style="padding:0 16px 8px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">On:</div>
        <div style="font-size:13px;opacity:0.85;margin-bottom:10px;white-space:pre-wrap;">${q}</div>

        <textarea id="prdCommentInput" rows="4" style="width:100%;box-sizing:border-box;resize:vertical;"></textarea>
      </div>
      <div class="modal-footer" style="justify-content:space-between">
        <button class="secondary-button" id="prdCommentDelete" style="color:#b91c1c;border-color:#fecaca">Delete</button>
        <div>
          <button class="secondary-button" id="prdCommentCancel">Close</button>
          <button class="primary-button" id="prdCommentSave">Save</button>
        </div>
      </div>
    </section>`;

  document.body.appendChild(bd);

  const ta = bd.querySelector("#prdCommentInput");
  ta.value = c;

  const close = () => bd.remove();
  bd.querySelector(".icon-button").onclick = close;
  bd.onclick = (ev) => { if (ev.target === bd) close(); };

  bd.querySelector("#prdCommentCancel").onclick = close;

  bd.querySelector("#prdCommentSave").onclick = () => {
    const val = ta.value.trim();
    if (!val) return;
    const product = activeProduct();
    const prd = product && product.prdOutputs && product.prdOutputs[0];
    if (prd && Array.isArray(prd.comments)) {
      const target = prd.comments.find((x) => x.id === comment.id);
      if (target) target.comment = val;
    }
    close();
    persist();
    render();
  };

  bd.querySelector("#prdCommentDelete").onclick = () => {
    const product = activeProduct();
    const prd = product && product.prdOutputs && product.prdOutputs[0];
    if (prd && Array.isArray(prd.comments)) {
      prd.comments = prd.comments.filter((x) => x.id !== comment.id);
    }
    close();
    persist();
    render();
  };

  setTimeout(() => ta.focus(), 10);
}

function openUpdatePrdPopup(prd) {
  if (!prd) return;
  const unresolved = (prd.comments || []).filter(c => !c.resolved);
  const old = document.getElementById('updatePrdModal');
  if (old) old.remove();

  const bd = document.createElement('div');
  bd.id = 'updatePrdModal';
  bd.className = 'modal-backdrop';

  let listHtml = '';
  if (unresolved.length === 0) {
    listHtml = '<p style="color:#666;">No comments to address.</p>';
  } else {
    listHtml = '<ul style="max-height: 220px; overflow: auto; margin: 8px 0; padding-left: 20px; font-size: 13px; line-height: 1.4;">';
    unresolved.forEach((c, i) => {
      listHtml += `<li style="margin-bottom:6px;"><strong>${i+1}.</strong> <em>"${escapeHtml(c.quote)}"</em><br>${escapeHtml(c.comment)}</li>`;
    });
    listHtml += '</ul>';
  }

  bd.innerHTML = `
    <section class="modal-panel" style="max-width:520px; width:90%;">
      <div class="modal-header">
        <div>
          <span>PRD</span>
          <h3>Update PRD with comments</h3>
        </div>
        <button class="icon-button" type="button" aria-label="Close">×</button>
      </div>
      <div style="padding: 12px 16px 8px;">
        <div style="font-size:13px; margin-bottom:8px;">The following comments will be used to update the PRD:</div>
        ${listHtml}
        <div style="margin-top: 16px;">
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer;">
            <input type="checkbox" id="enableOpenAiToggle" />
            <span>Enable OpenAI API call</span>
          </label>
          <div style="font-size:11px; color:#666; margin-left:22px;">Default off. Turn on to send the update request to OpenAI.</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="secondary-button" id="cancelUpdateBtn">Cancel</button>
        <button class="primary-button" id="okUpdateBtn" disabled>OK</button>
      </div>
    </section>
  `;

  document.body.appendChild(bd);

  const close = () => bd.remove();
  bd.querySelector('.icon-button').onclick = close;
  bd.onclick = (e) => { if (e.target === bd) close(); };

  const toggle = bd.querySelector('#enableOpenAiToggle');
  const okBtn = bd.querySelector('#okUpdateBtn');
  const cancelBtn = bd.querySelector('#cancelUpdateBtn');

  toggle.checked = false;
  toggle.onchange = () => {
    okBtn.disabled = unresolved.length === 0 || !toggle.checked;
  };
  if (unresolved.length === 0) {
    okBtn.disabled = true;
  }

  cancelBtn.onclick = () => {
    close();
  };

  okBtn.onclick = async () => {
    // gray out all
    okBtn.disabled = true;
    cancelBtn.disabled = true;
    toggle.disabled = true;
    bd.querySelector('.icon-button').disabled = true;
    isUpdatingPrd = true;
    render(); // update main button state

    try {
      const result = await updatePrdWithComments(prd.content, unresolved);
      prd.content = result.prd;
      if (result.outputFile) prd.outputFile = result.outputFile;
      // mark as resolved
      unresolved.forEach(c => c.resolved = true);
      close();
      persist();
      render();
    } catch (err) {
      alert('Failed to update PRD: ' + (err.message || err));
      isUpdatingPrd = false;
      render();
      // re-enable
      okBtn.disabled = false;
      cancelBtn.disabled = false;
      toggle.disabled = false;
      bd.querySelector('.icon-button').disabled = false;
    } finally {
      if (isUpdatingPrd) {
        isUpdatingPrd = false;
        render();
      }
    }
  };
}

// Attach delegation for PRD right-click comments (once)
if (checklist) {
  checklist.addEventListener("contextmenu", (e) => {
    const prdArea = e.target.closest(".prd-drafted-content");
    if (prdArea && selectedIndex === 1) {
      handlePrdRightClick(e);
    }
  });
}

render();

function parseDisplayDate(value) {
  if (!value || value === "Ongoing") return "";

  const parsed = new Date(`${value} 00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createProductId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `product-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function hasLegacyProductData(saved) {
  if (!saved || typeof saved !== "object") return false;
  if (saved.productName || saved.formFactor || saved.productType || normalizePrice(saved.bomTarget) > 0) return true;
  if (Array.isArray(saved.completed) && saved.completed.some(Boolean)) return true;

  if (Array.isArray(saved.checklistContexts) && saved.checklistContexts.flat().some((item) => typeof item === "string" && item.trim())) return true;
  if (Array.isArray(saved.checklistFeatures) && saved.checklistFeatures.flat(2).some((item) => typeof item === "string" && item.trim())) return true;
  return false;
}

function productDisplayName(product) {
  if (product.productName && product.productName.trim()) {
    return summarizeContext(product.productName);
  }
  const description = product.checklistContexts?.[0]?.[0]?.trim();
  if (description) return summarizeContext(description);
  if (product.productType) return product.productType;
  const index = state.products.findIndex((item) => item.id === product.id);
  return `Product ${index + 1}`;
}

function productCompletionPercent(product) {
  const completed = product.completed.filter(Boolean).length;
  return Math.round((completed / stages.length) * 100);
}

function currentStageName(product) {
  const index = product.completed.findIndex((done) => !done);
  return index === -1 ? "Complete" : stages[index].name;
}

function productIcon(product) {
  if (product.productType === "Industrial IoT") return "II";
  if (product.productType === "Smart appliance products") return "SA";
  if (product.productType === "Connected devices") return "CD";
  return "P";
}

function openDeleteProductModal(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;

  pendingDeleteProductId = product.id;
  deleteProductMessage.textContent = `This will remove ${productDisplayName(product)} and its saved workflow inputs from this browser.`;
  deleteProductModal.classList.remove("is-hidden");
  deleteProductConfirmButton.focus();
}

function closeDeleteProductModal() {
  pendingDeleteProductId = null;
  deleteProductModal.classList.add("is-hidden");
}

function deletePendingProduct() {
  if (!pendingDeleteProductId) return;

  state.products = state.products.filter((product) => product.id !== pendingDeleteProductId);
  if (state.selectedProductId === pendingDeleteProductId) {
    state.selectedProductId = null;
  }
  closeDeleteProductModal();
  persist();
  render();
}

function normalizeContexts(contexts, length) {
  return Array.from({ length }, (_, index) => typeof contexts?.[index] === "string" ? contexts[index] : "");
}

function normalizeFeatureLists(featureLists, length) {
  return Array.from({ length }, (_, index) => {
    const features = featureLists?.[index];
    return Array.isArray(features) ? features.filter((feature) => typeof feature === "string") : [];
  });
}

function normalizePrdOutput(output) {
  if (!output || typeof output !== "object") return null;

  return {
    inputFile: typeof output.inputFile === "string" ? output.inputFile : "",
    outputFile: typeof output.outputFile === "string" ? output.outputFile : "",
    generatedAt: typeof output.generatedAt === "string" ? output.generatedAt : "",
    content: typeof output.content === "string" ? output.content : (typeof output.prd === "string" ? output.prd : ""),
    comments: Array.isArray(output.comments)
      ? output.comments.map((c) => ({
          id: String(c.id || ("c_" + Date.now())),
          quote: String(c.quote || ""),
          comment: String(c.comment || ""),
          createdAt: String(c.createdAt || new Date().toISOString()),
          type: c.type === "image" ? "image" : "text",
          resolved: !!c.resolved
        }))
      : []
  };
}

function normalizeSpecReview(review) {
  if (!review || typeof review !== "object") return null;

  const knownStatuses = ["approved", "needs_changes", "error"];
  return {
    status: knownStatuses.includes(review.status) ? review.status : "needs_changes",
    review: typeof review.review === "string" ? review.review : "",
    reviewedAt: typeof review.reviewedAt === "string" ? review.reviewedAt : "",
    specSignature: typeof review.specSignature === "string" ? review.specSignature : ""
  };
}

function normalizePrice(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric * 100) / 100;
}

function summarizeContext(value) {
  const clean = value.trim().replace(/\s+/g, " ");
  return clean.length > 92 ? `${clean.slice(0, 92)}...` : clean;
}

function isFeatureItem(item) {
  return item === "Primary use cases";
}

function getDocumentedCount(stageIndex) {
  const product = activeProduct();
  if (!product) return 0;

  const stage = stages[stageIndex];
  return stage.checklist.reduce((count, item, index) => {
    // For PRD review first step, count as documented if the PRD was generated from spec (location or content)
    if (stageIndex === 1 && index === 0) {
      const prd = product.prdOutputs && product.prdOutputs[0];
      return count + (prd && (prd.content || prd.outputFile) ? 1 : 0);
    }

    if (isFeatureItem(item)) {
      return count + (product.checklistFeatures[stageIndex][index].length > 0 ? 1 : 0);
    }

    return count + (product.checklistContexts[stageIndex][index].trim() ? 1 : 0);
  }, 0);
}

function renderFeatureChecklistItem(stage, stageIndex, checkIndex, status) {
  const product = activeProduct();
  const features = product?.checklistFeatures[stageIndex][checkIndex] || [];
  const hasFeatures = features.length > 0;
  const disabled = status === "locked" ? "disabled" : "";

  return `
    <li class="check-item feature-check-item">
      <div class="feature-check-card${hasFeatures ? " has-context" : ""}">
        <div class="feature-check-header">
          <div>
            <strong>${escapeHtml(stage.checklist[checkIndex])}</strong>
            <span>${features.length ? `${features.length} use case${features.length === 1 ? "" : "s"} added` : "Add use cases"}</span>
          </div>
          <button class="feature-add-button" type="button" data-check="${checkIndex}" ${disabled} aria-label="Add Primary use case">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
        <ol class="feature-list">
          ${features.map((feature, featureIndex) => `
            <li>
              <button class="feature-edit-button" type="button" data-check="${checkIndex}" data-feature="${featureIndex}" ${disabled}>
                <span>${escapeHtml(summarizeFeature(feature))}</span>
              </button>
              <button class="feature-delete-button" type="button" data-check="${checkIndex}" data-feature="${featureIndex}" ${disabled} aria-label="Delete use case">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>
              </button>
            </li>
          `).join("")}
        </ol>
      </div>
    </li>
  `;
}

function summarizeFeature(value) {
  const featureLine = value.split("\n").find((line) => line.trim() && !line.trim().endsWith(":"));
  return featureLine ? summarizeContext(featureLine.replace(/^(feature|use case):\s*/i, "")) : "Untitled use case";
}

function openContextModal(checkIndex) {
  const product = activeProduct();
  if (!product) return;

  const stage = stages[selectedIndex];
  activeContext = { type: "context", stageIndex: selectedIndex, checkIndex };
  modalStage.textContent = stage.name;
  modalTitle.textContent = stage.checklist[checkIndex];
  contextInput.previousElementSibling.textContent = "Description";
  contextInput.value = product.checklistContexts[selectedIndex][checkIndex] || "";
  contextInput.readOnly = false;
  contextInput.style.fontFamily = "";
  contextInput.style.whiteSpace = "";
  modalSaveState.textContent = "Saved on close";
  contextModal.classList.remove("is-hidden");
  contextInput.focus();
}

function openFeatureModal(checkIndex, featureIndex = null) {
  const product = activeProduct();
  if (!product) return;

  const stage = stages[selectedIndex];
  activeContext = { type: "feature", stageIndex: selectedIndex, checkIndex, featureIndex };
  modalStage.textContent = `${stage.name} · Primary use cases`;
  modalTitle.textContent = featureIndex === null ? "New use case" : "Edit use case";
  contextInput.previousElementSibling.textContent = "Use case details";
  contextInput.value = featureIndex === null ? FEATURE_TEMPLATE : product.checklistFeatures[selectedIndex][checkIndex][featureIndex];
  modalSaveState.textContent = "Saved on close";
  contextModal.classList.remove("is-hidden");
  contextInput.focus();
}

function closeContextModal() {
  if (!activeContext) {
    contextModal.classList.add("is-hidden");
    return;
  }

  const { stageIndex, checkIndex } = activeContext;
  const next = contextInput.value;

  if (activeContext.type === "feature") {
    saveFeatureContext(activeContext, next);
  } else {
    const product = activeProduct();
    if (!product) return;

    const previous = product.checklistContexts[stageIndex][checkIndex] || "";
    product.checklistContexts[stageIndex][checkIndex] = next;

    if (previous !== next) {
      logActivity(`${stages[stageIndex].checklist[checkIndex]} updated`);
    }
  }

  contextInput.readOnly = false;
  contextInput.style.fontFamily = "";
  contextInput.style.whiteSpace = "";

  activeContext = null;
  contextModal.classList.add("is-hidden");
  persist();
  render();
}

function saveFeatureContext(context, value) {
  const product = activeProduct();
  if (!product) return;

  const features = product.checklistFeatures[context.stageIndex][context.checkIndex];
  const text = value.trim() ? value : FEATURE_TEMPLATE;

  if (context.featureIndex === null) {
    features.push(text);
    logActivity("Primary use case added");
    return;
  }

  if (features[context.featureIndex] !== text) {
    features[context.featureIndex] = text;
    logActivity("Primary use case updated");
  }
}

function deleteFeature(checkIndex, featureIndex) {
  const product = activeProduct();
  if (!product) return;

  product.checklistFeatures[selectedIndex][checkIndex].splice(featureIndex, 1);
  logActivity("Primary use case deleted");
  persist();
  render();
}

function updateBomTarget(value) {
  const product = activeProduct();
  if (!product) return;

  const next = normalizePrice(value);
  if (product.bomTarget !== next) {
    logActivity(`BOM target set to $${next}`);
  }

  product.bomTarget = next;
  persist();
  render();
}

async function generatePrd(stageIndex) {
  let response;

  try {
    response = await fetch("/api/generate-prd", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildPrdPayload(stageIndex))
    });
  } catch {
    throw new Error("Could not reach the PRD server. Start the app with npm start and open the localhost URL printed by the server.");
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Unable to generate PRD.");
  }

  if (!result.outputFile) {
    throw new Error("The PRD was generated, but the output file path was not returned.");
  }

  return result;
}

async function updatePrdWithComments(currentPrd, comments) {
  let response;
  try {
    response = await fetch("/api/update-prd", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ currentPrd, comments })
    });
  } catch {
    throw new Error("Could not reach the PRD server. Start the app with npm start and open the localhost URL printed by the server.");
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Unable to update PRD.");
  }

  if (!result.prd) {
    throw new Error("The updated PRD was not returned.");
  }

  return result;
}

async function inspectSpec(stageIndex, payload = buildPrdPayload(stageIndex)) {
  let response;

  try {
    response = await fetch("/api/inspect-spec", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error("Could not reach the spec inspection server. Start the app with npm start and open the localhost URL printed by the server.");
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Unable to inspect spec.");
  }

  if (!result.review) {
    throw new Error("OpenAI returned an empty spec inspection.");
  }

  return result;
}

function buildPrdPayload(stageIndex) {
  const product = activeProduct();
  if (!product) return {};

  const stage = stages[stageIndex];

  return {
    stage: {
      index: stageIndex + 1,
      name: stage.name,
      summary: stage.summary,
      owner: stage.owner,
      targetDate: product.targetDates[stageIndex],
      deliverable: stage.deliverable,
      decisionGate: stage.gate,
      evidenceRequired: stage.evidence
    },
    product: {
      name: product.productName?.trim() || productDisplayName(product),
      type: product.productType,
      formFactor: product.formFactor || "",
      bomTarget: product.bomTarget
    },
    checklist: stage.checklist.map((item, checkIndex) => {
      if (isFeatureItem(item)) {
        return {
          item,
          type: "use_cases",
          useCases: product.checklistFeatures[stageIndex][checkIndex]
        };
      }

      return {
        item,
        type: "description",
        description: product.checklistContexts[stageIndex][checkIndex]
      };
    }),

    priorStages: stages.slice(0, stageIndex).map((priorStage, index) => ({
      name: priorStage.name,
      completed: product.completed[index],
      prdOutput: product.prdOutputs[index]
    }))
  };
}

function getCompleteButtonMarkup(status) {
  if (isGeneratingPrd) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M18.36 5.64l-2.12 2.12M7.76 16.24l-2.12 2.12"/></svg> Generating PRD';
  }

  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg> Generate PRD';
}

function getInspectSpecButtonMarkup() {
  if (isInspectingSpec) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M18.36 5.64l-2.12 2.12M7.76 16.24l-2.12 2.12"/></svg> Inspecting';
  }

  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 12h10M4 19h7"/><path d="m15 18 2 2 4-5"/></svg> Inspect spec';
}

function isCurrentSpecApproved(product, stageIndex) {
  const review = product.specReviews?.[stageIndex];
  return Boolean(review && review.status === "approved" && review.specSignature === specSignature(buildPrdPayload(stageIndex)));
}

function specSignature(payload) {
  return JSON.stringify(payload);
}

function isApprovedReview(review) {
  return review.trim().toLowerCase() === "approved";
}

function createActivity(message, timestamp = new Date().toISOString()) {
  return { message, timestamp };
}

function logActivity(message) {
  const product = activeProduct();
  if (!product) return;
  product.activity.push(createActivity(message));
}

function normalizeActivity(activity) {
  if (!Array.isArray(activity) || activity.length === 0) {
    return [createActivity("Workflow started")];
  }

  return activity.map((item) => {
    if (typeof item === "string") return createActivity(item);
    if (item && typeof item.message === "string") {
      return createActivity(item.message, typeof item.timestamp === "string" ? item.timestamp : undefined);
    }
    return createActivity("Workflow updated");
  });
}

function formatActivityTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
