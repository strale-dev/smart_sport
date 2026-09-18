import { afterEach, describe, expect, it, vi } from "vitest";

import * as liveFixtureMeta from "@/lib/live/live-fixture-meta";
import * as dbRead from "@/lib/ingestion/db-read";
import * as footballService from "@/lib/services/footballService";
import {
  getLiveCenterData,
  parseLiveCenterParams,
} from "@/lib/services/liveService";
import type { Fixture } from "@/types/domain";

function makeFixture(overrides: Partial<Fixture> = {}): Fixture {
  const kickoffAt = overrides.kickoffAt ?? "2026-09-01T15:00:00.000Z";
  return {
    externalId: 1,
    league: {
      externalId: 39,
      name: "Premier League",
      type: "League",
      country: null,
      logoUrl: null,
    },
    seasonYear: 2025,
    homeTeam: {
      externalId: 100,
      name: "Home FC",
      code: "HOM",
      logoUrl: null,
      isNational: false,
    },
    awayTeam: {
      externalId: 200,
      name: "Away FC",
      code: "AWY",
      logoUrl: null,
      isNational: false,
    },
    kickoffAt,
    status: "1H",
    minute: 23,
    score: {
      home: 1,
      away: 0,
      halftimeHome: null,
      halftimeAway: null,
      fulltimeHome: null,
      fulltimeAway: null,
      extratimeHome: null,
      extratimeAway: null,
      penaltyHome: null,
      penaltyAway: null,
    },
    venue: null,
    referee: null,
    round: null,
    liveClock: {
      statusExtraMinute: null,
      lastProviderSyncAt: kickoffAt,
      periodFirstStartAt: kickoffAt,
      periodSecondStartAt: null,
    },
    ...overrides,
  };
}

function mockImportanceContext() {
  vi.spyOn(
    liveFixtureMeta,
    "attachAiUpdatedAtToFixturesSafe"
  ).mockImplementation(async (fixtures) =>
    fixtures.map((fixture) => ({ ...fixture, aiUpdatedAt: null }))
  );
  vi.spyOn(dbRead, "readLeaguePrestigeMap").mockResolvedValue(
    new Map([
      [39, 95],
      [2, 100],
      [286, 55],
    ])
  );
  vi.spyOn(dbRead, "readStandingsRanksForFixtures").mockResolvedValue(
    new Map()
  );
  vi.spyOn(dbRead, "readH2hInterestForFixtures").mockResolvedValue(new Map());
}

describe("parseLiveCenterParams", () => {
  it("parses valid league, status, and page params", () => {
    expect(
      parseLiveCenterParams({
        league: "39",
        status: "HT",
        page: "2",
      })
    ).toEqual({
      league: 39,
      status: "HT",
      page: 2,
    });
  });

  it("ignores invalid status and page values", () => {
    expect(
      parseLiveCenterParams({
        league: "abc",
        status: "FT",
        page: "0",
      })
    ).toEqual({
      league: undefined,
      status: undefined,
      page: 1,
    });
  });
});

