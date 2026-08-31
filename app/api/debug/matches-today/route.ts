import { NextResponse } from "next/server";

import { getServerEnv } from "@/lib/env.server";
import * as footballService from "@/lib/services/footballService";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getServerEnv();

  if (env.NEXT_PUBLIC_APP_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const result = await footballService.getMatchesForDate(today);

  return NextResponse.json({
    ok: true,
    date: today,
    count: result.data.length,
    meta: result.meta,
    data: result.data,
  });
}
