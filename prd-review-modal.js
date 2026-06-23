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
  let reviewingGeneratedPrd = false;

  function createModalIfNeeded() {
    if (prdReviewModal) return;
    prdReviewModal = document.getElementById('prdReviewModal');
    if (!prdReviewModal) {
      throw new Error('PRD review modal is missing from index.html.');
    }

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
      if (event.target === prdReviewModal && !isGeneratingPrd()) closePrdReviewModal();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && prdReviewModal && !prdReviewModal.classList.contains('is-hidden') && !isGeneratingPrd()) {
        closePrdReviewModal();
      }
    });
  }

  function updatePrdReviewActionState() {
    const allowed = allowOpenAiToggle.checked;
    prdReviewConfirmButton.disabled = !allowed;
    openAiToggleStatus.textContent = allowed
      ? "On. OK will send this input to OpenAI."
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
    reviewingGeneratedPrd = !!prdMarkdown;

    prdReviewStage.textContent = "";
    const titleEl = document.getElementById("prdReviewTitle");

    if (reviewingGeneratedPrd) {
      // PRD review mode: display the generated PRD markdown passed from spec
      if (titleEl) titleEl.textContent = "Review PRD";
      if (prdReviewContent) {
        prdReviewContent.textContent = prdMarkdown;
      }

      // Hide toggle and description paragraph
      const p = prdReviewModal ? prdReviewModal.querySelector('.prd-review-body > p') : null;
      if (p) p.style.display = 'none';
      if (allowOpenAiToggle && allowOpenAiToggle.parentElement) {
        allowOpenAiToggle.parentElement.style.display = 'none';
      }

      // Setup for review/accept only
      if (prdReviewConfirmButton) {
        prdReviewConfirmButton.disabled = false;
        prdReviewConfirmButton.textContent = "Accept";
        prdReviewConfirmButton.onclick = () => { 
          if (window.generateConfirmedPrd) window.generateConfirmedPrd(); 
        };
      }
      if (prdReviewCancelButton) {
        prdReviewCancelButton.disabled = false;
        prdReviewCancelButton.textContent = "Cancel";
        prdReviewCancelButton.onclick = () => window.closePrdReviewModal();
      }
      if (prdReviewCloseButton) {
        prdReviewCloseButton.disabled = false;
        prdReviewCloseButton.onclick = () => window.closePrdReviewModal();
      }
    } else {
      // Original: collected spec for pre-generation in spec stage
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
        prdReviewConfirmButton.textContent = "OK";
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
    }

    prdReviewModal.classList.remove('is-hidden');
    if (allowOpenAiToggle && !reviewingGeneratedPrd) {
      allowOpenAiToggle.focus();
    } else {
      prdReviewConfirmButton.focus();
    }
  };

  window.closePrdReviewModal = function() {
    if (!prdReviewModal) return;
    if (isGeneratingPrd()) return;
    pendingPrdStageIndex = null;
    reviewingGeneratedPrd = false;
    if (allowOpenAiToggle) {
      allowOpenAiToggle.checked = false;
    }
    resetModalControls();
    prdReviewModal.classList.add('is-hidden');
    if (window.render) window.render();
  };

  window.generateConfirmedPrd = function() {
    const product = window.activeProduct ? window.activeProduct() : null;
    if (pendingPrdStageIndex === null || isGeneratingPrd()) return;
    if (!product) return;

    const stageIndex = pendingPrdStageIndex;

    if (reviewingGeneratedPrd) {
      // In PRD review stage: just accept the review of the passed PRD markdown
      // Mark the first checklist item as documented
      if (stageIndex === 1) {
        if (!product.checklistContexts) product.checklistContexts = [];
        if (!product.checklistContexts[1]) product.checklistContexts[1] = [];
        product.checklistContexts[1][0] = "Reviewed the generated PRD markdown.";
      }
      window.closePrdReviewModal();
      if (window.render) window.render();
      return;
    }

    if (!allowOpenAiToggle || !allowOpenAiToggle.checked) {
      updatePrdReviewActionState();
      return;
    }

    // Keep the popup open and show waiting state (for spec generation)
    setGeneratingPrd(true);
    setPrdGenerationError("");
    if (window.logActivity) window.logActivity(`${window.stages ? window.stages[stageIndex].name : 'Stage'} PRD generation started`);
    if (window.persist) window.persist();

    // Update modal UI to waiting / generating state (do not close yet)
    updateModalToWaitingState();
    if (window.render) window.render();

    (async () => {
      try {
        const result = await window.generatePrd(stageIndex);
        if (!product.prdOutputs) product.prdOutputs = [];
        const prev = product.prdOutputs && product.prdOutputs[stageIndex];
        product.prdOutputs[stageIndex] = {
          inputFile: result.inputFile,
          outputFile: result.outputFile,
          generatedAt: new Date().toISOString(),
          content: result.prd || "",
          source: stageIndex === 0 ? "generated_spec" : "generated_stage",
          comments: (prev && Array.isArray(prev.comments)) ? prev.comments : []
        };
        product.completed[stageIndex] = true;
        if (window.logActivity) window.logActivity(`${window.stages ? window.stages[stageIndex].name : 'Stage'} PRD generated at ${result.outputFile}`);

        if (window.stages && stageIndex < window.stages.length - 1) {
          setSelectedIndex(stageIndex + 1);
          if (window.logActivity) window.logActivity(`${window.stages[getSelectedIndex()].name} unlocked`);
        }

        closePrdReviewModalAfterSuccess();
      } catch (error) {
        setPrdGenerationError(error.message);
        if (window.logActivity) window.logActivity(`PRD generation failed: ${error.message}`);

        updateModalToErrorState(error.message);
      } finally {
        setGeneratingPrd(false);
        if (window.persist) window.persist();
        if (window.render) window.render();
      }
    })();
  };

  function updateModalToWaitingState() {
    const titleEl = document.getElementById("prdReviewTitle");
    if (titleEl) titleEl.textContent = "Writing PRD";

    if (prdReviewContent) {
      prdReviewContent.innerHTML = '<div style="text-align: center; padding: 20px;">Writing PRD from the collected spec.<br>This may take a few moments...</div>';
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

  function closePrdReviewModalAfterSuccess() {
    pendingPrdStageIndex = null;
    reviewingGeneratedPrd = false;
    if (allowOpenAiToggle) {
      allowOpenAiToggle.checked = false;
    }
    resetModalControls();
    prdReviewModal.classList.add('is-hidden');
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

  function resetModalControls() {
    prdReviewConfirmButton.textContent = "OK";
    if (prdReviewCancelButton) {
      prdReviewCancelButton.disabled = false;
      prdReviewCancelButton.textContent = "Cancel";
      prdReviewCancelButton.onclick = null;
    }
    if (prdReviewConfirmButton) {
      prdReviewConfirmButton.onclick = null;
    }
    if (prdReviewCloseButton) {
      prdReviewCloseButton.disabled = false;
      prdReviewCloseButton.onclick = null;
    }
    if (allowOpenAiToggle && allowOpenAiToggle.parentElement) {
      allowOpenAiToggle.parentElement.style.display = "";
    }
    const p = prdReviewModal ? prdReviewModal.querySelector('.prd-review-body > p') : null;
    if (p) p.style.display = '';
    updatePrdReviewActionState();
  }

  function isGeneratingPrd() {
    return window.MakeflowAppState?.getIsGeneratingPrd ? window.MakeflowAppState.getIsGeneratingPrd() : false;
  }

  function setGeneratingPrd(value) {
    if (window.MakeflowAppState?.setIsGeneratingPrd) {
      window.MakeflowAppState.setIsGeneratingPrd(value);
    }
  }

  function setPrdGenerationError(value) {
    if (window.MakeflowAppState?.setPrdGenerationError) {
      window.MakeflowAppState.setPrdGenerationError(value);
    }
  }

  function getSelectedIndex() {
    return window.MakeflowAppState?.getSelectedIndex ? window.MakeflowAppState.getSelectedIndex() : 0;
  }

  function setSelectedIndex(value) {
    if (window.MakeflowAppState?.setSelectedIndex) {
      window.MakeflowAppState.setSelectedIndex(value);
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
