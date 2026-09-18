import * as Sentry from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { LiveProbabilityDeltaResponse } from "@/lib/live/live-probability-delta";
import {
  getActiveModelVersion,
  mapLivePredictionRowToResult,
  mapPredictionRowToResult,
  readLatestLivePrediction,
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
    const [prematchRow, liveRow] = await Promise.all([
      readLatestPrematchPrediction(fixture.id),
      readLatestLivePrediction(fixture.id),
    ]);

    const prematchResult = prematchRow
      ? mapPredictionRowToResult(
          prematchRow,
          fixtureExternalId,
          modelVersion.version,
          true
        )
      : null;

    const body: LiveProbabilityDeltaResponse = {
      prematch: prematchResult?.winProbabilities ?? null,
      live: liveRow
        ? mapLivePredictionRowToResult(
            liveRow,
            fixtureExternalId,
            modelVersion.version,
            true
          ).winProbabilities
        : null,
      liveMinute: liveRow?.minute ?? null,
      prematchPrediction: prematchResult
        ? {
            winProbabilities: prematchResult.winProbabilities,
            expectedGoalsHome: prematchResult.expectedGoalsHome,
            expectedGoalsAway: prematchResult.expectedGoalsAway,
            expectedGoalsTotalMin: prematchResult.expectedGoalsTotalMin,
            expectedGoalsTotalMax: prematchResult.expectedGoalsTotalMax,
            bttsProb: prematchResult.bttsProb,
            weakerTeamScoringProb: prematchResult.weakerTeamScoringProb,
            confidence: prematchResult.confidence,
            predictedOutcome: prematchResult.predictedOutcome,
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
