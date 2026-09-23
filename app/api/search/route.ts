import { NextResponse, type NextRequest } from "next/server";

import { MAX_SEARCH_QUERY_LENGTH } from "@/lib/search/normalize";
import type { GlobalSearchMode } from "@/lib/search/types";
import { globalSearch } from "@/lib/services/searchService";

export const dynamic = "force-dynamic";

function parseMode(value: string | null): GlobalSearchMode {
  return value === "full" ? "full" : "palette";
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const mode = parseMode(request.nextUrl.searchParams.get("mode"));

  if (q.trim().length > MAX_SEARCH_QUERY_LENGTH) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  try {
    const data = await globalSearch(q, mode);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[search] failed", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
