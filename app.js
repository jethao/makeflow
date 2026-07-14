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
const WORKSPACE_SYNC_DEBOUNCE_MS = 600;
const defaultDates = stages.map((stage) => parseDisplayDate(stage.target));
const FEATURE_TEMPLATE = `Use case:

How to use:

Operating condition:

Acceptance criteria (create test cases):

Metrics:`;

let state = loadState();
let selectedIndex = Math.min(activeProduct()?.selectedIndex || 0, stages.length - 1);
let currentUser = null;
let appBootstrapped = false;
let workspaceSyncTimer = null;
let workspaceSyncInFlight = false;
let workspaceSyncQueued = false;
let cloudSyncEnabled = false;
let shareViewActive = false;

const landingView = document.querySelector("#landingView");
const appShell = document.querySelector("#appShell");
const userMenuButton = document.querySelector("#userMenuButton");
const userMenuDropdown = document.querySelector("#userMenuDropdown");
const userAvatarImage = document.querySelector("#userAvatarImage");
const userAvatarInitials = document.querySelector("#userAvatarInitials");
const userMenuName = document.querySelector("#userMenuName");
const userMenuEmail = document.querySelector("#userMenuEmail");
const logoutButton = document.querySelector("#logoutButton");
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
let openLocalPrdInput = null;
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
let specController = null;

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
      feasibilityAnalyses: stages.map((_, index) => normalizeFeasibilityAnalysis(saved.feasibilityAnalyses?.[index])),
      designOutputs: normalizeDesignOutputs(saved.designOutputs),
      designCostEstimate: normalizeDesignCostEstimate(saved.designCostEstimate),

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
    feasibilityAnalyses: Array(stages.length).fill(null),
    designOutputs: {},
    designCostEstimate: null,

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
    feasibilityAnalyses: stages.map((_, index) => normalizeFeasibilityAnalysis(product.feasibilityAnalyses?.[index])),
    designOutputs: normalizeDesignOutputs(product.designOutputs),
    designCostEstimate: normalizeDesignCostEstimate(product.designCostEstimate),

    activity: normalizeActivity(product.activity),
    selectedIndex: Math.min(product.selectedIndex || 0, stages.length - 1)
  });
}

function persist() {
  const product = activeProduct();
  if (product) product.selectedIndex = selectedIndex;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleWorkspaceSync();
}

function scheduleWorkspaceSync() {
  if (!cloudSyncEnabled || !currentUser) return;
  workspaceSyncQueued = true;
  if (workspaceSyncTimer) clearTimeout(workspaceSyncTimer);
  workspaceSyncTimer = setTimeout(() => {
    workspaceSyncTimer = null;
    syncWorkspaceToServer();
  }, WORKSPACE_SYNC_DEBOUNCE_MS);
}

async function syncWorkspaceToServer() {
  if (!cloudSyncEnabled || !currentUser) return;
  if (workspaceSyncInFlight) {
    workspaceSyncQueued = true;
    return;
  }

  workspaceSyncQueued = false;
  workspaceSyncInFlight = true;
  try {
    const response = await fetch("/api/workspace", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selectedProductId: state.selectedProductId,
        products: state.products
      })
    });

    if (response.status === 401) {
      cloudSyncEnabled = false;
      showLanding();
      return;
    }

    if (!response.ok) {
      console.warn("Workspace sync failed", response.status);
    }
  } catch (error) {
    console.warn("Workspace sync network error", error);
  } finally {
    workspaceSyncInFlight = false;
    if (workspaceSyncQueued) {
      workspaceSyncQueued = false;
      await syncWorkspaceToServer();
    }
  }
}

async function flushWorkspaceSync() {
  if (workspaceSyncTimer) {
    clearTimeout(workspaceSyncTimer);
    workspaceSyncTimer = null;
  }
  workspaceSyncQueued = true;
  await syncWorkspaceToServer();
}

function applyWorkspace(workspace) {
  const products = Array.isArray(workspace?.products)
    ? workspace.products.map(normalizeProduct).filter(Boolean)
    : [];

  state = {
    products,
    selectedProductId: products.some((product) => product.id === workspace?.selectedProductId)
      ? workspace.selectedProductId
      : null
  };

  selectedIndex = Math.min(activeProduct()?.selectedIndex || 0, stages.length - 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function loadCloudWorkspace() {
  const response = await fetch("/api/workspace", {
    credentials: "same-origin"
  });

  if (response.status === 401) {
    throw new Error("unauthorized");
  }
  if (!response.ok) {
    throw new Error(`workspace_load_failed_${response.status}`);
  }

  const workspace = await response.json();
  const serverEmpty = !Array.isArray(workspace?.products) || workspace.products.length === 0;
  const local = loadState();

  if (serverEmpty && local.products.length > 0) {
    const migrateResponse = await fetch("/api/workspace", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selectedProductId: local.selectedProductId,
        products: local.products
      })
    });
    if (!migrateResponse.ok) {
      throw new Error(`workspace_migrate_failed_${migrateResponse.status}`);
    }
    const migrated = await migrateResponse.json();
    applyWorkspace(migrated);
    return;
  }

  applyWorkspace(workspace);
}

