import { hasMinimumModelSignal } from "@/lib/ai/prematch-availability";
import { predictedOutcomeFromProbabilities } from "@/lib/models/confidence";
import { isGenericBaselineWinProbabilities } from "@/lib/models/prematch-model-signal";
import { computePrematchFeatureFingerprint } from "@/lib/models/prematch-feature-fingerprint";
import { normalizeWinProbabilitiesWithFloor } from "@/lib/models/normalize-probabilities";
import {
  buildTotalGoalsDistribution,
  computeGoalMarketProbs,
} from "@/lib/models/poisson";
import type { ProbabilityPresentationKind } from "@/types/probability-presentation";
import type {
  AiConfidence,
  PrematchFeatureVector,
  PrematchPredictionResult,
  PrematchPredictionRow,
  WinProbabilities,
} from "@/types/prediction";

export type PrematchModelTier = "GENERIC_BASELINE" | "FIXTURE_SPECIFIC";

export type FixtureSnapshotIdentity = {
  fixtureExternalId: number;
  homeTeamProviderId: number;
  awayTeamProviderId: number;
  leagueProviderId: number;
};

export type PrematchValidationFailureReason =
  | "FIXTURE_ID_MISMATCH"
  | "HOME_AWAY_MISMATCH"
  | "LEAGUE_MISMATCH"
  | "INVALID_WIN_PROBABILITIES"
  | "NEGATIVE_EXPECTED_GOALS"
  | "MISSING_EXPECTED_GOALS";

const WIN_PROB_SUM_TOLERANCE = 0.02;
const WIN_PROB_MIN = 0;
const WIN_PROB_MAX = 1;

export function assertWinProbabilitiesRaw(input: {
  home: number;
  draw: number;
  away: number;
}):
  | { ok: true; probabilities: WinProbabilities }
  | { ok: false; reason: "INVALID_WIN_PROBABILITIES" } {
  const home = Number(input.home);
  const draw = Number(input.draw);
  const away = Number(input.away);

  if (
    !Number.isFinite(home) ||
    !Number.isFinite(draw) ||
    !Number.isFinite(away)
  ) {
    return { ok: false, reason: "INVALID_WIN_PROBABILITIES" };
  }

  if (
    home < WIN_PROB_MIN ||
    draw < WIN_PROB_MIN ||
    away < WIN_PROB_MIN ||
    home > WIN_PROB_MAX ||
    draw > WIN_PROB_MAX ||
    away > WIN_PROB_MAX
  ) {
    return { ok: false, reason: "INVALID_WIN_PROBABILITIES" };
  }

  const sum = home + draw + away;
  if (Math.abs(sum - 1) > WIN_PROB_SUM_TOLERANCE) {
    return { ok: false, reason: "INVALID_WIN_PROBABILITIES" };
  }

  return {
    ok: true,
    probabilities: { home, draw, away },
  };
}

export function assertSnapshotIdentity(
  snapshot: PrematchFeatureVector,
  expected: FixtureSnapshotIdentity
):
  | { ok: true }
  | {
      ok: false;
      reason: "FIXTURE_ID_MISMATCH" | "HOME_AWAY_MISMATCH" | "LEAGUE_MISMATCH";
    } {
  if (snapshot.fixtureExternalId !== expected.fixtureExternalId) {
    return { ok: false, reason: "FIXTURE_ID_MISMATCH" };
  }

  if (
    snapshot.homeTeamProviderId !== expected.homeTeamProviderId ||
    snapshot.awayTeamProviderId !== expected.awayTeamProviderId
  ) {
    return { ok: false, reason: "HOME_AWAY_MISMATCH" };
  }

  if (snapshot.leagueProviderId !== expected.leagueProviderId) {
    return { ok: false, reason: "LEAGUE_MISMATCH" };
  }

  return { ok: true };
}

export function resolvePrematchModelTier(
  features: PrematchFeatureVector,
  winProbabilities: WinProbabilities
): PrematchModelTier {
  if (
    !hasMinimumModelSignal(features) ||
    isGenericBaselineWinProbabilities(winProbabilities)
  ) {
    return "GENERIC_BASELINE";
  }

  return "FIXTURE_SPECIFIC";
}

