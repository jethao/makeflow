import test from "node:test";
import assert from "node:assert/strict";
import { buildFeasibilityRevisionComments, hasLowFeasibilityScores, normalizeFeasibilityAnalysis } from "./feasibility-core.js";

test("normalizes feasibility scores for required product disciplines", () => {
  const analysis = normalizeFeasibilityAnalysis({
    summary: "Build is possible with key supplier and compliance risks.",
    scores: [
      { area: "Mechanical", score: "High", rationale: "Industrial design is achievable." },
      { area: "Electrical", score: "medium", rationale: "Battery and radio integration need validation." },
      { area: "Software", score: "LOW", rationale: "Firmware scope is underspecified." },
      { area: "Manufacture", score: "Medium", rationale: "Tooling risk is moderate." },
      { area: "Compliance", score: "Low", rationale: "Certification path is unclear." },
      { area: "Supply Chain", score: "High", rationale: "Parts are commodity components." }
    ],
    recommendations: ["Run EVT risk workshop."]
  });

  assert.equal(analysis.scores.length, 6);
  assert.deepEqual(
    analysis.scores.map((score) => [score.area, score.score]),
    [
      ["Mechanical", "high"],
      ["Electrical", "medium"],
      ["Software", "low"],
      ["Manufacture", "medium"],
      ["Compliance", "low"],
      ["Supply Chain", "high"]
    ]
  );
  assert.equal(analysis.summary, "Build is possible with key supplier and compliance risks.");
  assert.deepEqual(analysis.recommendations, ["Run EVT risk workshop."]);
});

test("detects low feasibility scores and builds PRD revision comments", () => {
  const analysis = normalizeFeasibilityAnalysis({
    summary: "Major feasibility gaps remain.",
    scores: [
      { area: "Mechanical", score: "high", rationale: "Good path." },
      { area: "Electrical", score: "low", rationale: "Battery pack and power architecture are undefined." },
      { area: "Software", score: "medium", rationale: "Some firmware work needed." },
      { area: "Manufacture", score: "low", rationale: "No assembly plan." },
      { area: "Compliance", score: "high", rationale: "Known certification path." },
      { area: "Supply Chain", score: "medium", rationale: "Some sourcing work required." }
    ]
  });

  assert.equal(hasLowFeasibilityScores(analysis), true);

  assert.deepEqual(buildFeasibilityRevisionComments({
    prd: "PRD body",
    analysis
  }), [
    {
      quote: "Electrical feasibility: low",
      comment: "Revise the PRD to address: Battery pack and power architecture are undefined."
    },
    {
      quote: "Manufacture feasibility: low",
      comment: "Revise the PRD to address: No assembly plan."
    }
  ]);
});