async function importTemplateById(templateId) {
  const response = await fetch("/api/workspace/import-template", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateId })
  });

  if (response.status === 401) {
    showLanding();
    return null;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Unable to import template (HTTP ${response.status})`);
  }

  if (payload.workspace) applyWorkspace(payload.workspace);
  return payload;
}

function activeProduct() {
  return state.products.find((product) => product.id === state.selectedProductId) || null;
}

function prdReviewCore() {
  return window.PrdReviewCore || {
    isPrdReviewUnlocked(product, index) {
      if (!product) return false;
      if (index === 0 || index === 1) return true;
      return Boolean(product.completed?.[index - 1]);
    },
    getPrdReviewSource(product) {
      const reviewOutput = product?.prdOutputs?.[1];
      if (reviewOutput?.content?.trim()) return { output: reviewOutput, sourceIndex: 1 };
      const generatedOutput = product?.prdOutputs?.[0];
      if (generatedOutput?.content?.trim()) return { output: generatedOutput, sourceIndex: 0 };
      return { output: null, sourceIndex: null };
    },
    createLocalPrdOutput({ name, content }) {
      return {
        inputFile: name || "local-prd.md",
        outputFile: name || "local-prd.md",
        generatedAt: new Date().toISOString(),
        content: content || "",
        source: "local_file",
        comments: []
      };
    },
    extractProductNameFromPrd(content) {
      const text = String(content || "");
      const fieldMatch = text.match(
        /(?:^|\n)\s*(?:\*{0,2}|_{0,2})Product\s*name(?:\*{0,2}|_{0,2})\s*[:：]\s*(?:\*{0,2}|_{0,2})(.+?)(?:\*{0,2}|_{0,2})\s*(?=\n|$)/i
      );
      if (fieldMatch) {
        const name = String(fieldMatch[1] || "").replace(/[*_`#]/g, "").replace(/\s+/g, " ").trim();
        if (name) return name.slice(0, 120);
      }
      const headingMatch = text.match(/^\s{0,3}#\s+(.+?)\s*$/m);
      if (headingMatch) {
        let heading = String(headingMatch[1] || "").replace(/[*_`#]/g, "").replace(/\s+/g, " ").trim();
        heading = heading
          .replace(/\s*[-–—:|]\s*product\s+requirements\s+document\s*$/i, "")
          .replace(/\s+product\s+requirements\s+document\s*$/i, "")
          .replace(/\s*\((?:prd|product\s+requirements\s+document)\)\s*$/i, "")
          .replace(/\s+prd\s*$/i, "")
          .trim();
        if (heading) return heading.slice(0, 120);
      }
      return "";
    },
    preserveScrollPositions(targets, action, scheduleRestore) {
      const snapshots = Array.from(targets || [])
        .filter((target, index, list) => target && list.indexOf(target) === index)
        .filter((target) => typeof target.scrollTop === "number" || typeof target.scrollLeft === "number")
        .map((target) => ({
          target,
          top: Number(target.scrollTop) || 0,
          left: Number(target.scrollLeft) || 0
        }));
      const result = typeof action === "function" ? action() : undefined;
      const restore = () => {
        snapshots.forEach(({ target, top, left }) => {
          if (typeof target.scrollTop === "number") target.scrollTop = top;
          if (typeof target.scrollLeft === "number") target.scrollLeft = left;
        });
      };
      restore();
      if (typeof scheduleRestore === "function") scheduleRestore(restore);
      return result;
    },
    preserveScrollPositionBySelector(selector, root, action, scheduleRestore) {
      const queryRoot = root && typeof root.querySelector === "function" ? root : null;
      const before = queryRoot ? queryRoot.querySelector(selector) : null;
      const top = before && typeof before.scrollTop === "number" ? before.scrollTop : 0;
      const left = before && typeof before.scrollLeft === "number" ? before.scrollLeft : 0;
      const result = typeof action === "function" ? action() : undefined;
      const restore = () => {
        const after = queryRoot ? queryRoot.querySelector(selector) : null;
        if (!after) return;
        if (typeof after.scrollTop === "number") after.scrollTop = top;
        if (typeof after.scrollLeft === "number") after.scrollLeft = left;
      };
      restore();
      if (typeof scheduleRestore === "function") scheduleRestore(restore);
      return result;
    }
  };
}

function getActivePrdReviewSource(product = activeProduct()) {
  return prdReviewCore().getPrdReviewSource(product);
}

function isUnlocked(index) {
  const product = activeProduct();
  return prdReviewCore().isPrdReviewUnlocked(product, index);
}

function renderPreservingPrdReviewScroll() {
  const targets = [
    document.scrollingElement,
    document.documentElement,
    document.body,
    workflowView,
    checklist?.parentElement,
    checklist
  ];
  const scheduleRestore = (restore) => {
    restore();
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => {
        restore();
        window.requestAnimationFrame(restore);
      });
    }
  };

  return prdReviewCore().preserveScrollPositionBySelector(".prd-drafted-content", document, () => {
    return prdReviewCore().preserveScrollPositions(targets, render, scheduleRestore);
  }, scheduleRestore);
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

    // Clean previous action sections
    const oldUpdate = document.getElementById('updatePrdSection');
    if (oldUpdate) oldUpdate.remove();
    const oldProceed = document.getElementById('proceedSection');
    if (oldProceed) oldProceed.remove();

    const prdSource = getActivePrdReviewSource(product);
    const prd = prdSource.output;
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

      const unresolved = (prd.comments || []).filter(c => !c.resolved);
      const ul = document.getElementById('checklist');
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
        if (ul && ul.parentNode) {
          ul.parentNode.insertBefore(updateSection, ul.nextSibling);
        }
        const updateBtn = document.getElementById('updatePrdBtn');
        if (updateBtn) {
          updateBtn.disabled = !!isUpdatingPrd;
          updateBtn.addEventListener('click', () => openUpdatePrdPopup(prd));
        }
      } else {
        // Show proceed button by default if no unaddressed comments
        const proceedSection = document.createElement('div');
        proceedSection.id = 'proceedSection';
        proceedSection.style.cssText = 'margin-top: 12px; padding: 0 4px;';
        proceedSection.innerHTML = `
          <button id="proceedBtn" class="primary-button">Proceed to Feasibility Analysis</button>
        `;
        if (ul && ul.parentNode) {
          ul.parentNode.insertBefore(proceedSection, ul.nextSibling);
        }
        const proceedBtn = document.getElementById('proceedBtn');
        if (proceedBtn) {
          proceedBtn.addEventListener('click', proceedToFeasibility);
        }
      }
    } else {
      checklist.innerHTML = `
        <li class="check-item">
          <div class="prd-empty-state">
            <strong>No PRD loaded</strong>
            <span>Generate a PRD from the Spec stage, or open a local PRD file to review now.</span>
            <button id="openLocalPrdButton" class="secondary-button" type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>
              Open local PRD file
            </button>
          </div>
        </li>
      `;
      checklistCount.textContent = '';
      const openLocalPrdButton = document.getElementById("openLocalPrdButton");
      if (openLocalPrdButton) {
        openLocalPrdButton.addEventListener("click", openLocalPrdFilePicker);
      }
    }
  } else if (selectedIndex === 2 && window.FeasibilityAnalysis) {
    const oldUpdate = document.getElementById('updatePrdSection');
    if (oldUpdate) oldUpdate.remove();
    const oldProceed = document.getElementById('proceedSection');
    if (oldProceed) oldProceed.remove();
    window.FeasibilityAnalysis.renderStage(product, {
      productRows,
      checklistNextButton,
      heading,
      actionRow,
      specWorkbench,
      checklist,
      checklistCount
    });
  } else if (selectedIndex === 3 && window.DesignStage) {
    const oldUpdate = document.getElementById('updatePrdSection');
    if (oldUpdate) oldUpdate.remove();
    const oldProceed = document.getElementById('proceedSection');
    if (oldProceed) oldProceed.remove();
    window.DesignStage.renderStage(product, {
      productRows,
      checklistNextButton,
      heading,
      actionRow,
      specWorkbench,
      checklist,
      checklistCount
    });
  } else if (selectedIndex === 4 && window.PrototypeStage) {
    const oldUpdate = document.getElementById('updatePrdSection');
    if (oldUpdate) oldUpdate.remove();
    const oldProceed = document.getElementById('proceedSection');
    if (oldProceed) oldProceed.remove();
    window.PrototypeStage.renderStage(product, {
      productRows,
      checklistNextButton,
      heading,
      actionRow,
      specWorkbench,
      checklist,
      checklistCount
    });
  } else if (selectedIndex === 5 && window.EVTStage) {
    const oldUpdate = document.getElementById('updatePrdSection');
    if (oldUpdate) oldUpdate.remove();
    const oldProceed = document.getElementById('proceedSection');
    if (oldProceed) oldProceed.remove();
    window.EVTStage.renderStage(product, {
      productRows,
      checklistNextButton,
      heading,
      actionRow,
      specWorkbench,
      checklist,
      checklistCount
    });
  } else if (selectedIndex === 6 && window.DVTStage) {
    const oldUpdate = document.getElementById('updatePrdSection');
    if (oldUpdate) oldUpdate.remove();
    const oldProceed = document.getElementById('proceedSection');
    if (oldProceed) oldProceed.remove();
    window.DVTStage.renderStage(product, {
      productRows,
      checklistNextButton,
      heading,
      actionRow,
      specWorkbench,
      checklist,
      checklistCount
    });
  } else if (selectedIndex === 7 && window.PVTStage) {
    const oldUpdate = document.getElementById('updatePrdSection');
    if (oldUpdate) oldUpdate.remove();
    const oldProceed = document.getElementById('proceedSection');
    if (oldProceed) oldProceed.remove();
    window.PVTStage.renderStage(product, {
      productRows,
      checklistNextButton,
      heading,
      actionRow,
      specWorkbench,
      checklist,
      checklistCount
    });
  } else if (selectedIndex === 8 && window.MPStage) {
    const oldUpdate = document.getElementById('updatePrdSection');
    if (oldUpdate) oldUpdate.remove();
    const oldProceed = document.getElementById('proceedSection');
    if (oldProceed) oldProceed.remove();
    window.MPStage.renderStage(product, {
      productRows,
      checklistNextButton,
      heading,
      actionRow,
      specWorkbench,
      checklist,
      checklistCount
    });
  } else if (selectedIndex === 9 && window.MaintenanceStage) {
    const oldUpdate = document.getElementById('updatePrdSection');
    if (oldUpdate) oldUpdate.remove();
    const oldProceed = document.getElementById('proceedSection');
    if (oldProceed) oldProceed.remove();
    window.MaintenanceStage.renderStage(product, {
      productRows,
      checklistNextButton,
      heading,
      actionRow,
      specWorkbench,
      checklist,
      checklistCount
    });
  } else {
    const oldUpdate = document.getElementById('updatePrdSection');
    if (oldUpdate) oldUpdate.remove();
    const oldProceed = document.getElementById('proceedSection');
    if (oldProceed) oldProceed.remove();
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
    const prd = getActivePrdReviewSource(product).output;
    completionHint.textContent = (prd && prd.content)
      ? "PRD content shown in the step checklist area."
      : "Open a local PRD file, or generate one from Spec.";
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

function completeCurrentStep() {
  if (isGeneratingPrd) return;
  openPrdReviewModal(selectedIndex);
}

function renderSpecWorkbench(product, stageIndex, isOpen) {
  return specController.renderSpecWorkbench(product, stageIndex, isOpen);
}

function syncAggregateSpecToChecklist() {
  return specController.syncAggregateSpecToChecklist();
}

async function inspectCurrentSpec() {
  return specController.inspectCurrentSpec();
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

async function loadLandingTemplates() {
  const grid = document.querySelector("#landingTemplateGrid");
  if (!grid) return;

  try {
    const response = await fetch("/api/templates");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(payload.templates)) {
      grid.innerHTML = `<p class="template-empty">Templates unavailable right now.</p>`;
      return;
    }

    grid.innerHTML = payload.templates.map((template) => `
      <article class="template-card">
        <div>
          <h3>${escapeHtml(template.title)}</h3>
          <p>${escapeHtml(template.description || "")}</p>
          <div class="template-tags">
            ${(template.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
          </div>
        </div>
        <div class="template-card-actions">
          <a class="secondary-button" href="/api/templates/${encodeURIComponent(template.id)}/download">Download</a>
          <a class="primary-button" href="/api/auth/google?importTemplate=${encodeURIComponent(template.id)}">Use template</a>
        </div>
      </article>
    `).join("");
  } catch {
    grid.innerHTML = `<p class="template-empty">Templates unavailable right now.</p>`;
  }
}

async function openTemplatePicker() {
  let modal = document.getElementById("templatePickerModal");
  if (!modal) {
    document.body.insertAdjacentHTML("beforeend", `
      <div id="templatePickerModal" class="modal-backdrop is-hidden" role="dialog" aria-modal="true" aria-labelledby="templatePickerTitle">
        <section class="modal-panel template-picker-panel">
          <div class="modal-header">
            <div>
              <span>Templates</span>
              <h3 id="templatePickerTitle">Start from a template</h3>
            </div>
            <button id="templatePickerCloseButton" class="icon-button" type="button" aria-label="Close templates">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div id="templatePickerList" class="template-picker-list"></div>
        </section>
      </div>
    `);
    modal = document.getElementById("templatePickerModal");
    document.getElementById("templatePickerCloseButton")?.addEventListener("click", () => {
      modal.classList.add("is-hidden");
    });
    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.classList.add("is-hidden");
    });
  }

  const list = document.getElementById("templatePickerList");
  list.innerHTML = `<p class="template-empty">Loading templates…</p>`;
  modal.classList.remove("is-hidden");

  try {
    const response = await fetch("/api/templates");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(payload.templates) || payload.templates.length === 0) {
      list.innerHTML = `<p class="template-empty">No templates available.</p>`;
      return;
    }

    list.innerHTML = payload.templates.map((template) => `
      <article class="template-picker-item">
        <div>
          <strong>${escapeHtml(template.title)}</strong>
          <p>${escapeHtml(template.description || "")}</p>
        </div>
        <div class="template-card-actions">
          <a class="secondary-button" href="/api/templates/${encodeURIComponent(template.id)}/download">Download</a>
          <button class="primary-button" type="button" data-import-template-id="${escapeHtml(template.id)}">Use template</button>
        </div>
      </article>
    `).join("");

    list.querySelectorAll("[data-import-template-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const result = await importTemplateById(button.dataset.importTemplateId);
          modal.classList.add("is-hidden");
          if (result?.productId) openProduct(result.productId);
          else render();
        } catch (error) {
          alert(error.message || "Template import failed.");
          button.disabled = false;
        }
      });
    });
  } catch {
    list.innerHTML = `<p class="template-empty">Templates unavailable right now.</p>`;
  }
}

async function maybeImportTemplateFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const templateId = params.get("importTemplate");
  if (!templateId) return;

  params.delete("importTemplate");
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash || ""}`;
  window.history.replaceState({}, "", next);

  try {
    const result = await importTemplateById(templateId);
    if (result?.productId) openProduct(result.productId);
  } catch (error) {
    alert(error.message || "Template import failed.");
  }
}

function getShareTokenFromPath() {
  const match = window.location.pathname.match(/^\/share\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function bootstrapShareView(token) {
  shareViewActive = true;
  if (landingView) landingView.classList.add("is-hidden");
  if (appShell) appShell.classList.add("is-hidden");

  let shareRoot = document.getElementById("shareView");
  if (!shareRoot) {
    document.body.insertAdjacentHTML("beforeend", `
      <div id="shareView" class="share-view">
        <header class="share-topbar">
          <div class="landing-brand">
            <span class="landing-logo-mark" aria-hidden="true"></span>
            <h1>Makeflow</h1>
          </div>
          <a class="primary-button" href="/">Open Makeflow</a>
        </header>
        <main id="shareViewMain" class="share-main">
          <p class="template-empty">Loading shared design…</p>
        </main>
      </div>
    `);
    shareRoot = document.getElementById("shareView");
  }

  const main = document.getElementById("shareViewMain");
  try {
    const response = await fetch(`/api/shares/${encodeURIComponent(token)}`);
    const share = await response.json().catch(() => ({}));
    if (!response.ok) {
      main.innerHTML = `<section class="share-error"><h2>Share not found</h2><p>${escapeHtml(share.error || "This design link is invalid or was removed.")}</p></section>`;
      return;
    }

    const outputs = share.designOutputs || {};
    const keys = Object.keys(outputs);
    main.innerHTML = `
      <section class="share-hero">
        <p class="landing-eyebrow">Shared design package</p>
        <h2>${escapeHtml(share.productName || "Design package")}</h2>
        <p class="landing-lead">
          ${escapeHtml(share.productType || "Hardware design")}
          ${share.createdBy?.name ? ` · Shared by ${escapeHtml(share.createdBy.name)}` : ""}
        </p>
      </section>
      <section class="share-output-grid">
        ${keys.map((key) => `
          <article class="share-output-card" data-share-key="${escapeHtml(key)}">
            <button class="design-output-button" type="button" data-share-open="${escapeHtml(key)}">
              <strong>${escapeHtml(outputs[key].title || key)}</strong>
              <span>View</span>
            </button>
          </article>
        `).join("")}
      </section>
      <div id="shareDocPanel" class="share-doc-panel is-hidden">
        <div class="share-doc-header">
          <h3 id="shareDocTitle"></h3>
          <button id="shareDocClose" class="secondary-button" type="button">Close</button>
        </div>
        <div id="shareDocContent" class="design-prd-content prd-markdown"></div>
      </div>
    `;

    const openShareDoc = (key) => {
      const output = outputs[key];
      if (!output) return;
      const panel = document.getElementById("shareDocPanel");
      const title = document.getElementById("shareDocTitle");
      const content = document.getElementById("shareDocContent");
      title.textContent = output.title || key;
      content.innerHTML = renderMarkdown(output.content || "");
      panel.classList.remove("is-hidden");
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    main.querySelectorAll("[data-share-open]").forEach((button) => {
      button.addEventListener("click", () => openShareDoc(button.dataset.shareOpen));
    });
    document.getElementById("shareDocClose")?.addEventListener("click", () => {
      document.getElementById("shareDocPanel")?.classList.add("is-hidden");
    });

    if (keys[0]) openShareDoc(keys[0]);
  } catch {
    main.innerHTML = `<section class="share-error"><h2>Unable to load share</h2><p>Check your connection and try again.</p></section>`;
  }
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
  render();
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
  if (topbarProductLabel) topbarProductLabel.textContent = productDisplayName(product);
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
  return getActivePrdReviewSource(product).output;
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
    const prd = getActivePrdReviewSource(product).output;
    if (!prd) return;
    if (!Array.isArray(prd.comments)) prd.comments = [];
    const commentId = "c_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    prd.comments.push({
      id: commentId,
      quote,
      comment: commentText,
      createdAt: new Date().toISOString(),
      type: ctype,
      resolved: false
    });
    persist();
    renderPreservingPrdReviewScroll();
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
    const prd = getActivePrdReviewSource(product).output;
    if (prd && Array.isArray(prd.comments)) {
      const target = prd.comments.find((x) => x.id === comment.id);
      if (target) target.comment = val;
    }
    close();
    persist();
    renderPreservingPrdReviewScroll();
  };

  bd.querySelector("#prdCommentDelete").onclick = () => {
    const product = activeProduct();
    const prd = getActivePrdReviewSource(product).output;
    if (prd && Array.isArray(prd.comments)) {
      prd.comments = prd.comments.filter((x) => x.id !== comment.id);
    }
    close();
    persist();
    renderPreservingPrdReviewScroll();
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

function proceedToFeasibility() {
  const product = activeProduct();
  if (!product) return;
  const prd = getActivePrdReviewSource(product).output;
  if (!prd || !prd.content) return;

  // Unblock Feasibility Analysis (complete PRD review stage)
  product.completed[1] = true;

  // Pass the latest PRD to Feasibility Analysis (store in prdOutputs[1])
  if (!product.prdOutputs) product.prdOutputs = [];
  product.prdOutputs[1] = {
    ...prd,
    content: prd.content,
    outputFile: prd.outputFile || '',
    generatedAt: new Date().toISOString(),
    source: 'PRD Review (updated with comments)'
  };

  logActivity('Proceeded to Feasibility Analysis with latest PRD');

  // Advance to next stage
  selectedIndex = 2;

  persist();
  render();
}

function openLocalPrdFilePicker() {
  if (!openLocalPrdInput) {
    openLocalPrdInput = document.createElement("input");
    openLocalPrdInput.type = "file";
    openLocalPrdInput.accept = ".md,.markdown,.txt,text/markdown,text/plain";
    openLocalPrdInput.className = "is-hidden";
    openLocalPrdInput.addEventListener("change", importLocalPrdFile);
    document.body.appendChild(openLocalPrdInput);
  }

  openLocalPrdInput.value = "";
  openLocalPrdInput.click();
}

async function importLocalPrdFile(event) {
  const product = activeProduct();
  const file = event.target.files && event.target.files[0];
  if (!product || !file) return;

  const content = await file.text();
  if (!content.trim()) {
    completionHint.textContent = "The selected PRD file is empty.";
    return;
  }

  if (!product.prdOutputs) product.prdOutputs = [];
  const previousReviewPrd = product.prdOutputs[1];
  product.prdOutputs[1] = {
    ...prdReviewCore().createLocalPrdOutput({
      name: file.name,
      content
    }),
    comments: Array.isArray(previousReviewPrd?.comments) ? previousReviewPrd.comments : []
  };
  product.completed[1] = false;

  const extractedName = prdReviewCore().extractProductNameFromPrd
    ? prdReviewCore().extractProductNameFromPrd(content)
    : "";
  if (extractedName && product.productName !== extractedName) {
    product.productName = extractedName;
    logActivity(`Product name set to ${extractedName} from uploaded PRD`);
  }

  logActivity(`Local PRD opened from ${file.name}`);
  persist();
  render();
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

function initializeSpecController() {
  window.stages = stages;
  window.MakeflowAppState = {
    getSelectedIndex: () => selectedIndex,
    setSelectedIndex: (value) => { selectedIndex = value; },
    getIsGeneratingPrd: () => isGeneratingPrd,
    setIsGeneratingPrd: (value) => { isGeneratingPrd = value; },
    setPrdGenerationError: (value) => { prdGenerationError = value; },
    activeProduct,
    persist,
    flushWorkspaceSync,
    render,
    logActivity,
    renderMarkdown,
    escapeHtml
  };

  specController = window.createSpecController({
    stages,
    specWorkbench,
    aggregateSpecInput,
    aggregateSpecState,
    specReviewResults,
    inspectSpecButton,
    activeProduct,
    persist,
    render,
    logActivity,
    normalizePrice,
    isFeatureItem,
    productDisplayName,
    escapeHtml,
    getSelectedIndex: () => selectedIndex,
    setSelectedIndex: (value) => { selectedIndex = value; },
    getIsInspectingSpec: () => isInspectingSpec,
    getIsGeneratingPrd: () => isGeneratingPrd,
    setIsInspectingSpec: (value) => { isInspectingSpec = value; },
    setIsGeneratingPrd: (value) => { isGeneratingPrd = value; },
    setPrdGenerationError: (value) => { prdGenerationError = value; },
    setSpecInspectionError: (value) => { specInspectionError = value; },
    setAggregateSpecParseError: (value) => { aggregateSpecParseError = value; }
  });
}

function userInitials(user) {
  const source = String(user?.name || user?.email || "?").trim();
  if (!source) return "?";

  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function setUserMenuOpen(open) {
  if (!userMenuButton || !userMenuDropdown) return;
  userMenuDropdown.classList.toggle("is-hidden", !open);
  userMenuButton.setAttribute("aria-expanded", open ? "true" : "false");
}

function updateUserMenu() {
  if (!currentUser) return;

  if (userMenuName) userMenuName.textContent = currentUser.name || "Signed in";
  if (userMenuEmail) userMenuEmail.textContent = currentUser.email || "";
  if (userAvatarInitials) userAvatarInitials.textContent = userInitials(currentUser);

  if (userAvatarImage) {
    if (currentUser.picture) {
      userAvatarImage.src = currentUser.picture;
      userAvatarImage.alt = currentUser.name || currentUser.email || "Account";
      userAvatarImage.classList.remove("is-hidden");
      if (userAvatarInitials) userAvatarInitials.classList.add("is-hidden");
    } else {
      userAvatarImage.removeAttribute("src");
      userAvatarImage.alt = "";
      userAvatarImage.classList.add("is-hidden");
      if (userAvatarInitials) userAvatarInitials.classList.remove("is-hidden");
    }
  }
}

function showLanding() {
  currentUser = null;
  cloudSyncEnabled = false;
  if (landingView) landingView.classList.remove("is-hidden");
  if (appShell) appShell.classList.add("is-hidden");
  setUserMenuOpen(false);
  loadLandingTemplates();
}

function showApp() {
  if (landingView) landingView.classList.add("is-hidden");
  if (appShell) appShell.classList.remove("is-hidden");
  updateUserMenu();
}

function ensureAuthUiBound() {
  if (userMenuButton?.dataset.bound === "true") return;
  if (userMenuButton) userMenuButton.dataset.bound = "true";

  userMenuButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = userMenuDropdown && !userMenuDropdown.classList.contains("is-hidden");
    setUserMenuOpen(!isOpen);
  });

  logoutButton?.addEventListener("click", async () => {
    setUserMenuOpen(false);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin"
      });
    } catch {
      // Still clear the client-side view if the network call fails.
    }
    showLanding();
  });

  document.addEventListener("click", (event) => {
    if (!userMenuDropdown || userMenuDropdown.classList.contains("is-hidden")) return;
    const menu = document.querySelector("#userMenu");
    if (menu && !menu.contains(event.target)) {
      setUserMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setUserMenuOpen(false);
  });
}

async function bootstrapApp() {
  ensureAuthUiBound();
  ensureDashboardTemplateActions();

  const shareToken = getShareTokenFromPath();
  if (shareToken) {
    await bootstrapShareView(shareToken);
    return;
  }

  try {
    const response = await fetch("/api/auth/me", {
      credentials: "same-origin"
    });

    if (!response.ok) {
      cloudSyncEnabled = false;
      showLanding();
      loadLandingTemplates();
      return;
    }

    const payload = await response.json();
    if (!payload?.user?.id) {
      cloudSyncEnabled = false;
      showLanding();
      loadLandingTemplates();
      return;
    }

    currentUser = payload.user;
    showApp();

    try {
      await loadCloudWorkspace();
      cloudSyncEnabled = true;
    } catch (error) {
      if (String(error?.message) === "unauthorized") {
        cloudSyncEnabled = false;
        showLanding();
        loadLandingTemplates();
        return;
      }
      console.warn("Cloud workspace load failed; using local cache", error);
      cloudSyncEnabled = true;
    }

    if (!appBootstrapped) {
      initializeSpecController();
      appBootstrapped = true;
    }

    await maybeImportTemplateFromQuery();
    render();
  } catch {
    cloudSyncEnabled = false;
    showLanding();
    loadLandingTemplates();
  }
}

function ensureDashboardTemplateActions() {
  if (document.getElementById("dashboardUseTemplateButton")) return;

  const emptyDash = document.querySelector("#emptyDashboard");
  if (emptyDash && !document.getElementById("emptyUseTemplateButton")) {
    emptyDash.insertAdjacentHTML("beforeend", `
      <p class="empty-dashboard-hint">or start from a starter template</p>
      <button id="emptyUseTemplateButton" class="secondary-button" type="button">Use a template</button>
    `);
    document.getElementById("emptyUseTemplateButton")?.addEventListener("click", () => openTemplatePicker());
  }

  const header = document.querySelector(".dashboard-header > div:last-child, .dashboard-header");
  const addButton = document.querySelector("#dashboardAddProductButton");
  if (addButton && !document.getElementById("dashboardUseTemplateButton")) {
    const wrap = document.createElement("div");
    wrap.className = "dashboard-header-actions";
    addButton.parentNode?.insertBefore(wrap, addButton);
    wrap.appendChild(addButton);
    const templateButton = document.createElement("button");
    templateButton.id = "dashboardUseTemplateButton";
    templateButton.className = "secondary-button";
    templateButton.type = "button";
    templateButton.textContent = "Use a template";
    wrap.insertBefore(templateButton, addButton);
    templateButton.addEventListener("click", () => openTemplatePicker());
  } else if (header && !document.getElementById("dashboardUseTemplateButton")) {
    // no-op fallback
  }
}

window.bootstrapApp = bootstrapApp;
window.buildPrdPayload = buildPrdPayload;
window.getCurrentUser = () => currentUser;

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
  const name = typeof product?.productName === "string" ? product.productName.trim() : "";
  // Dashboard and navigation always use the Spec-stage product name field.
  // Never fall back to "Product 1", "Product 2", etc.
  return name ? summarizeContext(name) : "Untitled product";
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
    source: typeof output.source === "string" ? output.source : "",
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

function normalizeFeasibilityAnalysis(analysis) {
  if (!analysis || typeof analysis !== "object") return null;

  return {
    summary: typeof analysis.summary === "string" ? analysis.summary : "",
    scores: Array.isArray(analysis.scores)
      ? analysis.scores.map((item) => ({
          area: typeof item.area === "string" ? item.area : "",
          score: ["high", "medium", "low"].includes(item.score) ? item.score : "low",
          rationale: typeof item.rationale === "string" ? item.rationale : ""
        }))
      : [],
    recommendations: Array.isArray(analysis.recommendations)
      ? analysis.recommendations.filter((item) => typeof item === "string")
      : [],
    analyzedAt: typeof analysis.analyzedAt === "string" ? analysis.analyzedAt : "",
    inputFile: typeof analysis.inputFile === "string" ? analysis.inputFile : "",
    outputFile: typeof analysis.outputFile === "string" ? analysis.outputFile : ""
  };
}

function normalizeDesignOutputs(outputs) {
  if (!outputs || typeof outputs !== "object") return {};

  return Object.fromEntries(Object.entries(outputs)
    .filter(([, output]) => output && typeof output === "object")
    .map(([key, output]) => [key, {
      key,
      title: typeof output.title === "string" ? output.title : key,
      content: typeof output.content === "string" ? output.content : "",
      rendering: output.rendering && typeof output.rendering === "object" ? output.rendering : null,
      generatedAt: typeof output.generatedAt === "string" ? output.generatedAt : "",
      inputFile: typeof output.inputFile === "string" ? output.inputFile : "",
      outputFile: typeof output.outputFile === "string" ? output.outputFile : ""
    }]));
}

function normalizeDesignCostEstimate(estimate) {
  if (!estimate || typeof estimate !== "object") return null;

  return {
    summary: typeof estimate.summary === "string" ? estimate.summary : "",
    estimatedAt: typeof estimate.estimatedAt === "string" ? estimate.estimatedAt : "",
    items: Array.isArray(estimate.items)
      ? estimate.items.map((item) => ({
          designType: typeof item.designType === "string" ? item.designType : "",
          title: typeof item.title === "string" ? item.title : "",
          low: Number.isFinite(Number(item.low)) ? Number(item.low) : 0,
          high: Number.isFinite(Number(item.high)) ? Number(item.high) : 0,
          currency: typeof item.currency === "string" ? item.currency : "USD",
          basis: typeof item.basis === "string" ? item.basis : ""
        }))
      : [],
    stages: Array.isArray(estimate.stages)
      ? estimate.stages.map((item) => ({
          stage: typeof item.stage === "string" ? item.stage : "",
          title: typeof item.title === "string" ? item.title : "",
          low: Number.isFinite(Number(item.low)) ? Number(item.low) : 0,
          high: Number.isFinite(Number(item.high)) ? Number(item.high) : 0,
          currency: typeof item.currency === "string" ? item.currency : "USD",
          basis: typeof item.basis === "string" ? item.basis : "",
          items: Array.isArray(item.items)
            ? item.items.map((subitem) => ({
                designType: typeof subitem.designType === "string" ? subitem.designType : "",
                title: typeof subitem.title === "string" ? subitem.title : "",
                low: Number.isFinite(Number(subitem.low)) ? Number(subitem.low) : 0,
                high: Number.isFinite(Number(subitem.high)) ? Number(subitem.high) : 0,
                currency: typeof subitem.currency === "string" ? subitem.currency : "USD",
                basis: typeof subitem.basis === "string" ? subitem.basis : ""
              }))
            : []
        }))
      : [],
    totalLow: Number.isFinite(Number(estimate.totalLow)) ? Number(estimate.totalLow) : 0,
    totalHigh: Number.isFinite(Number(estimate.totalHigh)) ? Number(estimate.totalHigh) : 0,
    currency: typeof estimate.currency === "string" ? estimate.currency : "USD"
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
      const prd = getActivePrdReviewSource(product).output;
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
  return specController.inspectSpec(stageIndex, payload);
}

function buildPrdPayload(stageIndex) {
  return specController.buildPrdPayload(stageIndex);
}

function getCompleteButtonMarkup(status) {
  if (isGeneratingPrd) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M18.36 5.64l-2.12 2.12M7.76 16.24l-2.12 2.12"/></svg> Generating PRD';
  }

  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg> Generate PRD';
}

function getInspectSpecButtonMarkup() {
  return specController.getInspectSpecButtonMarkup();
}

function isCurrentSpecApproved(product, stageIndex) {
  return specController.isCurrentSpecApproved(product, stageIndex);
}

function specSignature(payload) {
  return specController.specSignature(payload);
}

function isApprovedReview(review) {
  return specController.isApprovedReview(review);
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
