import { describe, expect, it } from "vitest";

import type { PrematchFeatureVector } from "@/types/prediction";

import {
  evaluateFixtureReadiness,
  type FixtureEvaluationInput,
} from "./evaluate";
import {
  isImminentBelgrade,
  isUpcomingBeyondScheduleWindow,
  resolveLiveSubState,
} from "./lifecycle";
import {
  isAiGenerationAllowed,
  isFixtureReadyForPrediction,
  isPredictionFresh,
} from "./gates";
import { PREMATCH_FRESHNESS_MS, PREMATCH_SCHEDULED_LEAD_MS } from "./constants";

const baseFeatures: PrematchFeatureVector = {
  fixtureExternalId: 1,
  homeTeamProviderId: 1,
  awayTeamProviderId: 2,
  leagueProviderId: 39,
  asOf: "2026-09-26T12:00:00.000Z",
  dataQuality: "PARTIAL",
  hasXg: false,
  eloHome: 1500,
  eloAway: 1500,
  eloDiff: 0,
  form5HomePpg: 1.4,
  form5AwayPpg: 1.1,
  form10HomePpg: null,
  form10AwayPpg: null,
  form5HomeVenuePpg: null,
  form5AwayVenuePpg: null,
  homeLeagueRank: null,
  awayLeagueRank: null,
  homeGoalsForAvg: null,
  awayGoalsForAvg: null,
  homeGoalsAgainstAvg: null,
  awayGoalsAgainstAvg: null,
  homeXgForAvg: null,
  awayXgForAvg: null,
  homeXgAgainstAvg: null,
  awayXgAgainstAvg: null,
  h2hHomeWinRate: null,
  h2hGoalAvg: null,
  homeRestDays: null,
  awayRestDays: null,
  homeInjuryImpact: null,
  awayInjuryImpact: null,
  homeTopScorersSidelined: 0,
  awayTopScorersSidelined: 0,
  homeStandingPoints: null,
  awayStandingPoints: null,
  leaguePositionDiff: null,
  standingPointsDiff: null,
  lineupsState: "MISSING",
};

function baseInput(
  overrides: Partial<FixtureEvaluationInput> = {}
): FixtureEvaluationInput {
  const nowMs = overrides.nowMs ?? Date.parse("2026-09-26T10:00:00.000Z");
  return {
    fixtureUuid: "uuid-1",
    providerId: 1,
    status: "NS",
    kickoffAt: "2026-09-26T18:00:00.000Z",
    lastProviderSyncAt: null,
    nowMs,
    features: baseFeatures,
    homeHistoryCount: 15,
    awayHistoryCount: 15,
    lineupsCount: 0,
    sidelinedCount: 0,
    eventsCount: 0,
    statisticsCount: 0,
    postmatchDepsComplete: false,
    prediction: null,
    prematchInsight: null,
    currentContextHash: null,
    ...overrides,
  };
}

describe("lifecycle helpers", () => {
  it("detects imminent kickoff within 90m (Belgrade calendar)", () => {
    const kickoff = "2026-09-26T18:00:00.000Z";
    const nowMs = Date.parse("2026-09-26T17:00:00.000Z");
    expect(isImminentBelgrade(kickoff, nowMs)).toBe(true);
  });

  it("detects upcoming beyond 72h schedule window", () => {
    const kickoff = "2026-09-30T18:00:00.000Z";
    const nowMs = Date.parse("2026-09-26T10:00:00.000Z");
    expect(isUpcomingBeyondScheduleWindow(kickoff, nowMs)).toBe(true);
  });

  it("marks INT/SUSP as paused live sub-state", () => {
    expect(resolveLiveSubState("INT")).toBe("paused");
    expect(resolveLiveSubState("1H")).toBe("active");
  });
});

