import * as Sentry from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { resolveLiveProbabilityDelta } from "@/lib/live/resolve-live-probability-delta";

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

    const resolved = await resolveLiveProbabilityDelta(fixtureExternalId);
    if (!resolved.ok) {
      return NextResponse.json(
        { ok: false, error: resolved.error },
        { status: resolved.error === "FIXTURE_NOT_FOUND" ? 404 : 400 }
      );
    }

    return NextResponse.json(resolved.body, { status: 200 });
  } catch (error) {
    Sentry.captureException(error);
    console.error("[api/matches/live-probability-delta GET]", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
