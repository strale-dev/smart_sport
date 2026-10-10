import { describe, expect, it } from "vitest";

import { resolveCronOutcome } from "@/lib/ingestion/cron-outcome";

describe("syncFixturesFuture outcome semantics", () => {
  it("fails cron when any fixture upsert errors occur", () => {
    expect(resolveCronOutcome({ failedCount: 3 })).toEqual({
      ok: false,
      degraded: true,
    });
  });

  it("succeeds when all upserts succeed", () => {
    expect(resolveCronOutcome({ failedCount: 0 })).toEqual({ ok: true });
  });

  it("treats time-budget stop with progress as degraded success", () => {
    expect(
      resolveCronOutcome({
        failedCount: 0,
        partialForTimeBudget: true,
      })
    ).toEqual({ ok: true, degraded: true });
  });
});
