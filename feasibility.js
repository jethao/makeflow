(function() {
  const SCORE_AREAS = ["Mechanical", "Electrical", "Software", "Manufacture", "Compliance", "Supply Chain"];
  let modal = null;
  let content = null;
  let analyzeButton = null;
  let closeButton = null;
  let cancelButton = null;
  let revisionModal = null;
  let revisionModalContent = null;
  let isAnalyzing = false;
  let isRevising = false;

  function renderStage(product, elements) {
    const prd = getHandoffPrd(product);
    const analysis = getSavedAnalysis(product);

    elements.productRows.forEach((row) => { if (row) row.style.display = "none"; });
    if (elements.checklistNextButton) elements.checklistNextButton.style.display = "none";
    if (elements.heading) elements.heading.style.display = "none";
    if (elements.actionRow) elements.actionRow.style.display = "none";
    elements.specWorkbench.classList.add("is-hidden");

    elements.checklist.innerHTML = `
      <li class="check-item prd-drafted">
        <div class="feasibility-stage">
          <div class="section-heading">
            <h3>Feasibility handoff</h3>
            <span>${prd ? "PRD received" : "No PRD"}</span>
          </div>
          <p>${prd ? "Latest PRD is ready for system architecture feasibility analysis." : "Proceed from PRD review to hand off the latest PRD."}</p>
          <button id="openFeasibilityModalButton" class="primary-button" type="button" ${prd ? "" : "disabled"}>
            Analyze PRD Feasibility
          </button>
          ${analysis ? renderAnalysis(analysis) : ""}
        </div>
      </li>
    `;
    elements.checklistCount.textContent = "";

    const button = document.getElementById("openFeasibilityModalButton");
    if (button) button.addEventListener("click", openModal);
    bindRevisionButton(elements.checklist);
  }

  function openModal() {
    const product = app().activeProduct();
    const prd = getHandoffPrd(product);
    if (!prd?.content) return;

    createModalIfNeeded();
    renderModalReady(prd, getSavedAnalysis(product));
    modal.classList.remove("is-hidden");
    analyzeButton.focus();
  }

  function createModalIfNeeded() {
    if (modal) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div id="feasibilityModal" class="modal-backdrop is-hidden" role="dialog" aria-modal="true" aria-labelledby="feasibilityTitle">
        <section class="modal-panel feasibility-panel">
          <div class="modal-header">
            <div>
              <span>Feasibility Analysis</span>
              <h3 id="feasibilityTitle">PRD feasibility review</h3>
            </div>
            <button id="feasibilityCloseButton" class="icon-button" type="button" aria-label="Close feasibility analysis">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div id="feasibilityContent" class="feasibility-body"></div>
          <div class="modal-footer">
            <button id="feasibilityCancelButton" class="secondary-button" type="button">Close</button>
            <button id="analyzePrdFeasibilityButton" class="primary-button" type="button">Analyze PRD Feasibility</button>
          </div>
        </section>
      </div>
    `);

    modal = document.getElementById("feasibilityModal");
    content = document.getElementById("feasibilityContent");
    analyzeButton = document.getElementById("analyzePrdFeasibilityButton");
    closeButton = document.getElementById("feasibilityCloseButton");
    cancelButton = document.getElementById("feasibilityCancelButton");

    closeButton.addEventListener("click", closeModal);
    cancelButton.addEventListener("click", closeModal);
    analyzeButton.addEventListener("click", analyzeFeasibility);
    modal.addEventListener("click", (event) => {
      if (event.target === modal && !isAnalyzing) closeModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal && !modal.classList.contains("is-hidden") && !isAnalyzing) closeModal();
    });
  }

  function renderModalReady(prd, analysis) {
    analyzeButton.disabled = false;
    closeButton.disabled = false;
    cancelButton.disabled = false;
    analyzeButton.textContent = "Analyze PRD Feasibility";
    content.innerHTML = `
      <p class="feasibility-intro">Review the PRD handoff, then run a system architecture feasibility analysis.</p>
      <div class="feasibility-prd-preview prd-markdown">
        ${app().renderMarkdown ? app().renderMarkdown(prd.content) : escapeHtml(prd.content)}
      </div>
      ${analysis ? renderAnalysis(analysis) : ""}
    `;
    updateReviseButtonVisibility(analysis);
  }

  async function analyzeFeasibility() {
    const product = app().activeProduct();
    const prd = getHandoffPrd(product);
    if (!prd?.content || isAnalyzing) return;

    isAnalyzing = true;
    analyzeButton.disabled = true;
    closeButton.disabled = true;
    cancelButton.disabled = true;
    analyzeButton.textContent = "Analyzing...";
    content.innerHTML = '<p class="empty-result">Analyzing PRD feasibility with OpenAI...</p>';

    try {
      const result = await requestFeasibilityAnalysis(prd.content);
      if (!product.feasibilityAnalyses) product.feasibilityAnalyses = [];
      product.feasibilityAnalyses[2] = {
        ...result.analysis,
        analyzedAt: new Date().toISOString(),
        inputFile: result.inputFile || "",
        outputFile: result.outputFile || ""
      };
      app().logActivity("PRD feasibility analysis completed");
      app().persist();
      content.innerHTML = renderAnalysis(product.feasibilityAnalyses[2]);
      updateReviseButtonVisibility(product.feasibilityAnalyses[2]);
      bindRevisionButton(content);
    } catch (error) {
      content.innerHTML = `<p class="feasibility-error">Feasibility analysis failed: ${escapeHtml(error.message || error)}</p>`;
      app().logActivity("PRD feasibility analysis failed");
    } finally {
      isAnalyzing = false;
      analyzeButton.disabled = false;
      closeButton.disabled = false;
      cancelButton.disabled = false;
      analyzeButton.textContent = "Analyze PRD Feasibility";
      updateReviseButtonVisibility(getSavedAnalysis(product));
      app().render();
    }
  }

  async function revisePrdFromAnalysis() {
    const product = app().activeProduct();
    const prd = getHandoffPrd(product);
    const analysis = getSavedAnalysis(product);
    if (!prd?.content || !hasLowFeasibilityScores(analysis) || isRevising) return;

    const lowAssessments = buildLowAssessments(analysis);
    if (lowAssessments.length === 0) return;

    isRevising = true;
    setRevisionUiState(true);
    if (content) {
      content.innerHTML = '<p class="empty-result">Revising PRD from low feasibility findings...</p>';
    }
    showRevisionStatus("Updating PRD...");

    try {
      const result = await requestPrdRevision(prd.content, lowAssessments);
      product.prdOutputs[1] = {
        ...prd,
        content: result.prd,
        outputFile: result.outputFile || prd.outputFile || "",
        generatedAt: new Date().toISOString(),
        source: "Feasibility revision based on low scores"
      };
      app().logActivity("PRD revised from feasibility findings");
      app().persist();
      if (content) {
        content.innerHTML = `
          <p class="feasibility-intro">The PRD was updated from the low feasibility findings. Re-run analysis to confirm the revised version.</p>
          <div class="feasibility-prd-preview prd-markdown">
            ${app().renderMarkdown ? app().renderMarkdown(result.prd) : escapeHtml(result.prd)}
          </div>
          ${renderAnalysis(getSavedAnalysis(product))}
        `;
      }
      updateReviseButtonVisibility(getSavedAnalysis(product));
      bindRevisionButton(content);
      hideRevisionStatus();
    } catch (error) {
      if (content) {
        content.innerHTML = `<p class="feasibility-error">Revision failed: ${escapeHtml(error.message || error)}</p>`;
      }
      app().logActivity("PRD revision from feasibility findings failed");
      showRevisionStatus(`Revision failed: ${error.message || error}`);
    } finally {
      isRevising = false;
      setRevisionUiState(false);
      app().render();
    }
  }

  async function requestFeasibilityAnalysis(prd) {
    let response;
    try {
      response = await fetch("/api/analyze-feasibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prd })
      });
    } catch {
      throw new Error("Could not reach the feasibility analysis server. Start the app with npm start and open the localhost URL printed by the server.");
    }

    const rawBody = await response.text().catch(() => "");
    const result = parseResponseBody(rawBody);
    if (!response.ok) {
      if (response.status === 405) {
        throw new Error("Feasibility API route is not active. Restart the Makeflow server so /api/analyze-feasibility is loaded, then try again.");
      }
      throw new Error(formatServerError("Unable to analyze PRD feasibility.", response.status, rawBody, result));
    }
    if (!result.analysis) {
      throw new Error("The feasibility analysis was not returned.");
    }
    return result;
  }

  async function requestPrdRevision(currentPrd, lowAssessments) {
    let response;
    try {
      response = await fetch("/api/update-prd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          currentPrd,
          lowAssessments,
          comments: buildRevisionComments({ scores: lowAssessments.map((item) => ({
            area: item.area,
            score: item.score,
            rationale: item.rationale
          })) })
        })
      });
    } catch {
      throw new Error("Could not reach the PRD update server. Start the app with npm start and open the localhost URL printed by the server.");
    }

    const rawBody = await response.text().catch(() => "");
    const result = parseResponseBody(rawBody);
    if (!response.ok) {
      throw new Error(formatServerError("Unable to revise PRD.", response.status, rawBody, result));
    }
    if (!result.prd) {
      throw new Error("The updated PRD was not returned.");
    }
    return result;
  }

  function parseResponseBody(body) {
    if (!body) return {};
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  function formatServerError(fallback, status, body, parsed) {
    if (parsed?.error) return parsed.error;
    const trimmed = String(body || "").trim();
    if (trimmed) return `${fallback} (HTTP ${status}): ${trimmed.slice(0, 240)}`;
    return `${fallback} (HTTP ${status})`;
  }

  function renderAnalysis(analysis) {
    const scores = Array.isArray(analysis?.scores) ? analysis.scores : [];
    return `
      <div class="feasibility-results">
        <h4>Feasibility scores</h4>
        ${analysis?.summary ? `<p>${escapeHtml(analysis.summary)}</p>` : ""}
        <div class="feasibility-score-grid">
          ${SCORE_AREAS.map((area) => {
            const item = scores.find((score) => score.area === area) || { area, score: "low", rationale: "" };
            const score = normalizeScore(item.score);
            return `
              <article class="feasibility-score-card">
                <div>
                  <strong>${escapeHtml(area)}</strong>
                  <span class="score-pill ${score}">${score}</span>
                </div>
                <p>${escapeHtml(item.rationale || "No rationale returned.")}</p>
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
        ${hasLowFeasibilityScores(analysis) ? `
          <div class="feasibility-action-row">
            <button class="secondary-button revise-prd-trigger" type="button">Revise PRD</button>
          </div>
        ` : ""}
      </div>
    `;
  }

  function buildRevisionComments(analysis) {
    return buildLowAssessments(analysis).map((item) => ({
      quote: `${item.area} feasibility: ${item.score}`,
      comment: item.rationale
        ? `Revise the PRD to address: ${item.rationale}`
        : "Revise the PRD to address this low feasibility finding."
    }));
  }

  function hasLowFeasibilityScores(analysis) {
    return Array.isArray(analysis?.scores) && analysis.scores.some((score) => normalizeScore(score?.score) === "low");
  }

  function buildLowAssessments(analysis) {
    return Array.isArray(analysis?.scores)
      ? analysis.scores
          .filter((score) => normalizeScore(score?.score) === "low")
          .map((score) => ({
            area: String(score?.area || "Feasibility"),
            score: "low",
            rationale: String(score?.rationale || "This area needs clearer product definition.").trim()
          }))
      : [];
  }

  function bindRevisionButton(root) {
    if (!root) return;
    root.querySelectorAll(".revise-prd-trigger").forEach((button) => {
      button.addEventListener("click", revisePrdFromAnalysis);
    });
  }

  function updateReviseButtonVisibility(analysis) {
    const shouldShow = hasLowFeasibilityScores(analysis);
    if (modal) {
      modal.querySelectorAll(".revise-prd-trigger").forEach((button) => {
        button.style.display = shouldShow ? "" : "none";
      });
    }
  }

  function setRevisionUiState(disabled) {
    if (analyzeButton) analyzeButton.disabled = disabled;
    if (closeButton) closeButton.disabled = disabled;
    if (cancelButton) cancelButton.disabled = disabled;
    if (modal) {
      modal.querySelectorAll(".revise-prd-trigger").forEach((button) => {
        button.disabled = disabled;
      });
    }
  }

  function showRevisionStatus(message) {
    createRevisionStatusModal();
    revisionModalContent.textContent = message;
    revisionModal.classList.remove("is-hidden");
  }

  function hideRevisionStatus() {
    if (revisionModal) {
      revisionModal.classList.add("is-hidden");
    }
  }

  function createRevisionStatusModal() {
    if (revisionModal) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div id="prdRevisionStatusModal" class="modal-backdrop is-hidden" role="alertdialog" aria-modal="true" aria-labelledby="prdRevisionStatusTitle">
        <section class="modal-panel confirm-panel">
          <div class="modal-header">
            <div>
              <span>PRD Revision</span>
              <h3 id="prdRevisionStatusTitle">Updating PRD</h3>
            </div>
          </div>
          <div id="prdRevisionStatusContent" class="confirm-message">Updating PRD...</div>
        </section>
      </div>
    `);

    revisionModal = document.getElementById("prdRevisionStatusModal");
    revisionModalContent = document.getElementById("prdRevisionStatusContent");
  }

  function closeModal() {
    if (!modal || isAnalyzing) return;
    modal.classList.add("is-hidden");
  }

  function getHandoffPrd(product) {
    return product?.prdOutputs?.[1] || null;
  }

  function getSavedAnalysis(product) {
    return product?.feasibilityAnalyses?.[2] || null;
  }

  function normalizeScore(score) {
    const value = String(score || "").toLowerCase();
    return value === "high" || value === "medium" || value === "low" ? value : "low";
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

  window.FeasibilityAnalysis = {
    renderStage,
    openModal
  };
})();
