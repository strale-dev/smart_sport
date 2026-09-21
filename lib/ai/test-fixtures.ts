import type { PrematchAnalysisSections } from "@/lib/ai/schemas";

/** Valid prematch analysis block for unit tests (meets schema min lengths). */
export const samplePrematchAnalysis: PrematchAnalysisSections = {
  matchSummary:
    "Both sides arrive with similar recent form and comparable league positions.",
  homeTeamAnalysis:
    "The home team have picked up steady points at home over the last month.",
  awayTeamAnalysis:
    "The away team travel well and have scored in most recent away fixtures.",
  headToHeadAnalysis: null,
  lineupsAndAbsences: null,
  goalsOutlook:
    "The model expects a moderate-scoring game with chances at both ends.",
  predictionRationale:
    "Home advantage and slightly stronger underlying numbers tilt the model toward the hosts.",
  risks: [
    "Away counter-attacking threat if the home side overcommits.",
    "Key absences could reduce attacking quality on both sides.",
  ],
  watchFor: ["Set-piece situations in wide areas"],
};

export const sampleNarrativeForMerge = {
  summary: "Home side enter with a narrow statistical edge in this fixture.",
  advantage: "HOME" as const,
  keyFactors: [
    {
      label: "Recent form",
      weight: 0.4,
      evidence: "Home team averaged 2.1 ppg over the last five matches.",
    },
    {
      label: "Head-to-head",
      weight: 0.3,
      evidence: "The last three meetings produced two home wins.",
    },
  ],
  scenarios: {
    likely: "A tight home win with both teams scoring.",
    best: "Home team control early and win comfortably.",
    upset: "Away team absorb pressure and win on the counter.",
  },
  commentary:
    "The model gives the home team a modest edge driven by stronger recent form and home advantage. Data quality is solid but not complete, so confidence stays medium rather than high.",
  dataUsed: ["Model prediction", "Team form"],
  dataTimestamp: "2026-01-01T12:00:00.000Z",
  dataQuality: "PARTIAL" as const,
  analysis: samplePrematchAnalysis,
};
