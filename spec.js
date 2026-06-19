(function() {
  function createSpecController(deps) {
    function renderSpecWorkbench(product, stageIndex, isOpen) {
      deps.specWorkbench.classList.toggle("is-hidden", !isOpen);

      if (!isOpen) {
        deps.setAggregateSpecParseError("");
        return;
      }

      if (document.activeElement !== deps.aggregateSpecInput) {
        deps.aggregateSpecInput.value = JSON.stringify(buildPrdPayload(stageIndex), null, 2);
        deps.setAggregateSpecParseError("");
        deps.aggregateSpecState.textContent = "Synced";
        deps.aggregateSpecState.className = "";
      }

      deps.specReviewResults.innerHTML = renderSpecReviewResults(product, stageIndex);
    }

    function renderSpecReviewResults(product, stageIndex) {
      if (deps.getIsInspectingSpec()) {
        return '<p class="empty-result">Inspection running...</p>';
      }

      const review = product.specReviews?.[stageIndex];
      if (!review?.review) {
        return '<p class="empty-result">No inspection results yet.</p>';
      }

      const status = review.status === "approved" ? "Approved" : review.status === "error" ? "Error" : "Needs changes";
      return `
        <div class="result-status ${deps.escapeHtml(review.status)}">${status}</div>
        <pre>${deps.escapeHtml(review.review)}</pre>
      `;
    }

    function syncAggregateSpecToChecklist() {
      const product = deps.activeProduct();
      if (!product) return false;

      try {
        const payload = JSON.parse(deps.aggregateSpecInput.value);
        applySpecPayloadToProduct(payload, product, deps.getSelectedIndex());
        deps.setAggregateSpecParseError("");
        deps.aggregateSpecState.textContent = "Synced";
        deps.aggregateSpecState.className = "";
        deps.persist();
        return true;
      } catch {
        deps.setAggregateSpecParseError("Invalid JSON");
        deps.aggregateSpecState.textContent = "Invalid JSON";
        deps.aggregateSpecState.className = "error";
        deps.inspectSpecButton.disabled = true;
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
        product.bomTarget = deps.normalizePrice(payload.product.bomTarget);
      }

      if (!Array.isArray(payload.checklist)) return;

      const stage = deps.stages[stageIndex];
      payload.checklist.forEach((entry) => {
        if (!entry || typeof entry.item !== "string") return;
        const checkIndex = stage.checklist.indexOf(entry.item);
        if (checkIndex === -1) return;

        if (deps.isFeatureItem(entry.item)) {
          const useCases = Array.isArray(entry.useCases) ? entry.useCases : Array.isArray(entry.features) ? entry.features : [];
          product.checklistFeatures[stageIndex][checkIndex] = useCases.filter((item) => typeof item === "string");
          return;
        }

        product.checklistContexts[stageIndex][checkIndex] = typeof entry.description === "string" ? entry.description : "";
      });
    }

    async function inspectCurrentSpec() {
      const product = deps.activeProduct();
      if (!product || deps.getIsInspectingSpec()) return;
      if (!syncAggregateSpecToChecklist()) return;

      const stageIndex = deps.getSelectedIndex();
      deps.setIsInspectingSpec(true);
      deps.setSpecInspectionError("");
      deps.setPrdGenerationError("");
      deps.logActivity(`${deps.stages[stageIndex].name} spec inspection started`);
      deps.persist();
      deps.render();

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
        deps.logActivity(`${deps.stages[stageIndex].name} spec inspection completed`);
      } catch (error) {
        deps.setSpecInspectionError("failed");
        product.specReviews[stageIndex] = {
          status: "error",
          review: error.message,
          reviewedAt: new Date().toISOString(),
          specSignature: specSignature(buildPrdPayload(stageIndex))
        };
        deps.logActivity(`${deps.stages[stageIndex].name} spec inspection failed`);
      } finally {
        deps.setIsInspectingSpec(false);
        deps.persist();
        deps.render();
      }
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
      const product = deps.activeProduct();
      if (!product) return {};

      const stage = deps.stages[stageIndex];

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
          name: product.productName?.trim() || deps.productDisplayName(product),
          type: product.productType,
          formFactor: product.formFactor || "",
          bomTarget: product.bomTarget
        },
        checklist: stage.checklist.map((item, checkIndex) => {
          if (deps.isFeatureItem(item)) {
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

        priorStages: deps.stages.slice(0, stageIndex).map((priorStage, index) => ({
          name: priorStage.name,
          completed: product.completed[index],
          prdOutput: product.prdOutputs[index]
        }))
      };
    }

    function getInspectSpecButtonMarkup() {
      if (deps.getIsInspectingSpec()) {
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

    return {
      renderSpecWorkbench,
      syncAggregateSpecToChecklist,
      inspectCurrentSpec,
      inspectSpec,
      buildPrdPayload,
      getInspectSpecButtonMarkup,
      isCurrentSpecApproved,
      specSignature,
      isApprovedReview
    };
  }

  window.createSpecController = createSpecController;
})();
