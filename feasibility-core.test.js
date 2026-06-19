import test from "node:test";
import assert from "node:assert/strict";
import { normalizeFeasibilityAnalysis } from "./feasibility-core.js";

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
