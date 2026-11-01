// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AIHeroCard } from "@/components/ai/AIHeroCard";
import type { StoredAIInsight } from "@/lib/ai/schemas";
import type { InsightDisplayPrediction } from "@/lib/ai/insight-display-metrics";

const homeTeam = { name: "Home FC", code: "HOM" };
const awayTeam = { name: "Away FC", code: "AWY" };

const baseInsight: StoredAIInsight = {
  id: "ins-live",
  fixtureExternalId: 1,
  fixtureId: "uuid",
  predictionId: "p1",
  contextHash: "h",
  openaiModel: "gpt",
  promptVersion: "1",
  createdAt: "2026-01-01T00:00:00.000Z",
  cached: true,
  summary: "Live narrative only.",
  advantage: "HOME",
  winOutcome: "1",
  winProbabilities: { home: 0.72, draw: 0.18, away: 0.1 },
  expectedGoalsRange: [2, 3],
  weakerTeamScoringChance: 0.2,
  confidence: "MEDIUM",
  keyFactors: [],
  scenarios: { likely: "a", best: "b", upset: "c" },
  commentary: "Commentary",
  dataUsed: [],
  dataTimestamp: "2026-01-01T00:00:00.000Z",
  dataQuality: "PARTIAL",
  dataCoverage: null,
  analysis: null,
};

const prematchLinkedPrediction: InsightDisplayPrediction = {
  type: "PREMATCH",
  presentationKind: "PRE_MATCH_PROBABILITY",
  predictionId: "p1",
  fixtureId: "",
  fixtureExternalId: 1,
  modelVersionId: "",
  modelVersion: "v1",
  modelTier: "FIXTURE_SPECIFIC",
  inputSnapshotFingerprint: "",
  expectedGoalsAvailable: true,
  winProbabilities: { home: 0.72, draw: 0.18, away: 0.1 },
  expectedGoalsHome: 1.2,
  expectedGoalsAway: 1.1,
  expectedGoalsTotal: 2.3,
  expectedGoalsTotalMin: 2,
  expectedGoalsTotalMax: 3,
  over2Prob: 0.5,
  over3Prob: 0.2,
  under2Prob: 0.5,
  bttsProb: 0.5,
  weakerTeamScoringProb: 0.3,
  confidence: "MEDIUM",
  predictedOutcome: "1",
  inputSnapshot: {} as never,
  createdAt: "2026-01-01T00:00:00.000Z",
  fromCache: true,
};

describe("AIHeroCard live mode", () => {
  it("does not show prematch win bar when live probabilities are missing", () => {
    render(
      <AIHeroCard
        insight={baseInsight}
        prediction={prematchLinkedPrediction}
        insightMode="live"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        liveWinProbabilities={null}
      />
    );

    expect(screen.getByText("Live narrative only.")).toBeInTheDocument();
    expect(screen.queryByText("Model probabilities")).not.toBeInTheDocument();
    expect(screen.queryByText("72%")).not.toBeInTheDocument();
  });
});
