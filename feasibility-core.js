export const FEASIBILITY_SCORE_AREAS = [
  "Mechanical",
  "Electrical",
  "Software",
  "Manufacture",
  "Compliance",
  "Supply Chain"
];

const SCORE_VALUES = new Set(["high", "medium", "low"]);

export function normalizeFeasibilityAnalysis(input) {
  const source = input && typeof input === "object" ? input : {};
  const scores = Array.isArray(source.scores) ? source.scores : [];

  return {
    summary: typeof source.summary === "string" ? source.summary.trim() : "",
    scores: FEASIBILITY_SCORE_AREAS.map((area) => {
      const match = scores.find((score) => normalizeArea(score?.area) === normalizeArea(area));
      return {
        area,
        score: normalizeScore(match?.score),
        rationale: typeof match?.rationale === "string" ? match.rationale.trim() : ""
      };
    }),
    recommendations: Array.isArray(source.recommendations)
      ? source.recommendations.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
      : []
  };
}

export function parseFeasibilityAnalysisText(text) {
  const parsed = JSON.parse(stripJsonEnvelope(text));
  return normalizeFeasibilityAnalysis(parsed);
}

function normalizeScore(value) {
  const score = String(value || "").trim().toLowerCase();
  return SCORE_VALUES.has(score) ? score : "low";
}

function normalizeArea(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function stripJsonEnvelope(text) {
  return String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
}
