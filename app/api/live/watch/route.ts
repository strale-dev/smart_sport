import { NextResponse } from "next/server";

import { isLivePollingEnabled } from "@/lib/env";
import { ensureWorkerRunning } from "@/lib/live/coordinator";
import { parseLiveWatchBody, toWatchRegistration } from "@/lib/live/live-api";
import { registerLiveWatch } from "@/lib/live/viewers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isLivePollingEnabled()) {
    return NextResponse.json(
      { ok: false, error: "live_polling_disabled" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const parsed = parseLiveWatchBody(body);
  if ("error" in parsed) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: 400 }
    );
  }

  const registration = toWatchRegistration(parsed);
  const watch = await registerLiveWatch(registration);
  const worker = await ensureWorkerRunning(
    registration.surface,
    registration.fixtureProviderId
  );

  return NextResponse.json({
    ok: true,
    watchToken: watch.watchToken,
    expiresInSec: watch.expiresInSec,
    worker,
  });
}
