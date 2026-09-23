import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  formatApiFootballFailureReason,
  isOptionalProviderFailure,
} from "@/lib/api-football/safe-call";
import { verifyInternalLiveRequest } from "@/lib/live/internal-auth";
import { runFixturePollChainTick } from "@/lib/live/poller";

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

  try {
    const result = await runFixturePollChainTick(fixtureProviderId);
    return NextResponse.json(result);
  } catch (error) {
    if (isOptionalProviderFailure(error)) {
      console.warn(
        `[live/poll-tick] provider unavailable for fixture ${fixtureProviderId} — ${formatApiFootballFailureReason(error)}`
      );
      return NextResponse.json({
        ok: false,
        fixtureProviderId,
        reason: "provider_unavailable",
      });
    }

    console.error(
      `[live/poll-tick] unhandled error for fixture ${fixtureProviderId}`,
      error
    );
    return NextResponse.json({
      ok: false,
      fixtureProviderId,
      reason: "internal_tick_error",
    });
  }
}
