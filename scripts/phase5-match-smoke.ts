import { mapLiveInsightResponseToViewModel } from "@/lib/ai/live-insight-state";
import type { LiveInsightResponse } from "@/lib/ai/schemas";
import type { LiveProbabilityDeltaResponse } from "@/lib/live/live-probability-delta";

function assertProbabilitySum(
  label: string,
  probs: { home: number; draw: number; away: number } | null
): void {
  if (!probs) {
    return;
  }

  const sum = probs.home + probs.draw + probs.away;
  if (Math.abs(sum - 1) > 0.05) {
    console.error(`${label} probabilities sum to ${sum}, expected ~1`);
    process.exit(1);
  }
}

const sampleLiveInsight: LiveInsightResponse = {
  status: "OK",
  cached: true,
  insightMode: "live",
  prediction: null,
  insight: {
    id: "insight-live-1",
    fixtureExternalId: 123,
    fixtureId: "uuid",
    predictionId: null,
    contextHash: "hash",
    openaiModel: "gpt-4o-mini",
    promptVersion: "1",
    createdAt: new Date().toISOString(),
    cached: true,
    summary: "Home side edge after the opener.",
    advantage: "HOME",
    winOutcome: "1",
    winProbabilities: { home: 0.55, draw: 0.25, away: 0.2 },
    expectedGoalsRange: [1, 3],
    weakerTeamScoringChance: 0.4,
    confidence: "MEDIUM",
    keyFactors: [
      { label: "Score", weight: 0.5, evidence: "Leading 1-0" },
      { label: "xG", weight: 0.3, evidence: "Higher xG" },
    ],
    scenarios: {
      likely: "Home holds",
      best: "Home adds second",
      upset: "Away equalizer",
    },
    commentary: "A".repeat(60),
    dataUsed: ["Model prediction", "Live match statistics"],
    dataTimestamp: new Date().toISOString(),
    dataQuality: "COMPLETE",
    dataCoverage: null,
    analysis: null,
  },
};

const mapped = mapLiveInsightResponseToViewModel(sampleLiveInsight, "1H");
if (mapped.state !== "ok" || mapped.insightMode !== "live") {
  console.error("Live insight mapper failed", mapped);
  process.exit(1);
}

const deltaFixture: LiveProbabilityDeltaResponse = {
  prematch: { home: 0.45, draw: 0.28, away: 0.27 },
  live: { home: 0.58, draw: 0.22, away: 0.2 },
  liveMinute: 67,
  prematchPrediction: null,
};

assertProbabilitySum("prematch", deltaFixture.prematch);
assertProbabilitySum("live", deltaFixture.live);

console.log("phase5-match-smoke: live insight mapper + delta shape OK");