describe("getLiveCenterData", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("filters live fixtures by league and status", async () => {
    mockImportanceContext();

    vi.spyOn(footballService, "listLiveFixtures").mockResolvedValue({
      data: [
        makeFixture({ externalId: 1, status: "1H" }),
        makeFixture({
          externalId: 2,
          status: "HT",
          league: {
            externalId: 140,
            name: "La Liga",
            type: "League",
            country: null,
            logoUrl: null,
          },
        }),
      ],
      meta: { cached: false, stale: false },
    });
    vi.spyOn(footballService, "getMatchesForDate").mockResolvedValue({
      data: [],
      meta: { cached: false, stale: false },
    });

    const data = await getLiveCenterData(
      { league: 39, status: "1H" },
      new Date("2026-09-01T15:30:00.000Z")
    );

    expect(data.fixtures).toHaveLength(1);
    expect(data.fixtures[0]?.externalId).toBe(1);
    expect(data.filters).toEqual({ league: 39, status: "1H" });
  });

  it("paginates live fixtures at 20 per page", async () => {
    mockImportanceContext();

    const fixtures = Array.from({ length: 25 }, (_, index) =>
      makeFixture({
        externalId: index + 1,
        kickoffAt: "2026-09-01T15:00:00.000Z",
      })
    );

    vi.spyOn(footballService, "listLiveFixtures").mockResolvedValue({
      data: fixtures,
      meta: { cached: false, stale: false },
    });
    vi.spyOn(footballService, "getMatchesForDate").mockResolvedValue({
      data: [],
      meta: { cached: false, stale: false },
    });

    const pageOne = await getLiveCenterData(
      { page: 1 },
      new Date("2026-09-01T16:00:00.000Z")
    );
    const pageTwo = await getLiveCenterData(
      { page: 2 },
      new Date("2026-09-01T16:00:00.000Z")
    );

    expect(pageOne.fixtures).toHaveLength(20);
    expect(pageOne.totalCount).toBe(25);
    expect(pageOne.totalPages).toBe(2);
    expect(pageTwo.fixtures).toHaveLength(5);
    expect(pageTwo.page).toBe(2);
  });

  it("sorts by importance and then earlier kickoff", async () => {
    mockImportanceContext();

    vi.spyOn(footballService, "listLiveFixtures").mockResolvedValue({
      data: [
        makeFixture({
          externalId: 1,
          league: {
            externalId: 286,
            name: "Super Liga",
            type: "League",
            country: null,
            logoUrl: null,
          },
          kickoffAt: "2026-09-01T12:00:00.000Z",
        }),
        makeFixture({
          externalId: 2,
          league: {
            externalId: 2,
            name: "Champions League",
            type: "Cup",
            country: null,
            logoUrl: null,
          },
          kickoffAt: "2026-09-01T18:00:00.000Z",
        }),
      ],
      meta: { cached: false, stale: false },
    });
    vi.spyOn(footballService, "getMatchesForDate").mockResolvedValue({
      data: [],
      meta: { cached: false, stale: false },
    });

    const data = await getLiveCenterData(
      {},
      new Date("2026-09-01T15:00:00.000Z")
    );

    expect(data.fixtures.map((fixture) => fixture.externalId)).toEqual([2, 1]);
  });

  it("includes live fixtures from today's date when the live list is empty", async () => {
    mockImportanceContext();

    vi.spyOn(footballService, "listLiveFixtures").mockResolvedValue({
      data: [],
      meta: { cached: false, stale: false },
    });
    vi.spyOn(footballService, "getMatchesForDate").mockResolvedValue({
      data: [
        makeFixture({
          externalId: 99,
          status: "2H",
          kickoffAt: "2026-09-13T12:00:00.000Z",
        }),
        makeFixture({
          externalId: 100,
          status: "NS",
          kickoffAt: "2026-09-13T18:00:00.000Z",
        }),
      ],
      meta: { cached: false, stale: false },
    });

    const data = await getLiveCenterData(
      {},
      new Date("2026-09-13T14:00:00.000Z")
    );

    expect(data.fixtures).toHaveLength(1);
    expect(data.fixtures[0]?.externalId).toBe(99);
  });

  it("returns upcoming fixtures starting within the next 3 hours", async () => {
    mockImportanceContext();
    const now = new Date("2026-09-01T15:00:00.000Z");

    vi.spyOn(footballService, "listLiveFixtures").mockResolvedValue({
      data: [],
      meta: { cached: false, stale: false },
    });
    vi.spyOn(footballService, "getMatchesForDate").mockResolvedValue({
      data: [
        makeFixture({
          externalId: 10,
          status: "NS",
          kickoffAt: "2026-09-01T16:30:00.000Z",
        }),
        makeFixture({
          externalId: 11,
          status: "NS",
          kickoffAt: "2026-09-01T20:00:00.000Z",
        }),
        makeFixture({
          externalId: 12,
          status: "FT",
          kickoffAt: "2026-09-01T16:00:00.000Z",
        }),
      ],
      meta: { cached: false, stale: false },
    });

    const data = await getLiveCenterData({}, now);

    expect(data.fixtures).toHaveLength(0);
    expect(data.upcomingSoon.map((fixture) => fixture.externalId)).toEqual([
      10,
    ]);
  });
});
