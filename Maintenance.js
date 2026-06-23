(function() {
  const RELEASE_CARDS = [
    {
      title: "OTA release",
      date: "Jan 22, 2027",
      features: [
        "Battery calibration",
        "Connectivity recovery",
        "Firmware update progress details"
      ]
    },
    {
      title: "Mobile App release",
      date: "Feb 5, 2027",
      features: [
        "Guided onboarding refresh",
        "Push notification controls",
        "Warranty status shortcut"
      ]
    },
    {
      title: "Backend release",
      date: "Feb 12, 2027",
      features: [
        "Telemetry rollup API",
        "Warranty analytics export",
        "Support context sync"
      ]
    }
  ];

  const CX_FEEDBACK = [
    "Battery estimate feels optimistic",
    "Bluetooth reconnect takes too long",
    "Setup copy is unclear",
    "Notification volume is too high",
    "Packaging scuffs during shipping",
    "Warranty status is hard to find",
    "Firmware update progress needs detail",
    "EU charger availability is limited",
    "App dashboard loads slowly",
    "Support response needs more context"
  ];

  function renderStage(_product, elements) {
    elements.productRows.forEach((row) => { if (row) row.style.display = "none"; });
    if (elements.checklistNextButton) elements.checklistNextButton.style.display = "none";
    if (elements.heading) elements.heading.style.display = "none";
    if (elements.actionRow) elements.actionRow.style.display = "none";
    elements.specWorkbench.classList.add("is-hidden");

    elements.checklist.innerHTML = `
      <li class="check-item prd-drafted">
        <div class="maintenance-stage">
          <div class="section-heading">
            <h3>Maintenance workspace</h3>
            <span>Lifecycle planning</span>
          </div>
          <p>Track post-launch release plans, service improvements, and customer feedback themes.</p>
          <div class="maintenance-release-grid">
            ${RELEASE_CARDS.map(renderReleaseCard).join("")}
          </div>
          ${renderCxFeedbackCard()}
        </div>
      </li>
    `;
    elements.checklistCount.textContent = "";
  }

  function renderReleaseCard(card) {
    return `
      <section class="maintenance-release-card" aria-label="${defaultEscapeHtml(card.title)}">
        <div class="section-heading">
          <h4>${defaultEscapeHtml(card.title)}</h4>
          <span>Expected release</span>
        </div>
        <strong>${defaultEscapeHtml(card.date)}</strong>
        <ul>
          ${card.features.map((feature) => `<li>${defaultEscapeHtml(feature)}</li>`).join("")}
        </ul>
      </section>
    `;
  }

  function renderCxFeedbackCard() {
    return `
      <section class="maintenance-cx-card" aria-label="CX feedback">
        <div class="section-heading">
          <h4>CX feedback</h4>
          <span>Top 10 customer feedback</span>
        </div>
        <ol>
          ${CX_FEEDBACK.map((item) => `<li>${defaultEscapeHtml(item)}</li>`).join("")}
        </ol>
      </section>
    `;
  }

  function defaultEscapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  window.MaintenanceStage = {
    renderStage
  };
})();
