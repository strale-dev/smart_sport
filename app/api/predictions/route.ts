import { NextResponse } from "next/server";

import { getTopPicksOfTheDay } from "@/lib/predictions/top-picks";

export async function GET() {
  try {
    const result = await getTopPicksOfTheDay();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/predictions]", error);
    return NextResponse.json(
      { error: "Failed to load top picks" },
      { status: 500 }
    );
  }
}
