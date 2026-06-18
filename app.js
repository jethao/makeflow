const stages = [
  {
    name: "Spec",
    summary: "Define the product idea, customer problem, success metrics, and hard constraints before deeper planning starts.",
    owner: "Alex Kim",
    target: "Jun 21, 2026",
    deliverable: "Approved concept spec",
    gate: "The opportunity, target user, problem statement, and measurable outcome are clear enough for PRD work.",
    evidence: "Problem statement, user segment, core use cases, assumptions, and first success metric.",
    checklist: ["Product description", "Target customer", "Primary use cases", "Success metric", "Key assumptions"]
  },
  {
    name: "PRD review",
    summary: "Review and approve the Product Requirements Document with stakeholders.",
    owner: "Alex Kim",
    target: "Jun 28, 2026",
    deliverable: "Approved PRD",
    gate: "The PRD is complete, aligned with business goals, and accepted by product, design, and engineering.",
    evidence: "Reviewed PRD, open questions resolved, acceptance criteria, release scope, and sign-off notes.",
    checklist: ["PRD drafted", "Stakeholder review", "Feedback incorporated", "Acceptance criteria approved", "Final sign-off"]
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
const FEATURE_TEMPLATE = `Feature:

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
const checklist = document.querySelector("#checklist");
const checklistCount = document.querySelector("#checklistCount");
const gateText = document.querySelector("#gateText");
const evidenceText = document.querySelector("#evidenceText");
const blockedByText = document.querySelector("#blockedByText");
const notesInput = document.querySelector("#notesInput");
const saveState = document.querySelector("#saveState");
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
const prdReviewModal = document.querySelector("#prdReviewModal");
const prdReviewStage = document.querySelector("#prdReviewStage");
const prdReviewContent = document.querySelector("#prdReviewContent");
const prdReviewCloseButton = document.querySelector("#prdReviewCloseButton");
const prdReviewCancelButton = document.querySelector("#prdReviewCancelButton");
const prdReviewConfirmButton = document.querySelector("#prdReviewConfirmButton");
const specInspectModal = document.querySelector("#specInspectModal");
const specInspectJson = document.querySelector("#specInspectJson");
const specInspectStage = document.querySelector("#specInspectStage");
const specInspectCloseButton = document.querySelector("#specInspectCloseButton");
const specInspectCancelButton = document.querySelector("#specInspectCancelButton");
const specInspectOkButton = document.querySelector("#specInspectOkButton");
const allowOpenAiToggle = document.querySelector("#allowOpenAiToggle");
const openAiToggleStatus = document.querySelector("#openAiToggleStatus");
const deleteProductModal = document.querySelector("#deleteProductModal");
const deleteProductMessage = document.querySelector("#deleteProductMessage");
const deleteProductCloseButton = document.querySelector("#deleteProductCloseButton");
const deleteProductCancelButton = document.querySelector("#deleteProductCancelButton");
const deleteProductConfirmButton = document.querySelector("#deleteProductConfirmButton");

let activeContext = null;
let pendingPrdStageIndex = null;
let pendingDeleteProductId = null;
let isGeneratingPrd = false;
let isInspectingSpec = false;
let prdGenerationError = "";
let specInspectionError = "";

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
      productType: typeof saved.productType === "string" ? saved.productType : "",
      bomTarget: normalizePrice(saved.bomTarget),
      targetDates: stages.map((_, index) => typeof saved.targetDates?.[index] === "string" ? saved.targetDates[index] : defaultDates[index]),
      specReviews: stages.map((_, index) => normalizeSpecReview(saved.specReviews?.[index])),
      prdOutputs: stages.map((_, index) => normalizePrdOutput(saved.prdOutputs?.[index])),
      notes: stages.map((_, index) => saved.notes?.[index] || ""),
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
    productType: "",
    bomTarget: 0,
    targetDates: defaultDates,
    specReviews: Array(stages.length).fill(null),
    prdOutputs: Array(stages.length).fill(null),
    notes: Array(stages.length).fill(""),
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
    productType: typeof product.productType === "string" ? product.productType : "",
    bomTarget: normalizePrice(product.bomTarget),
    targetDates: stages.map((_, index) => typeof product.targetDates?.[index] === "string" ? product.targetDates[index] : defaultDates[index]),
    specReviews: stages.map((_, index) => normalizeSpecReview(product.specReviews?.[index])),
    prdOutputs: stages.map((_, index) => normalizePrdOutput(product.prdOutputs?.[index])),
    notes: stages.map((_, index) => product.notes?.[index] || ""),
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
  gateText.textContent = stage.gate;
  evidenceText.textContent = stage.evidence;
  blockedByText.textContent = selectedIndex === 0 ? "No prior stage. This is the entry point." : stages[selectedIndex - 1].name;
  productTypeSelect.value = product.productType;
  productTypeSelect.disabled = status === "locked";
  bomTargetInput.value = product.bomTarget;
  bomTargetInput.disabled = status === "locked";

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
  notesInput.value = product.notes[selectedIndex];
  notesInput.disabled = status === "locked";

  const allDocumented = documentedCount === stage.checklist.length;
  const hasProductType = Boolean(product.productType);
  const hasBomTarget = product.bomTarget > 0;
  const canInspectSpec = status !== "locked" && status !== "completed" && allDocumented && hasProductType && hasBomTarget;
  const specApproved = isCurrentSpecApproved(product, selectedIndex);
  inspectSpecButton.disabled = isInspectingSpec || isGeneratingPrd || !canInspectSpec;
  inspectSpecButton.innerHTML = getInspectSpecButtonMarkup();
  completeButton.disabled = isGeneratingPrd || isInspectingSpec || status === "locked" || status === "completed" || !allDocumented || !hasProductType || !hasBomTarget || !specApproved;
  completeButton.innerHTML = getCompleteButtonMarkup(status);

  if (status === "locked") {
    completionHint.textContent = `Complete ${stages[selectedIndex - 1].name} before this step can start.`;
  } else if (status === "completed") {
    const output = product.prdOutputs[selectedIndex];
    completionHint.textContent = output?.outputFile
      ? `PRD saved locally at ${output.outputFile}.`
      : "This gate is complete. You can review notes or move to the next unlocked stage.";
  } else if (isGeneratingPrd) {
    completionHint.textContent = "Generating PRD from the collected inputs...";
  } else if (isInspectingSpec) {
    completionHint.textContent = "Inspecting spec with OpenAI...";
  } else if (prdGenerationError) {
    completionHint.textContent = prdGenerationError;
  } else if (specInspectionError) {
    completionHint.textContent = specInspectionError;
  } else if (!hasProductType) {
    completionHint.textContent = "Select a product type before completing this stage.";
  } else if (!hasBomTarget) {
    completionHint.textContent = "Set a BOM target before completing this stage.";
  } else if (!allDocumented) {
    completionHint.textContent = "Add descriptions for every checklist item and at least one Primary use cases feature.";
  } else if (!specApproved && product.specReviews[selectedIndex]) {
    completionHint.textContent = "Spec inspection needs changes or is out of date. See Activity, then inspect again.";
  } else if (!specApproved) {
    completionHint.textContent = "Inspect the spec and receive approved before generating the PRD.";
  } else {
    completionHint.textContent = "Spec approved. You can generate the PRD.";
  }

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
  if (completeButton.disabled || isGeneratingPrd) return;
  openPrdReviewModal(selectedIndex);
}

function closeSpecInspectModal() {
  specInspectModal.classList.add("is-hidden");
}

async function inspectCurrentSpec() {
  const product = activeProduct();
  if (!product || inspectSpecButton.disabled || isInspectingSpec) return;

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
    logActivity(review);
  } catch (error) {
    specInspectionError = error.message;
    logActivity(`${stages[stageIndex].name} spec inspection failed: ${error.message}`);
  } finally {
    isInspectingSpec = false;
    persist();
    render();
  }
}

async function generateConfirmedPrd() {
  const product = activeProduct();
  if (pendingPrdStageIndex === null || isGeneratingPrd) return;
  if (!product) return;
  if (!allowOpenAiToggle.checked) {
    updatePrdReviewActionState();
    return;
  }

  const stageIndex = pendingPrdStageIndex;
  closePrdReviewModal();
  isGeneratingPrd = true;
  prdGenerationError = "";
  logActivity(`${stages[stageIndex].name} PRD generation started`);
  persist();
  render();

  try {
    const result = await generatePrd(stageIndex);
    product.prdOutputs[stageIndex] = {
      inputFile: result.inputFile,
      outputFile: result.outputFile,
      generatedAt: new Date().toISOString()
    };
    product.completed[stageIndex] = true;
    logActivity(`${stages[stageIndex].name} PRD generated at ${result.outputFile}`);

    if (stageIndex < stages.length - 1) {
      selectedIndex = stageIndex + 1;
      logActivity(`${stages[selectedIndex].name} unlocked`);
    }
  } catch (error) {
    prdGenerationError = error.message;
    logActivity(`${stages[stageIndex].name} PRD generation failed: ${error.message}`);
  } finally {
    isGeneratingPrd = false;
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

notesInput.addEventListener("input", () => {
  const product = activeProduct();
  if (!product) return;
  product.notes[selectedIndex] = notesInput.value;
  saveState.textContent = "Saving...";
  persist();
  window.clearTimeout(notesInput.saveTimer);
  notesInput.saveTimer = window.setTimeout(() => {
    saveState.textContent = "Saved locally";
  }, 300);
});

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
inspectSpecButton.addEventListener("click", () => {
  const product = activeProduct();
  if (!product || inspectSpecButton.disabled || isInspectingSpec) return;

  const stageIndex = selectedIndex;
  const payload = buildPrdPayload(stageIndex);

  specInspectJson.textContent = JSON.stringify(payload, null, 2);
  if (specInspectStage) {
    specInspectStage.textContent = `${stageIndex + 1}. ${stages[stageIndex].name}`;
  }
  specInspectModal.classList.remove("is-hidden");
  specInspectOkButton.focus();
});

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
prdReviewCloseButton.addEventListener("click", closePrdReviewModal);
prdReviewCancelButton.addEventListener("click", closePrdReviewModal);
prdReviewConfirmButton.addEventListener("click", () => {
  generateConfirmedPrd();
});
specInspectCloseButton.addEventListener("click", closeSpecInspectModal);
specInspectCancelButton.addEventListener("click", closeSpecInspectModal);
specInspectOkButton.addEventListener("click", () => {
  closeSpecInspectModal();
  inspectCurrentSpec();
});
specInspectModal.addEventListener("click", (event) => {
  if (event.target === specInspectModal) closeSpecInspectModal();
});
allowOpenAiToggle.addEventListener("change", updatePrdReviewActionState);
prdReviewModal.addEventListener("click", (event) => {
  if (event.target === prdReviewModal) closePrdReviewModal();
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
  } else if (event.key === "Escape" && !prdReviewModal.classList.contains("is-hidden")) {
    closePrdReviewModal();
  } else if (event.key === "Escape" && !deleteProductModal.classList.contains("is-hidden")) {
    closeDeleteProductModal();
  } else if (event.key === "Escape" && !specInspectModal.classList.contains("is-hidden")) {
    closeSpecInspectModal();
  }
});

completeButton.addEventListener("click", () => {
  completeCurrentStep();
});

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
  if (saved.productType || normalizePrice(saved.bomTarget) > 0) return true;
  if (Array.isArray(saved.completed) && saved.completed.some(Boolean)) return true;
  if (Array.isArray(saved.notes) && saved.notes.some((note) => typeof note === "string" && note.trim())) return true;
  if (Array.isArray(saved.checklistContexts) && saved.checklistContexts.flat().some((item) => typeof item === "string" && item.trim())) return true;
  if (Array.isArray(saved.checklistFeatures) && saved.checklistFeatures.flat(2).some((item) => typeof item === "string" && item.trim())) return true;
  return false;
}

function productDisplayName(product) {
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
    generatedAt: typeof output.generatedAt === "string" ? output.generatedAt : ""
  };
}

function normalizeSpecReview(review) {
  if (!review || typeof review !== "object") return null;

  return {
    status: review.status === "approved" ? "approved" : "needs_changes",
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
            <span>${features.length ? `${features.length} feature${features.length === 1 ? "" : "s"} added` : "Add features"}</span>
          </div>
          <button class="feature-add-button" type="button" data-check="${checkIndex}" ${disabled} aria-label="Add Primary use cases feature">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
        <ol class="feature-list">
          ${features.map((feature, featureIndex) => `
            <li>
              <button class="feature-edit-button" type="button" data-check="${checkIndex}" data-feature="${featureIndex}" ${disabled}>
                <span>${escapeHtml(summarizeFeature(feature))}</span>
              </button>
              <button class="feature-delete-button" type="button" data-check="${checkIndex}" data-feature="${featureIndex}" ${disabled} aria-label="Delete feature">
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
  return featureLine ? summarizeContext(featureLine.replace(/^feature:\s*/i, "")) : "Untitled feature";
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
  modalTitle.textContent = featureIndex === null ? "New feature" : "Edit feature";
  contextInput.previousElementSibling.textContent = "Feature details";
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
    logActivity("Primary use cases feature added");
    return;
  }

  if (features[context.featureIndex] !== text) {
    features[context.featureIndex] = text;
    logActivity("Primary use cases feature updated");
  }
}

