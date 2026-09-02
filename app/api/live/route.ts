import { NextResponse } from "next/server";

import {
  getLiveCenterData,
  parseLiveCenterParams,
} from "@/lib/services/liveService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = parseLiveCenterParams({
    league: searchParams.get("league") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    page: searchParams.get("page") ?? undefined,
  });

  const data = await getLiveCenterData(params);

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
