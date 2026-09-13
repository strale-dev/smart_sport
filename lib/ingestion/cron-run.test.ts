import { describe, expect, it } from "vitest";

import { cronJobHttpStatus } from "@/lib/ingestion/cron-run";

describe("cronJobHttpStatus", () => {
  it("returns 200 for successful jobs", () => {
    expect(cronJobHttpStatus({ ok: true })).toBe(200);
  });

  it("returns 200 for skipped jobs even when ok is false", () => {
    expect(cronJobHttpStatus({ ok: false, skipped: true })).toBe(200);
  });

  it("returns 500 for failed jobs that were not skipped", () => {
    expect(cronJobHttpStatus({ ok: false })).toBe(500);
  });
});
