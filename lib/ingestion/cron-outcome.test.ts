import { describe, expect, it } from "vitest";

import { resolveCronOutcome } from "@/lib/ingestion/cron-outcome";

describe("resolveCronOutcome", () => {
  it("marks skipped jobs as ok", () => {
    expect(resolveCronOutcome({ skipped: true })).toEqual({ ok: true });
  });

  it("fails when there are failed units", () => {
    expect(resolveCronOutcome({ failedCount: 2 })).toEqual({
      ok: false,
      degraded: true,
    });
  });

  it("allows time-budget partial success with degraded flag", () => {
    expect(
      resolveCronOutcome({
        failedCount: 0,
        partialForTimeBudget: true,
      })
    ).toEqual({ ok: true, degraded: true });
  });

  it("succeeds cleanly when no failures", () => {
    expect(resolveCronOutcome({ failedCount: 0 })).toEqual({ ok: true });
  });
});
