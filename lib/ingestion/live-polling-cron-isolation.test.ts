import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    isLivePollingEnabled: () => false,
  };
});

import { ingestLiveCenterTick } from "@/lib/live/ingest-live-center-tick";

describe("LIVE_POLLING_ENABLED cron isolation (RCA Phase 3)", () => {
  it("sync-fixtures-today does not gate on live polling", () => {
    const src = readFileSync("lib/ingestion/sync-fixtures-today.ts", "utf8");
    expect(src).not.toMatch(/isLivePollingEnabled/);
  });

  it("ingestLiveCenterTick skips only live-center when polling is off", async () => {
    const result = await ingestLiveCenterTick();
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("live_polling_disabled");
    expect(result.ok).toBe(true);
  });
});
