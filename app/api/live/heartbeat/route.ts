import { NextResponse } from "next/server";

import { parseWatchTokenBody } from "@/lib/live/live-api";
import { heartbeatLiveWatch } from "@/lib/live/viewers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const parsed = parseWatchTokenBody(body);
  if ("error" in parsed) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: 400 }
    );
  }

  const alive = await heartbeatLiveWatch(parsed.watchToken);
  if (!alive) {
    return NextResponse.json(
      { ok: false, error: "watch_token_expired" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
