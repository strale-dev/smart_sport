import { NextResponse } from "next/server";

import { getDashboardLiveFixtures } from "@/lib/services/dashboardLive";

export const dynamic = "force-dynamic";

export async function GET() {
  const live = await getDashboardLiveFixtures();

  return NextResponse.json(
    { live },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