const CONFIDENCE_RANK: Record<AiConfidence, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
};

function minConfidence(a: AiConfidence, b: AiConfidence): AiConfidence {
  return CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b;
}

export function capConfidenceByDataQuality(
  confidence: AiConfidence,
  features: PrematchFeatureVector,
  modelTier: PrematchModelTier
): AiConfidence {
  let capped = confidence;

  if (features.dataQuality === "PARTIAL") {
    capped = minConfidence(capped, "MEDIUM");
  }

  if (modelTier === "GENERIC_BASELINE" || !hasMinimumModelSignal(features)) {
    capped = minConfidence(capped, "LOW");
  }

  return capped;
}

export type ResolvedGoalMarkets = {
  expectedGoalsHome: number;
  expectedGoalsAway: number;
  expectedGoalsTotal: number;
  expectedGoalsAvailable: boolean;
  over2Prob: number;
  over3Prob: number;
  under2Prob: number;
};

export function resolveGoalMarketsFromValidatedRow(
  row: PrematchPredictionRow
):
  | { ok: true; markets: ResolvedGoalMarkets }
  | { ok: false; reason: PrematchValidationFailureReason } {
  const homeRaw = row.expected_goals_home;
  const awayRaw = row.expected_goals_away;

  if (homeRaw != null && Number(homeRaw) < 0) {
    return { ok: false, reason: "NEGATIVE_EXPECTED_GOALS" };
  }
  if (awayRaw != null && Number(awayRaw) < 0) {
    return { ok: false, reason: "NEGATIVE_EXPECTED_GOALS" };
  }

  const hasComponentGoals = homeRaw != null && awayRaw != null;
  if (!hasComponentGoals && row.expected_goals_total == null) {
    if (row.over2_prob != null && row.over3_prob != null) {
      const over2Prob = Number(row.over2_prob);
      const over3Prob = Math.min(Number(row.over3_prob), over2Prob);
      return {
        ok: true,
        markets: {
          expectedGoalsHome: 0,
          expectedGoalsAway: 0,
          expectedGoalsTotal: 0,
          expectedGoalsAvailable: false,
          over2Prob,
          over3Prob,
          under2Prob: Number((1 - over2Prob).toFixed(4)),
        },
      };
    }
    return { ok: false, reason: "MISSING_EXPECTED_GOALS" };
  }

  const expectedGoalsHome = Number(homeRaw ?? 0);
  const expectedGoalsAway = Number(awayRaw ?? 0);
  const expectedGoalsTotal =
    row.expected_goals_total != null
      ? Number(row.expected_goals_total)
      : Number((expectedGoalsHome + expectedGoalsAway).toFixed(2));

  if (row.over2_prob != null && row.over3_prob != null) {
    const over2Prob = Number(row.over2_prob);
    const over3Prob = Math.min(Number(row.over3_prob), over2Prob);
    return {
      ok: true,
      markets: {
        expectedGoalsHome,
        expectedGoalsAway,
        expectedGoalsTotal,
        expectedGoalsAvailable: hasComponentGoals,
        over2Prob,
        over3Prob,
        under2Prob: Number((1 - over2Prob).toFixed(4)),
      },
    };
  }

  if (!hasComponentGoals) {
    return { ok: false, reason: "MISSING_EXPECTED_GOALS" };
  }

  const distribution = buildTotalGoalsDistribution(
    expectedGoalsHome,
    expectedGoalsAway,
    8
  );
  const markets = computeGoalMarketProbs(distribution);
  return {
    ok: true,
    markets: {
      expectedGoalsHome,
      expectedGoalsAway,
      expectedGoalsTotal,
      expectedGoalsAvailable: true,
      ...markets,
    },
  };
}

