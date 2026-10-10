import * as Sentry from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { LiveProbabilityDeltaResponse } from "@/lib/live/live-probability-delta";
import {
  getActiveModelVersion,
  mapLivePredictionRowToResult,
  mapPrematchPredictionRowForFixture,
  readLatestLivePrediction,
  readOfficialPrematchPrediction,
  readLatestPrematchPrediction,
  resolveFixtureUuidByExternalId,
} from "@/lib/predictions/db";

type RouteContext = {
  params: Promise<{ fixtureId: string }>;
};

function parseFixtureId(raw: string): number | null {
  const fixtureId = Number.parseInt(raw, 10);
  if (!Number.isFinite(fixtureId) || fixtureId <= 0) {
    return null;
  }

  return fixtureId;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { fixtureId: rawFixtureId } = await context.params;
    const fixtureExternalId = parseFixtureId(rawFixtureId);

    if (!fixtureExternalId) {
      return NextResponse.json(
        { ok: false, error: "INVALID_FIXTURE_ID" },
        { status: 400 }
      );
    }

    const fixture = await resolveFixtureUuidByExternalId(fixtureExternalId);
    if (!fixture) {
      return NextResponse.json(
        { ok: false, error: "FIXTURE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const modelVersion = await getActiveModelVersion();
    const kickoffReached = Date.now() >= new Date(fixture.kickoff_at).getTime();
    const [prematchRow, liveRow] = await Promise.all([
      kickoffReached
        ? readOfficialPrematchPrediction(fixture.id, fixture.kickoff_at)
        : readLatestPrematchPrediction(fixture.id),
      readLatestLivePrediction(fixture.id),
    ]);

    const prematchResult = prematchRow
      ? await mapPrematchPredictionRowForFixture(
          prematchRow,
          fixtureExternalId,
          modelVersion.version,
          true
        )
      : null;

    const liveResult = liveRow
      ? mapLivePredictionRowToResult(
          liveRow,
          fixtureExternalId,
          modelVersion.version,
          true
        )
      : null;

    const body: LiveProbabilityDeltaResponse = {
      prematch: prematchResult?.winProbabilities ?? null,
      prematchKind: prematchResult ? "PRE_MATCH_PROBABILITY" : null,
      live: liveResult?.winProbabilities ?? null,
      liveKind: liveResult ? "LIVE_PROBABILITY" : null,
      liveMinute: liveRow?.minute ?? null,
      prematchPrediction: prematchResult
        ? {
            presentationKind: "PRE_MATCH_PROBABILITY" as const,
            modelTier: prematchResult.modelTier,
            expectedGoalsAvailable: prematchResult.expectedGoalsAvailable,
            winProbabilities: prematchResult.winProbabilities,
            expectedGoalsHome: prematchResult.expectedGoalsHome,
            expectedGoalsAway: prematchResult.expectedGoalsAway,
            expectedGoalsTotal: prematchResult.expectedGoalsTotal,
            expectedGoalsTotalMin: prematchResult.expectedGoalsTotalMin,
            expectedGoalsTotalMax: prematchResult.expectedGoalsTotalMax,
            over2Prob: prematchResult.over2Prob,
            over3Prob: prematchResult.over3Prob,
            under2Prob: prematchResult.under2Prob,
            bttsProb: prematchResult.bttsProb,
            weakerTeamScoringProb: prematchResult.weakerTeamScoringProb,
            confidence: prematchResult.confidence,
            predictedOutcome: prematchResult.predictedOutcome,
            predictionId: prematchResult.predictionId,
            modelVersion: prematchResult.modelVersion,
            createdAt: prematchResult.createdAt,
          }
        : null,
    };

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    Sentry.captureException(error);
    console.error("[api/matches/live-probability-delta GET]", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
