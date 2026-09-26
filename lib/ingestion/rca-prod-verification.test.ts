import { describe, expect, it } from "vitest";

import {
  evaluateRcaProdVerification,
  isAcceptableCronProbeStatus,
  type RcaProdVerificationInput,
} from "@/lib/ingestion/rca-prod-verification";

const baseInput: RcaProdVerificationInput = {
  productionSiteUrl: "https://scorence.app",
  coverage: {
    upcoming7d: 10,
    eligibleUpcoming: 2,
    upcomingWithPrematchInsight: 1,
    stuckRunningSyncRuns: 0,
  },
  cronProbes: [
    { path: "/api/cron/warm-ai-prematch", httpStatus: 401 },
    { path: "/api/cron/sync-fixtures-future", httpStatus: 401 },
  ],
  fixtureWalk: [
    {
      providerId: 1606670,
      status: "FT",
      kickoffAt: null,
      aiEligible: true,
      hasPrematchInsight: true,
      hasPrematchPrediction: true,
      bucket: "working",
    },
    {
      providerId: 1563768,
      status: "NS",
      kickoffAt: "2026-09-27T15:00:00.000Z",
      aiEligible: false,
      hasPrematchInsight: false,
      hasPrematchPrediction: false,
      bucket: "broken",
    },
  ],
};

describe("isAcceptableCronProbeStatus", () => {
  it("accepts 401 and 503", () => {
    expect(isAcceptableCronProbeStatus(401)).toBe(true);
    expect(isAcceptableCronProbeStatus(503)).toBe(true);
    expect(isAcceptableCronProbeStatus(404)).toBe(false);
  });
});

describe("evaluateRcaProdVerification", () => {
  it("passes when cron probes and sync runs are healthy", () => {
    const result = evaluateRcaProdVerification(baseInput);
    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it("fails on stuck sync runs", () => {
    const result = evaluateRcaProdVerification({
      ...baseInput,
      coverage: { ...baseInput.coverage, stuckRunningSyncRuns: 1 },
    });
    expect(result.ok).toBe(false);
    expect(result.failures[0]).toMatch(/stuck in running/);
  });

  it("fails when production cron route is missing", () => {
    const result = evaluateRcaProdVerification({
      ...baseInput,
      cronProbes: [{ path: "/api/cron/sync-fixtures-future", httpStatus: 404 }],
    });
    expect(result.ok).toBe(false);
    expect(result.failures[0]).toMatch(/404/);
  });

  it("warns when no fixtures are aiEligible", () => {
    const result = evaluateRcaProdVerification({
      ...baseInput,
      coverage: { ...baseInput.coverage, eligibleUpcoming: 0 },
    });
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.includes("aiEligible"))).toBe(true);
  });
});
