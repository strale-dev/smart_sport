import type { NextRequest } from "next/server";

import { verifyCronRequest } from "@/lib/ingestion/cron-auth";

export function verifyInternalLiveRequest(
  request: NextRequest
): { ok: true } | { ok: false; status: number; message: string } {
  return verifyCronRequest(request.headers.get("authorization"));
}
