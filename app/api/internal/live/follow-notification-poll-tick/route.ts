import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { runFollowNotificationPollChainTick } from "@/lib/live/follow-notification-poller";
import { verifyInternalLiveRequest } from "@/lib/live/internal-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = verifyInternalLiveRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.message },
      { status: auth.status }
    );
  }

  const fixtureProviderIdRaw =
    request.nextUrl.searchParams.get("fixtureProviderId");
  const fixtureProviderId = Number.parseInt(fixtureProviderIdRaw ?? "", 10);

  if (!Number.isFinite(fixtureProviderId) || fixtureProviderId <= 0) {
    return NextResponse.json(
      { ok: false, error: "invalid_fixtureProviderId" },
      { status: 400 }
    );
  }

  const result = await runFollowNotificationPollChainTick(fixtureProviderId);
  return NextResponse.json(result);
}
