import { beforeEach, describe, expect, it, vi } from "vitest";

const getIngestionConfig = vi.fn();

vi.mock("@/lib/ingestion/config", () => ({
  getIngestionConfig,
}));

function minimalFixtureRow(providerId: number) {
  return {
    provider_id: providerId,
    kickoff_at: "2026-10-01T15:00:00.000Z",
    status: "NS" as const,
    minute: null,
    status_extra_minute: null,
    period_first_start_at: null,
    period_second_start_at: null,
    last_provider_sync_at: null,
    referee: null,
    round: null,
    score_home: null,
    score_away: null,
    ht_home: null,
    ht_away: null,
    ft_home: null,
    ft_away: null,
    et_home: null,
    et_away: null,
    pen_home: null,
    pen_away: null,
    home_team: {
      provider_id: 1,
      name: "Home",
      code: null,
      logo_url: null,
      is_national: false,
    },
    away_team: {
      provider_id: 2,
      name: "Away",
      code: null,
      logo_url: null,
      is_national: false,
    },
    league: {
      provider_id: 39,
      name: "Premier League",
      type: "League",
      country_name: "England",
      logo_url: null,
    },
    season: { year: 2025 },
    venue: null,
  };
}

function buildFixturesRangeMock(pages: { data: unknown[]; error: null }[]) {
  let rangeCall = 0;
  const range = vi.fn(() => {
    const page = pages[rangeCall] ?? { data: [], error: null };
    rangeCall += 1;
    return Promise.resolve(page);
  });

  const fixturesChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnValue({ range }),
  };

  const leaguesChain = {
    select: vi.fn().mockReturnThis(),
    in: vi
      .fn()
      .mockResolvedValue({ data: [{ id: "league-uuid" }], error: null }),
    eq: vi
      .fn()
      .mockResolvedValue({ data: [{ id: "league-uuid-pl" }], error: null }),
  };

  const from = vi.fn((table: string) => {
    if (table === "leagues") {
      return leaguesChain;
    }
    if (table === "fixtures") {
      return fixturesChain;
    }
    throw new Error(`Unexpected table ${table}`);
  });

  return { from, range, fixturesChain, leaguesChain };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

describe("readFixturesInRangeFromDb", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getIngestionConfig.mockReturnValue({
      leagueProviderIds: [39, 140],
    });
  });

  it("paginates past PostgREST max_rows and returns all rows", async () => {
    const page1 = Array.from({ length: 1000 }, (_, index) =>
      minimalFixtureRow(index + 1)
    );
    const page2 = Array.from({ length: 50 }, (_, index) =>
      minimalFixtureRow(1000 + index + 1)
    );

    const { from, range } = buildFixturesRangeMock([
      { data: page1, error: null },
      { data: page2, error: null },
    ]);

    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue({ from } as never);

    const { readFixturesInRangeFromDb } =
      await import("@/lib/ingestion/db-read");
    const fixtures = await readFixturesInRangeFromDb(
      "2026-09-01T00:00:00.000Z",
      "2026-11-01T00:00:00.000Z"
    );

    expect(fixtures).toHaveLength(1050);
    expect(range).toHaveBeenCalledTimes(2);
    expect(range.mock.calls[0]).toEqual([0, 999]);
    expect(range.mock.calls[1]).toEqual([1000, 1999]);
  });

  it("uses slim list select without venue join for range reads", async () => {
    const rows = [minimalFixtureRow(1)];
    const { from, fixturesChain } = buildFixturesRangeMock([
      { data: rows, error: null },
    ]);

    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue({ from } as never);

    const { readFixturesInRangeFromDb } =
      await import("@/lib/ingestion/db-read");
    const fixtures = await readFixturesInRangeFromDb(
      "2026-09-01T00:00:00.000Z",
      "2026-11-01T00:00:00.000Z"
    );

    const selectArg = fixturesChain.select.mock.calls[0]?.[0] as string;
    expect(selectArg).not.toContain("venue:venues");
    expect(fixtures[0]?.league.name).toBe("Premier League");
    expect(fixtures[0]?.homeTeam.name).toBe("Home");
    expect(fixtures[0]?.venue).toBeNull();
  });

  it("filters by league provider id in SQL when requested", async () => {
    const rows = [minimalFixtureRow(9001), minimalFixtureRow(9002)];
    const { from, fixturesChain, leaguesChain } = buildFixturesRangeMock([
      { data: rows, error: null },
    ]);

    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue({ from } as never);

    const { readFixturesInRangeFromDb } =
      await import("@/lib/ingestion/db-read");
    const fixtures = await readFixturesInRangeFromDb(
      "2026-09-01T00:00:00.000Z",
      "2026-11-01T00:00:00.000Z",
      { leagueProviderId: 39 }
    );

    expect(leaguesChain.eq).toHaveBeenCalledWith("provider_id", 39);
    expect(leaguesChain.in).not.toHaveBeenCalled();
    expect(fixturesChain.in).toHaveBeenCalledWith("league_id", [
      "league-uuid-pl",
    ]);
    expect(fixtures).toHaveLength(2);
  });
});

describe("readFixtureLeaguePresenceInRangeFromDb", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getIngestionConfig.mockReturnValue({
      leagueProviderIds: [39, 140],
    });
  });

  it("returns live and active league ids from the presence aggregate RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        active_league_provider_ids: [39, 140],
        live_league_provider_ids: [140],
      },
      error: null,
    });

    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never);

    const { readFixtureLeaguePresenceInRangeFromDb } =
      await import("@/lib/ingestion/db-read");
    const presence = await readFixtureLeaguePresenceInRangeFromDb(
      "2026-09-01T00:00:00.000Z",
      "2026-09-15T00:00:00.000Z"
    );

    expect(rpc).toHaveBeenCalledWith("fixture_league_presence_in_range", {
      kickoff_from: "2026-09-01T00:00:00.000Z",
      kickoff_to_exclusive: "2026-09-15T00:00:00.000Z",
      league_provider_ids: [39, 140],
    });
    expect(presence.activeLeagueIds).toEqual(expect.arrayContaining([39, 140]));
    expect(presence.liveLeagueIds).toEqual([140]);
    expect(presence.activeLeagueIds).toHaveLength(2);
  });
});

describe("readFixtureByProviderIdFromDb", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("uses full fixture select including venue for match detail read", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: minimalFixtureRow(42), error: null });
    const fixturesChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle }),
      }),
    };
    const from = vi.fn((table: string) => {
      if (table === "fixtures") {
        return fixturesChain;
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue({ from } as never);

    const { readFixtureByProviderIdFromDb } =
      await import("@/lib/ingestion/db-read");
    await readFixtureByProviderIdFromDb(42);

    const selectArg = fixturesChain.select.mock.calls[0]?.[0] as string;
    expect(selectArg).toContain("venue:venues");
  });
});