function deleteFeature(checkIndex, featureIndex) {
  const product = activeProduct();
  if (!product) return;

  product.checklistFeatures[selectedIndex][checkIndex].splice(featureIndex, 1);
  logActivity("Primary use cases feature deleted");
  persist();
  render();
}

function openPrdReviewModal(stageIndex) {
  const payload = buildPrdPayload(stageIndex);
  pendingPrdStageIndex = stageIndex;
  prdReviewStage.textContent = `${payload.stage.index}. ${payload.stage.name}`;
  prdReviewContent.textContent = JSON.stringify(payload, null, 2);
  allowOpenAiToggle.checked = false;
  updatePrdReviewActionState();
  prdReviewModal.classList.remove("is-hidden");
  allowOpenAiToggle.focus();
}

function closePrdReviewModal() {
  pendingPrdStageIndex = null;
  allowOpenAiToggle.checked = false;
  updatePrdReviewActionState();
  prdReviewModal.classList.add("is-hidden");
}

function updatePrdReviewActionState() {
  const allowed = allowOpenAiToggle.checked;
  prdReviewConfirmButton.disabled = !allowed;
  openAiToggleStatus.textContent = allowed
    ? "On. Confirming will send this input to OpenAI."
    : "Off by default. Turn on to generate the PRD.";
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
      name: productDisplayName(product),
      type: product.productType,
      bomTarget: product.bomTarget
    },
    checklist: stage.checklist.map((item, checkIndex) => {
      if (isFeatureItem(item)) {
        return {
          item,
          type: "features",
          features: product.checklistFeatures[stageIndex][checkIndex]
        };
      }

      return {
        item,
        type: "description",
        description: product.checklistContexts[stageIndex][checkIndex]
      };
    }),
    notes: product.notes[stageIndex],
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

  if (status === "completed") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg> PRD generated';
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
