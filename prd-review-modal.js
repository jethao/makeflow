(function() {
  let prdReviewModal = null;
  let prdReviewStage = null;
  let prdReviewContent = null;
  let prdReviewCloseButton = null;
  let prdReviewCancelButton = null;
  let prdReviewConfirmButton = null;
  let allowOpenAiToggle = null;
  let openAiToggleStatus = null;

  let pendingPrdStageIndex = null;

  function createModalIfNeeded() {
    if (prdReviewModal) return;

    const modalHTML = `
      <div id="prdReviewModal" class="modal-backdrop is-hidden" role="dialog" aria-modal="true" aria-labelledby="prdReviewTitle">
        <section class="modal-panel prd-review-panel">
          <div class="modal-header">
            <div>
              <span id="prdReviewStage"></span>
              <h3 id="prdReviewTitle">Review Collected spec</h3>
            </div>
            <button id="prdReviewCloseButton" class="icon-button" type="button" aria-label="Close">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="prd-review-body">
            <p>Review the collected spec before generating the PRD.</p>
            <pre id="prdReviewContent" class="prd-review-content"></pre>
            <label class="api-toggle-row" for="allowOpenAiToggle">
              <span>
                <strong>Allow OpenAI API call</strong>
                <span id="openAiToggleStatus">Off by default. Turn on to generate the PRD.</span>
              </span>
              <input id="allowOpenAiToggle" type="checkbox">
              <span class="toggle-track" aria-hidden="true"><span></span></span>
            </label>
          </div>
          <div class="modal-footer">
            <button id="prdReviewCancelButton" class="secondary-button" type="button">Cancel</button>
            <button id="prdReviewConfirmButton" class="primary-button" type="button" disabled>Confirm and generate</button>
          </div>
        </section>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    prdReviewModal = document.getElementById('prdReviewModal');
    prdReviewStage = document.getElementById('prdReviewStage');
    prdReviewContent = document.getElementById('prdReviewContent');
    prdReviewCloseButton = document.getElementById('prdReviewCloseButton');
    prdReviewCancelButton = document.getElementById('prdReviewCancelButton');
    prdReviewConfirmButton = document.getElementById('prdReviewConfirmButton');
    allowOpenAiToggle = document.getElementById('allowOpenAiToggle');
    openAiToggleStatus = document.getElementById('openAiToggleStatus');

    setupListeners();
  }

  function setupListeners() {
    prdReviewCloseButton.addEventListener('click', closePrdReviewModal);
    prdReviewCancelButton.addEventListener('click', closePrdReviewModal);
    prdReviewConfirmButton.onclick = () => {
      generateConfirmedPrd();
    };
    allowOpenAiToggle.addEventListener('change', updatePrdReviewActionState);
    prdReviewModal.addEventListener('click', (event) => {
      if (event.target === prdReviewModal) closePrdReviewModal();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && prdReviewModal && !prdReviewModal.classList.contains('is-hidden')) {
        closePrdReviewModal();
      }
    });
  }

  function updatePrdReviewActionState() {
    const allowed = allowOpenAiToggle.checked;
    prdReviewConfirmButton.disabled = !allowed;
    openAiToggleStatus.textContent = allowed
      ? "On. Confirming will send this input to OpenAI."
      : "Off by default. Turn on to generate the PRD.";
  }

  function formatPayloadAsMarkdown(payload) {
    if (!payload || typeof payload !== "object") return "No spec data.";
    const lines = [];
    const stage = payload.stage || {};
    lines.push(`# ${stage.name || "Stage"} — Collected Spec`);
    lines.push("");
    if (stage.summary) {
      lines.push(stage.summary);
      lines.push("");
    }
    const prod = payload.product || {};
    lines.push("## Product");
    lines.push("");
    lines.push(`- **Name**: ${prod.name || "(not set)"}`);
    lines.push(`- **Type**: ${prod.type || "(not set)"}`);
    lines.push(`- **Form factor**: ${prod.formFactor || "(not set)"}`);
    lines.push(`- **Target BOM**: $${prod.bomTarget || 0}`);
    lines.push("");

    if (stage.targetDate || stage.deliverable || stage.decisionGate) {
      lines.push("## Stage Details");
      lines.push("");
      if (stage.targetDate) lines.push(`- **Target date**: ${stage.targetDate}`);
      if (stage.deliverable) lines.push(`- **Deliverable**: ${stage.deliverable}`);
      if (stage.decisionGate) lines.push(`- **Decision gate**: ${stage.decisionGate}`);
      if (stage.evidenceRequired) lines.push(`- **Evidence required**: ${stage.evidenceRequired}`);
      lines.push("");
    }

    if (Array.isArray(payload.checklist) && payload.checklist.length > 0) {
      lines.push("## Checklist & Inputs");
      lines.push("");
      payload.checklist.forEach((entry) => {
        if (!entry || !entry.item) return;
        lines.push(`### ${entry.item}`);
        lines.push("");
        if (entry.description) {
          lines.push(entry.description.trim());
          lines.push("");
        }
        const cases = entry.useCases || entry.features;
        if (Array.isArray(cases) && cases.length > 0) {
          lines.push("**Primary use cases / features**:");
          lines.push("");
          cases.forEach((c) => {
            const first = (c || "").split(/\r?\n/).map((s) => s.trim()).find((s) => s && !s.endsWith(":"));
            lines.push(`- ${first || (c || "").slice(0, 120)}`);
          });
          lines.push("");
        }
      });
    }

    return lines.join("\n");
  }

  window.openPrdReviewModal = function(stageIndex, prdMarkdown) {
    createModalIfNeeded();
    pendingPrdStageIndex = stageIndex;

    prdReviewStage.textContent = "";
    const titleEl = document.getElementById("prdReviewTitle");
    if (titleEl) titleEl.textContent = "Review Collected spec";

    const payload = window.buildPrdPayload ? window.buildPrdPayload(stageIndex) : {};
    const collectedSpec = formatPayloadAsMarkdown(payload);

    if (prdReviewContent) {
      prdReviewContent.textContent = collectedSpec;
    }

    // Reset buttons and handlers
    if (prdReviewCloseButton) {
      prdReviewCloseButton.disabled = false;
      prdReviewCloseButton.onclick = () => window.closePrdReviewModal();
    }
    if (prdReviewCancelButton) {
      prdReviewCancelButton.disabled = false;
      prdReviewCancelButton.textContent = "Cancel";
      prdReviewCancelButton.onclick = () => window.closePrdReviewModal();
    }
    if (prdReviewConfirmButton) {
      prdReviewConfirmButton.disabled = true;
      prdReviewConfirmButton.textContent = "Confirm and generate";
      prdReviewConfirmButton.onclick = () => { 
        if (window.generateConfirmedPrd) window.generateConfirmedPrd(); 
      };
    }

    // Reset toggle for pre-generation review
    if (allowOpenAiToggle) {
      allowOpenAiToggle.checked = false;
    }
    if (allowOpenAiToggle && allowOpenAiToggle.parentElement) {
      allowOpenAiToggle.parentElement.style.display = "";
    }
    // show p again
    const p = prdReviewModal ? prdReviewModal.querySelector('.prd-review-body > p') : null;
    if (p) p.style.display = '';
    updatePrdReviewActionState();

    prdReviewModal.classList.remove('is-hidden');
    if (allowOpenAiToggle) {
      allowOpenAiToggle.focus();
    } else {
      prdReviewConfirmButton.focus();
    }
  };

  window.closePrdReviewModal = function() {
    if (!prdReviewModal) return;
    pendingPrdStageIndex = null;
    if (allowOpenAiToggle) {
      allowOpenAiToggle.checked = false;
    }
    prdReviewConfirmButton.textContent = "Confirm and generate";
    if (prdReviewCancelButton) {
      prdReviewCancelButton.textContent = "Cancel";
      prdReviewCancelButton.onclick = null;  // reset
    }
    if (prdReviewConfirmButton) {
      prdReviewConfirmButton.onclick = null;
    }
    if (prdReviewCloseButton) {
      prdReviewCloseButton.onclick = null;
    }
    if (allowOpenAiToggle && allowOpenAiToggle.parentElement) {
      allowOpenAiToggle.parentElement.style.display = "";
    }
    // reset any hidden p
    const p = prdReviewModal ? prdReviewModal.querySelector('.prd-review-body > p') : null;
    if (p) p.style.display = '';
    updatePrdReviewActionState();
    prdReviewModal.classList.add('is-hidden');
    if (window.render) window.render();
  };

  window.generateConfirmedPrd = function() {
    const product = window.activeProduct ? window.activeProduct() : null;
    if (pendingPrdStageIndex === null || window.isGeneratingPrd) return;
    if (!product) return;
    if (!allowOpenAiToggle || !allowOpenAiToggle.checked) {
      updatePrdReviewActionState();
      return;
    }

    const stageIndex = pendingPrdStageIndex;

    // Keep the popup open and show waiting state
    window.isGeneratingPrd = true;
    window.prdGenerationError = "";
    if (window.logActivity) window.logActivity(`${window.stages ? window.stages[stageIndex].name : 'Stage'} PRD generation started`);
    if (window.persist) window.persist();
    if (window.render) window.render();

    // Update modal UI to waiting / generating state (do not close yet)
    updateModalToWaitingState();

    (async () => {
      try {
        const result = await window.generatePrd(stageIndex);
        if (!product.prdOutputs) product.prdOutputs = [];
        product.prdOutputs[stageIndex] = {
          inputFile: result.inputFile,
          outputFile: result.outputFile,
          generatedAt: new Date().toISOString()
        };
        product.completed[stageIndex] = true;
        if (window.logActivity) window.logActivity(`${window.stages ? window.stages[stageIndex].name : 'Stage'} PRD generated at ${result.outputFile}`);

        if (window.stages && stageIndex < window.stages.length - 1) {
          if (window.selectedIndex !== undefined) {
            window.selectedIndex = stageIndex + 1;
            if (window.logActivity) window.logActivity(`${window.stages[window.selectedIndex].name} unlocked`);
          }
        }

        // Update modal to success state (still open)
        updateModalToSuccessState(result);
      } catch (error) {
        if (window.prdGenerationError !== undefined) window.prdGenerationError = error.message;
        if (window.logActivity) window.logActivity(`PRD generation failed: ${error.message}`);

        // Update modal to error state
        updateModalToErrorState(error.message);
      } finally {
        if (window.isGeneratingPrd !== undefined) window.isGeneratingPrd = false;
        if (window.persist) window.persist();
        if (window.render) window.render();
      }
    })();
  };

  function updateModalToWaitingState() {
    const titleEl = document.getElementById("prdReviewTitle");
    if (titleEl) titleEl.textContent = "Generating PRD...";

    if (prdReviewContent) {
      prdReviewContent.innerHTML = '<div style="text-align: center; padding: 20px;">Please wait while OpenAI generates the PRD.<br>This may take a few moments...</div>';
    }

    // Hide the description and toggle
    const p = prdReviewModal ? prdReviewModal.querySelector('.prd-review-body > p') : null;
    if (p) p.style.display = 'none';
    if (allowOpenAiToggle && allowOpenAiToggle.parentElement) {
      allowOpenAiToggle.parentElement.style.display = 'none';
    }

    // Disable close/cancel/confirm during generation
    if (prdReviewCloseButton) prdReviewCloseButton.disabled = true;
    if (prdReviewCancelButton) prdReviewCancelButton.disabled = true;
    if (prdReviewConfirmButton) {
      prdReviewConfirmButton.disabled = true;
      prdReviewConfirmButton.textContent = 'Generating...';
    }
  }

  function updateModalToSuccessState(result) {
    const titleEl = document.getElementById("prdReviewTitle");
    if (titleEl) titleEl.textContent = "PRD Generated";

    if (prdReviewContent) {
      prdReviewContent.innerHTML = `<div>PRD has been successfully generated and saved.<br><br>File: <strong>${result.outputFile || 'N/A'}</strong></div>`;
    }

    // Re-enable close and change buttons to close the modal
    if (prdReviewCloseButton) prdReviewCloseButton.disabled = false;
    if (prdReviewCancelButton) {
      prdReviewCancelButton.disabled = false;
      prdReviewCancelButton.textContent = 'Close';
      prdReviewCancelButton.onclick = () => window.closePrdReviewModal();
    }
    if (prdReviewConfirmButton) {
      prdReviewConfirmButton.disabled = false;
      prdReviewConfirmButton.textContent = 'Done';
      prdReviewConfirmButton.onclick = () => window.closePrdReviewModal();
    }
  }

  function updateModalToErrorState(message) {
    const titleEl = document.getElementById("prdReviewTitle");
    if (titleEl) titleEl.textContent = "Generation Failed";

    if (prdReviewContent) {
      prdReviewContent.innerHTML = `<div style="color: red;">Error: ${escapeHtml(message || 'Unknown error')}</div>`;
    }

    if (prdReviewCloseButton) prdReviewCloseButton.disabled = false;
    if (prdReviewCancelButton) {
      prdReviewCancelButton.disabled = false;
      prdReviewCancelButton.textContent = 'Close';
      prdReviewCancelButton.onclick = () => window.closePrdReviewModal();
    }
    if (prdReviewConfirmButton) {
      prdReviewConfirmButton.disabled = false;
      prdReviewConfirmButton.textContent = 'Close';
      prdReviewConfirmButton.onclick = () => window.closePrdReviewModal();
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Expose for app.js to use if needed
  window.PrdReviewModal = {
    open: window.openPrdReviewModal,
    close: window.closePrdReviewModal,
    generateConfirmed: window.generateConfirmedPrd
  };

  // Auto init on script load
  // createModalIfNeeded(); // lazy on first open
})();
