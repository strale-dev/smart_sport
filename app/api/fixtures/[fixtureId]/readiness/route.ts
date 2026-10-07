import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  evaluateAndPersistFixtureReadiness,
  readPersistedFixtureReadiness,
} from "@/lib/fixtures/readiness";

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
  const { fixtureId: rawFixtureId } = await context.params;
  const fixtureId = parseFixtureId(rawFixtureId);

  if (!fixtureId) {
    return NextResponse.json(
      { ok: false, error: "INVALID_FIXTURE_ID" },
      { status: 400 }
    );
  }

  let snapshot = await readPersistedFixtureReadiness(fixtureId);
  if (!snapshot?.gates) {
    snapshot = await evaluateAndPersistFixtureReadiness({
      providerId: fixtureId,
    });
  }

  if (!snapshot) {
    return NextResponse.json(
      { ok: false, error: "FIXTURE_NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, readiness: snapshot }, { status: 200 });
}
