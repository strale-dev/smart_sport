import type { LiveProbabilityDeltaResponse } from "@/lib/live/live-probability-delta";
import { asPreMatchProbability } from "@/types/probability-presentation";
import type {
  LivePredictionResult,
  PrematchPredictionResult,
} from "@/types/prediction";

export function predictionFromDeltaSnapshot(
  fixtureExternalId: number,
  snapshot: NonNullable<LiveProbabilityDeltaResponse["prematchPrediction"]>
): PrematchPredictionResult {
  return asPreMatchProbability({
    predictionId: snapshot.predictionId,
    fixtureId: "",
    fixtureExternalId,
    modelVersionId: "",
    modelVersion: snapshot.modelVersion,
    type: "PREMATCH",
    presentationKind: "PRE_MATCH_PROBABILITY",
    modelTier: snapshot.modelTier,
    inputSnapshotFingerprint: "",
    expectedGoalsAvailable: snapshot.expectedGoalsAvailable,
    winProbabilities: snapshot.winProbabilities,
    expectedGoalsHome: snapshot.expectedGoalsHome,
    expectedGoalsAway: snapshot.expectedGoalsAway,
    expectedGoalsTotal: snapshot.expectedGoalsTotal,
    expectedGoalsTotalMin: snapshot.expectedGoalsTotalMin,
    expectedGoalsTotalMax: snapshot.expectedGoalsTotalMax,
    over2Prob: snapshot.over2Prob,
    over3Prob: snapshot.over3Prob,
    under2Prob: snapshot.under2Prob,
    bttsProb: snapshot.bttsProb,
    weakerTeamScoringProb: snapshot.weakerTeamScoringProb,
    confidence: snapshot.confidence,
    predictedOutcome: snapshot.predictedOutcome,
    inputSnapshot: {
      fixtureExternalId,
      asOf: snapshot.createdAt,
      homeTeamProviderId: 0,
      awayTeamProviderId: 0,
      leagueProviderId: 0,
      eloHome: 0,
      eloAway: 0,
      eloDiff: 0,
      form5HomePpg: null,
      form5AwayPpg: null,
      form5HomeVenuePpg: null,
      form5AwayVenuePpg: null,
      form10HomePpg: null,
      form10AwayPpg: null,
      h2hHomeWinRate: null,
      h2hGoalAvg: null,
      homeLeagueRank: null,
      awayLeagueRank: null,
      leaguePositionDiff: null,
      homeStandingPoints: null,
      awayStandingPoints: null,
      standingPointsDiff: null,
      homeRestDays: null,
      awayRestDays: null,
      homeGoalsForAvg: null,
      awayGoalsForAvg: null,
      homeGoalsAgainstAvg: null,
      awayGoalsAgainstAvg: null,
      homeXgForAvg: null,
      awayXgForAvg: null,
      homeXgAgainstAvg: null,
      awayXgAgainstAvg: null,
      homeInjuryImpact: null,
      awayInjuryImpact: null,
      homeTopScorersSidelined: 0,
      awayTopScorersSidelined: 0,
      lineupsState: "MISSING",
      hasXg: false,
      dataQuality: "PARTIAL",
    },
    createdAt: snapshot.createdAt,
    fromCache: true,
  });
}

export function resolveLivePhasePrediction(
  fixtureExternalId: number,
  delta: LiveProbabilityDeltaResponse | undefined,
  historicalPrediction: PrematchPredictionResult | LivePredictionResult | null
): PrematchPredictionResult | LivePredictionResult | null {
  if (delta?.prematchPrediction) {
    return predictionFromDeltaSnapshot(
      fixtureExternalId,
      delta.prematchPrediction
    );
  }

  return historicalPrediction;
}
