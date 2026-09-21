import { NextResponse, type NextRequest } from "next/server";

import { resolveViewerTimezone } from "@/lib/datetime/viewer-timezone.server";
import { parseFixturesParams } from "@/lib/fixtures/url";
import { getFixturesData } from "@/lib/services/fixturesService";
import { getCurrentUser } from "@/lib/supabase/user";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const timeZone = await resolveViewerTimezone(user?.id ?? null);
  const params = parseFixturesParams({
    league: request.nextUrl.searchParams.get("league") ?? undefined,
    country: request.nextUrl.searchParams.get("country") ?? undefined,
    q: request.nextUrl.searchParams.get("q") ?? undefined,
  });

  const data = await getFixturesData(params, timeZone);

  return NextResponse.json(data);
}
