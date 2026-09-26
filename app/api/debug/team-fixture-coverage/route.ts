import { NextResponse } from "next/server";

import { readTeamFixtureCoverageFromDb } from "@/lib/ingestion/db-read";
import { parseProviderId } from "@/lib/fixtures/ids";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const teamProviderId = parseProviderId(url.searchParams.get("teamId") ?? "");

  if (teamProviderId == null) {
    return NextResponse.json(
      { error: "Missing or invalid teamId" },
      { status: 400 }
    );
  }

  const coverage = await readTeamFixtureCoverageFromDb(teamProviderId);
  if (!coverage) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json(coverage);
}
