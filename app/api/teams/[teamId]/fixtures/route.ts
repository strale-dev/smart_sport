import { NextResponse } from "next/server";

import { parseProviderId } from "@/lib/fixtures/ids";
import { getFixturesForTeam } from "@/lib/services/footballService";
import { parseTeamFixturesSearchParams } from "@/lib/teams/fixtures-query";

type RouteContext = {
  params: Promise<{ teamId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { teamId: teamIdParam } = await context.params;
  const teamProviderId = parseProviderId(teamIdParam);

  if (teamProviderId == null) {
    return NextResponse.json({ error: "Invalid team id" }, { status: 400 });
  }

  const url = new URL(request.url);
  const params = parseTeamFixturesSearchParams(url.searchParams);
  const { data, meta } = await getFixturesForTeam(teamProviderId, params);

  return NextResponse.json({
    fixtures: data,
    meta,
    pagination: {
      limit: params.limit,
      offset: params.offset,
      count: data.length,
    },
  });
}