describe("evaluateFixtureReadiness", () => {
  it("upcoming fixture outside compute window is UPCOMING", () => {
    const snap = evaluateFixtureReadiness(
      baseInput({
        kickoffAt: new Date(
          Date.parse("2026-09-26T10:00:00.000Z") +
            PREMATCH_SCHEDULED_LEAD_MS +
            86_400_000
        ).toISOString(),
      })
    );
    expect(snap.phase).toBe("UPCOMING");
    expect(isFixtureReadyForPrediction(snap)).toBe(false);
  });

  it("imminent prematch collecting when prediction missing", () => {
    const snap = evaluateFixtureReadiness(
      baseInput({
        kickoffAt: "2026-09-26T10:30:00.000Z",
        nowMs: Date.parse("2026-09-26T09:30:00.000Z"),
      })
    );
    expect(snap.phase).toBe("PREMATCH_COLLECTING");
  });

  it("flags insufficient historical depth", () => {
    const snap = evaluateFixtureReadiness(
      baseInput({ homeHistoryCount: 2, awayHistoryCount: 2 })
    );
    expect(
      snap.items.find((item) => item.key === "historical_depth")?.state
    ).toBe("insufficient");
    expect(snap.gates.historicalDataSufficient).toBe(false);
  });

  it("odds are unavailable and never block", () => {
    const snap = evaluateFixtureReadiness(baseInput());
    const odds = snap.items.find((item) => item.key === "odds");
    expect(odds?.state).toBe("unavailable");
  });

  it("lineups not yet available far from kickoff", () => {
    const snap = evaluateFixtureReadiness(
      baseInput({
        kickoffAt: "2026-09-26T20:00:00.000Z",
        nowMs: Date.parse("2026-09-26T10:00:00.000Z"),
        lineupsCount: 0,
      })
    );
    expect(snap.items.find((item) => item.key === "lineups")?.state).toBe(
      "not_yet_available"
    );
  });

  it("stale prediction when fingerprint window expired", () => {
    const createdAt = new Date(
      Date.parse("2026-09-26T10:00:00.000Z") - PREMATCH_FRESHNESS_MS - 1000
    ).toISOString();
    const snap = evaluateFixtureReadiness(
      baseInput({
        prediction: {
          id: "p1",
          createdAt,
          inputSnapshot: baseFeatures,
        },
      })
    );
    expect(snap.gates.predictionFresh).toBe(false);
    expect(snap.items.find((item) => item.key === "prediction")?.state).toBe(
      "stale"
    );
  });

  it("stale AI insight on context hash mismatch", () => {
    const snap = evaluateFixtureReadiness(
      baseInput({
        prematchInsight: {
          id: "i1",
          contextHash: "old-hash",
          createdAt: "2026-09-26T09:00:00.000Z",
        },
        currentContextHash: "new-hash",
        prediction: {
          id: "p1",
          createdAt: "2026-09-26T09:00:00.000Z",
          inputSnapshot: baseFeatures,
        },
      })
    );
    expect(snap.items.find((item) => item.key === "ai_insight")?.state).toBe(
      "stale"
    );
  });

  it("live paused fixture keeps live phase with paused sub-state", () => {
    const snap = evaluateFixtureReadiness(
      baseInput({
        status: "SUSP",
        lastProviderSyncAt: "2026-09-26T10:00:00.000Z",
      })
    );
    expect(snap.phase).toBe("LIVE");
    expect(snap.liveSubState).toBe("paused");
  });

  it("halftime is active live", () => {
    const snap = evaluateFixtureReadiness(
      baseInput({
        status: "HT",
        lastProviderSyncAt: new Date().toISOString(),
      })
    );
    expect(snap.liveSubState).toBe("active");
  });

  it("postponed maps to NEITHER", () => {
    const snap = evaluateFixtureReadiness(baseInput({ status: "PST" }));
    expect(snap.phase).toBe("NEITHER");
  });

  it("cancelled maps to NEITHER", () => {
    const snap = evaluateFixtureReadiness(baseInput({ status: "CANC" }));
    expect(snap.phase).toBe("NEITHER");
  });

  it("finished moves toward historical when postmatch complete", () => {
    const snap = evaluateFixtureReadiness(
      baseInput({
        status: "FT",
        postmatchDepsComplete: true,
        eventsCount: 5,
        statisticsCount: 2,
      })
    );
    expect(snap.phase).toBe("HISTORICAL");
  });

  it("AI generation allowed only with fresh prediction in LLM window", () => {
    const snap = evaluateFixtureReadiness(
      baseInput({
        kickoffAt: "2026-09-26T12:00:00.000Z",
        nowMs: Date.parse("2026-09-26T10:00:00.000Z"),
        prediction: {
          id: "p1",
          createdAt: "2026-09-26T09:55:00.000Z",
          inputSnapshot: baseFeatures,
        },
      })
    );
    expect(isAiGenerationAllowed(snap)).toBe(true);
    expect(isPredictionFresh(snap)).toBe(true);
  });

  it("prediction not ready without minimum features", () => {
    const snap = evaluateFixtureReadiness(
      baseInput({
        features: { ...baseFeatures, form5HomePpg: null, form5AwayPpg: null },
      })
    );
    expect(isFixtureReadyForPrediction(snap)).toBe(false);
  });
});
