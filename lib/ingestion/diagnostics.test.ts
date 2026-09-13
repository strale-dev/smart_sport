import { describe, expect, it } from "vitest";

import {
  buildRecommendedCommands,
  computeStrictWouldFail,
  deriveIngestionGaps,
  planIngestDevQaSteps,
  type DeriveGapsInput,
  type FixtureIngestionReport,
  type IngestionEnvSummary,
  type IngestionGlobalCounts,
} from "@/lib/ingestion/diagnostics";
import { PINNED_MATCH_QA_FIXTURES } from "@/lib/qa/pinned-fixture-ids";

function baseEnv(): IngestionEnvSummary {
  return {
    appEnv: "development",
    ingestOnly: true,
    hasApiFootballKey: true,
    hasSupabaseServiceRole: true,
    hasRedis: true,
    apiFootballDailyLimit: 100,
  };
}

function baseCounts(
  overrides: Partial<IngestionGlobalCounts> = {}
): IngestionGlobalCounts {
  return {
    leagues: 7,
    seasons: 7,
    fixtures: 100,
    standings: 0,
    fixtureEvents: 50,
    ...overrides,
  };
}

function pinnedFtReport(
  overrides: Partial<FixtureIngestionReport> = {}
): FixtureIngestionReport {
  return {
    providerId: PINNED_MATCH_QA_FIXTURES.ftWithXg,
    label: "ftWithXg",
    inDatabase: true,
    status: "FT",
    statRows: 2,
    eventRows: 5,
    lineupRows: 2,
    matchPath: `/matches/${PINNED_MATCH_QA_FIXTURES.ftWithXg}`,
    overviewRenderMode: "finished",
    overviewExpectsDbData: true,
    overviewHasData: true,
    ...overrides,
  };
}

describe("deriveIngestionGaps", () => {
  it("flags empty static metadata and missing fixtures today", () => {
    const input: DeriveGapsInput = {
      env: baseEnv(),
      globalCounts: baseCounts({ leagues: 0, seasons: 0 }),
      fixturesTodayUtc: { count: 0, sampleProviderIds: [] },
      pinnedReports: [pinnedFtReport()],
    };

    const gaps = deriveIngestionGaps(input);
    expect(gaps.map((gap) => gap.id)).toEqual([
      "missing_static_metadata",
      "missing_fixtures_today",
    ]);
  });

  it("flags pinned FT missing overview data", () => {
    const input: DeriveGapsInput = {
      env: baseEnv(),
      globalCounts: baseCounts(),
      fixturesTodayUtc: { count: 3, sampleProviderIds: [1] },
      pinnedReports: [
        pinnedFtReport({
          statRows: 0,
          eventRows: 0,
          overviewHasData: false,
        }),
      ],
    };

    const gaps = deriveIngestionGaps(input);
    expect(
      gaps.some((gap) => gap.id === "pinned_ft_missing_overview_data")
    ).toBe(true);
  });
});

describe("buildRecommendedCommands", () => {
  it("includes bootstrap when pinned FT lacks overview data", () => {
    const commands = buildRecommendedCommands([
      {
        id: "pinned_ft_missing_overview_data",
        message: "x",
        severity: "error",
      },
    ]);

    expect(
      commands.some((cmd) => cmd.includes("bootstrap:match-details"))
    ).toBe(true);
    expect(commands.some((cmd) => cmd.includes("ingest:dev-qa"))).toBe(true);
  });
});

describe("computeStrictWouldFail", () => {
  it("fails when fixtures today missing", () => {
    expect(
      computeStrictWouldFail({ count: 0, sampleProviderIds: [] }, [
        pinnedFtReport(),
      ])
    ).toBe(true);
  });

  it("passes when pinned FT has overview data", () => {
    expect(
      computeStrictWouldFail({ count: 2, sampleProviderIds: [1] }, [
        pinnedFtReport(),
      ])
    ).toBe(false);
  });
});

describe("planIngestDevQaSteps", () => {
  it("runs full chain on force", () => {
    expect(
      planIngestDevQaSteps({
        globalCounts: baseCounts(),
        fixturesTodayUtc: { count: 5, sampleProviderIds: [] },
        pinnedReports: [pinnedFtReport()],
        force: true,
        skipStatic: false,
        skipMatchDetails: false,
      })
    ).toEqual(["static", "fixtures", "match_details"]);
  });

  it("skips steps when data already present", () => {
    expect(
      planIngestDevQaSteps({
        globalCounts: baseCounts(),
        fixturesTodayUtc: { count: 5, sampleProviderIds: [] },
        pinnedReports: [pinnedFtReport()],
        force: false,
        skipStatic: false,
        skipMatchDetails: false,
      })
    ).toEqual([]);
  });

  it("queues match_details when pinned FT lacks stats/events", () => {
    expect(
      planIngestDevQaSteps({
        globalCounts: baseCounts(),
        fixturesTodayUtc: { count: 5, sampleProviderIds: [] },
        pinnedReports: [
          pinnedFtReport({
            statRows: 0,
            eventRows: 0,
            overviewHasData: false,
          }),
        ],
        force: false,
        skipStatic: false,
        skipMatchDetails: false,
      })
    ).toEqual(["match_details"]);
  });
});
