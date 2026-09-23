import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  formatApiFootballFailureReason,
  isOptionalProviderFailure,
} from "@/lib/api-football/safe-call";
import { verifyInternalLiveRequest } from "@/lib/live/internal-auth";
import { runLiveCenterPollChainTick } from "@/lib/live/poller";

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

  try {
    const result = await runLiveCenterPollChainTick();
    return NextResponse.json(result);
  } catch (error) {
    if (isOptionalProviderFailure(error)) {
      console.warn(
        `[live/poll-center-tick] provider unavailable — ${formatApiFootballFailureReason(error)}`
      );
      return NextResponse.json({
        ok: false,
        reason: "provider_unavailable",
      });
    }

    console.error("[live/poll-center-tick] unhandled error", error);
    return NextResponse.json({
      ok: false,
      reason: "internal_tick_error",
    });
  }
}
