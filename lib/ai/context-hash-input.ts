import { computeContextHash } from "@/lib/ai/hash";
import type { LiveAiContext, PrematchAiContext } from "@/types/ai";
import type {
  LiveFeatureVector,
  LivePredictionResult,
  PrematchPredictionResult,
} from "@/types/prediction";

export class AiContextIdentityError extends Error {
  readonly code: "FIXTURE_ID_MISMATCH" | "LIVE_SNAPSHOT_FIXTURE_MISMATCH";

  constructor(code: AiContextIdentityError["code"], message: string) {
    super(message);
    this.name = "AiContextIdentityError";
    this.code = code;
  }
}

export function assertPrematchPredictionMatchesFixture(
  fixtureExternalId: number,
  prediction: PrematchPredictionResult
): void {
  if (prediction.fixtureExternalId !== fixtureExternalId) {
    throw new AiContextIdentityError(
      "FIXTURE_ID_MISMATCH",
      `Prematch prediction fixture ${prediction.fixtureExternalId} does not match requested fixture ${fixtureExternalId}`
    );
  }

  const snapshotFixtureId = prediction.inputSnapshot?.fixtureExternalId;
  if (snapshotFixtureId != null && snapshotFixtureId !== fixtureExternalId) {
    throw new AiContextIdentityError(
      "FIXTURE_ID_MISMATCH",
      `Prematch input_snapshot fixture ${snapshotFixtureId} does not match requested fixture ${fixtureExternalId}`
    );
  }
}

export function assertLivePredictionMatchesFixture(
  fixtureExternalId: number,
  prediction: LivePredictionResult
): void {
  if (prediction.fixtureExternalId !== fixtureExternalId) {
    throw new AiContextIdentityError(
      "FIXTURE_ID_MISMATCH",
      `Live prediction fixture ${prediction.fixtureExternalId} does not match requested fixture ${fixtureExternalId}`
    );
  }

  if (prediction.inputSnapshot.fixtureExternalId !== fixtureExternalId) {
    throw new AiContextIdentityError(
      "LIVE_SNAPSHOT_FIXTURE_MISMATCH",
      `Live input_snapshot fixture ${prediction.inputSnapshot.fixtureExternalId} does not match requested fixture ${fixtureExternalId}`
    );
  }
}

/** Canonical live probability row identity (aligned with live prediction persistence). */
export function computeLiveSnapshotIdentity(
  snapshot: LiveFeatureVector
): string {
  return computeContextHash({
    fixtureExternalId: snapshot.fixtureExternalId,
    asOf: snapshot.asOf,
    minute: snapshot.minute,
    scoreHome: snapshot.scoreHome,
    scoreAway: snapshot.scoreAway,
    redCardsHome: snapshot.redCardsHome,
    redCardsAway: snapshot.redCardsAway,
    xgHome: snapshot.xgHome,
    xgAway: snapshot.xgAway,
    anchorWinProbabilities: snapshot.anchorWinProbabilities,
  });
}

export function buildPrematchContextHashInput(
  context: PrematchAiContext
): Record<string, unknown> {
  return {
    fixtureExternalId: context.fixtureExternalId,
    modelVersion: context.modelVersion,
    promptVersion: context.promptVersion,
    lineupsState: context.lineupsState,
    kickoffAt: context.kickoffAt,
    status: context.status,
    league: context.league,
    homeTeam: {
      externalId: context.homeTeam.externalId,
      isNational: context.homeTeam.isNational,
    },
    awayTeam: {
      externalId: context.awayTeam.externalId,
      isNational: context.awayTeam.isNational,
    },
    prediction: context.prediction,
    form: context.form,
    h2h: context.h2h,
    standings: context.standings,
    lineups: context.lineups,
    sidelined: context.sidelined,
    dataAvailable: context.dataAvailable,
    dataMissing: context.dataMissing,
    analyticsCompact: context.analyticsCompact,
    referee: context.referee,
    round: context.round,
    historicalContext: context.historicalContext,
    predictionFeatures: context.predictionFeatures,
  };
}

export function buildLiveContextHashInput(
  context: LiveAiContext,
  prediction: LivePredictionResult
): Record<string, unknown> {
  return {
    fixtureExternalId: context.fixtureExternalId,
    modelVersion: context.modelVersion,
    promptVersion: context.promptVersion,
    predictionId: prediction.predictionId,
    liveSnapshotId: computeLiveSnapshotIdentity(prediction.inputSnapshot),
    minute: context.minute,
    score: context.score,
    league: context.league,
    homeTeam: {
      externalId: context.homeTeam.externalId,
      isNational: context.homeTeam.isNational,
    },
    awayTeam: {
      externalId: context.awayTeam.externalId,
      isNational: context.awayTeam.isNational,
    },
    meaningfulTriggers: context.meaningfulTriggers,
    prediction: context.prediction,
    liveStats: context.liveStats,
    prematchReference: context.prematchReference,
    lineupsState: context.lineupsState,
    sidelined: context.sidelined,
    form: context.form,
    standings: context.standings,
    lineups: context.lineups,
    h2h: context.h2h,
    dataAvailable: context.dataAvailable,
    dataMissing: context.dataMissing,
    referee: context.referee,
    round: context.round,
  };
}

export function hashPrematchContext(context: PrematchAiContext): string {
  return computeContextHash(buildPrematchContextHashInput(context));
}

export function hashLiveContext(
  context: LiveAiContext,
  prediction: LivePredictionResult
): string {
  return computeContextHash(buildLiveContextHashInput(context, prediction));
}