export function mapValidatedPrematchRowToResult(input: {
  row: PrematchPredictionRow;
  fixtureExternalId: number;
  identity: FixtureSnapshotIdentity;
  modelVersion: string;
  fromCache: boolean;
  presentationKind?: ProbabilityPresentationKind;
}): PrematchPredictionResult | null {
  const snapshot = input.row.input_snapshot as PrematchFeatureVector;
  if (!snapshot) {
    return null;
  }

  const identityCheck = assertSnapshotIdentity(snapshot, input.identity);
  if (!identityCheck.ok) {
    return null;
  }

  const probCheck = assertWinProbabilitiesRaw({
    home: Number(input.row.home_win_prob),
    draw: Number(input.row.draw_prob),
    away: Number(input.row.away_win_prob),
  });
  if (!probCheck.ok) {
    return null;
  }

  const goalMarkets = resolveGoalMarketsFromValidatedRow(input.row);
  if (!goalMarkets.ok) {
    return null;
  }

  const winProbabilities = normalizeWinProbabilitiesWithFloor(
    probCheck.probabilities
  );
  const modelTier = resolvePrematchModelTier(snapshot, winProbabilities);
  const confidence = capConfidenceByDataQuality(
    input.row.confidence,
    snapshot,
    modelTier
  );
  const predictedOutcome = predictedOutcomeFromProbabilities(winProbabilities);

  return {
    fixtureId: input.row.fixture_id,
    fixtureExternalId: input.fixtureExternalId,
    modelVersionId: input.row.model_version_id,
    modelVersion: input.modelVersion,
    predictionId: input.row.id,
    type: "PREMATCH",
    presentationKind: input.presentationKind ?? "PRE_MATCH_PROBABILITY",
    modelTier,
    inputSnapshotFingerprint: computePrematchFeatureFingerprint(snapshot),
    expectedGoalsAvailable: goalMarkets.markets.expectedGoalsAvailable,
    winProbabilities,
    expectedGoalsHome: goalMarkets.markets.expectedGoalsHome,
    expectedGoalsAway: goalMarkets.markets.expectedGoalsAway,
    expectedGoalsTotal: goalMarkets.markets.expectedGoalsTotal,
    expectedGoalsTotalMin: Number(input.row.expected_goals_total_min ?? 0),
    expectedGoalsTotalMax: Number(input.row.expected_goals_total_max ?? 0),
    bttsProb: Number(input.row.btts_prob ?? 0),
    weakerTeamScoringProb: Number(input.row.weaker_team_scoring_prob ?? 0),
    over2Prob: goalMarkets.markets.over2Prob,
    over3Prob: goalMarkets.markets.over3Prob,
    under2Prob: goalMarkets.markets.under2Prob,
    confidence,
    predictedOutcome,
    inputSnapshot: snapshot,
    createdAt: input.row.created_at,
    fromCache: input.fromCache,
  };
}

export function validatePrematchModelOutput(input: {
  features: PrematchFeatureVector;
  identity: FixtureSnapshotIdentity;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  expectedGoalsHome: number;
  expectedGoalsAway: number;
}):
  | {
      ok: true;
      winProbabilities: WinProbabilities;
      modelTier: PrematchModelTier;
    }
  | { ok: false; reason: PrematchValidationFailureReason } {
  const identityCheck = assertSnapshotIdentity(input.features, input.identity);
  if (!identityCheck.ok) {
    return { ok: false, reason: identityCheck.reason };
  }

  const probCheck = assertWinProbabilitiesRaw({
    home: input.homeWinProb,
    draw: input.drawProb,
    away: input.awayWinProb,
  });
  if (!probCheck.ok) {
    return { ok: false, reason: probCheck.reason };
  }

  if (input.expectedGoalsHome < 0 || input.expectedGoalsAway < 0) {
    return { ok: false, reason: "NEGATIVE_EXPECTED_GOALS" };
  }

  const winProbabilities = normalizeWinProbabilitiesWithFloor(
    probCheck.probabilities
  );
  const modelTier = resolvePrematchModelTier(input.features, winProbabilities);

  return { ok: true, winProbabilities, modelTier };
}
