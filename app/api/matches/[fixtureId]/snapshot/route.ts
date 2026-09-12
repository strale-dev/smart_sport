import { NextResponse } from "next/server";

import { parseFixtureId } from "@/lib/fixtures/ids";
import {
  getFixtureById,
  getFixtureEvents,
  getFixtureStatistics,
} from "@/lib/services/footballService";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ fixtureId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { fixtureId: fixtureIdRaw } = await context.params;
  const fixtureId = parseFixtureId(fixtureIdRaw);

  if (fixtureId == null) {
    return NextResponse.json({ error: "invalid_fixture_id" }, { status: 400 });
  }

  const [{ data: fixture }, { data: events }, { data: statistics }] =
    await Promise.all([
      getFixtureById(fixtureId),
      getFixtureEvents(fixtureId),
      getFixtureStatistics(fixtureId),
    ]);

  if (!fixture) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      fixture,
      events,
      statistics,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
