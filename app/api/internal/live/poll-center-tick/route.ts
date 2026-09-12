import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

  const result = await runLiveCenterPollChainTick();
  return NextResponse.json(result);
}
