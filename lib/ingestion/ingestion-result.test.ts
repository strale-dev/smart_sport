import { describe, expect, it } from "vitest";

import {
  aggregateIngestionOutcomes,
  classifyEmptyProviderPayload,
  dependencyRecordFromFetch,
  shouldSkipMatchDetailIngestForStatus,
} from "@/lib/ingestion/ingestion-result";

describe("shouldSkipMatchDetailIngestForStatus", () => {
  it("skips postponed and cancelled fixtures", () => {
    expect(shouldSkipMatchDetailIngestForStatus("PST")).toEqual({
      skip: true,
      reason: "fixture_status_pst",
    });
    expect(shouldSkipMatchDetailIngestForStatus("CANC")).toEqual({
      skip: true,
      reason: "fixture_status_canc",
    });
  });

  it("allows finished fixtures", () => {
    expect(shouldSkipMatchDetailIngestForStatus("FT")).toEqual({ skip: false });
  });
});

describe("classifyEmptyProviderPayload", () => {
  it("marks pre-match events as not yet available", () => {
    expect(
      classifyEmptyProviderPayload({
        dependency: "events",
        fixtureStatus: "NS",
        kickoffAt: "2026-10-10T15:00:00.000Z",
      })
    ).toBe("NOT_YET_AVAILABLE");
  });

  it("marks finished empty statistics as provider returned no data", () => {
    expect(
      classifyEmptyProviderPayload({
        dependency: "statistics",
        fixtureStatus: "FT",
        kickoffAt: "2026-10-01T15:00:00.000Z",
      })
    ).toBe("PROVIDER_RETURNED_NO_DATA");
  });
});

describe("aggregateIngestionOutcomes", () => {
  it("returns PARTIAL when one dependency succeeds and one fails retryably", () => {
    const aggregate = aggregateIngestionOutcomes([
      dependencyRecordFromFetch({
        dependency: "events",
        fixtureStatus: "FT",
        kickoffAt: "2026-10-01T15:00:00.000Z",
        supported: true,
        fetchOutcome: "SUCCESS",
        rowCount: 3,
      }),
      {
        outcome: "RETRYABLE_FAILURE",
        reason: "rate limit",
        fetchedAt: new Date().toISOString(),
        rowCount: 0,
      },
    ]);
    expect(aggregate).toBe("PARTIAL");
  });

  it("returns RETRYABLE_FAILURE when all dependencies failed retryably", () => {
    const aggregate = aggregateIngestionOutcomes([
      {
        outcome: "RETRYABLE_FAILURE",
        reason: "rate limit",
        fetchedAt: new Date().toISOString(),
      },
    ]);
    expect(aggregate).toBe("RETRYABLE_FAILURE");
  });
});
