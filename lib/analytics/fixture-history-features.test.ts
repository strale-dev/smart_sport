import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  FixtureH2HFeatures,
  TeamHistoryFeatures,
} from "@/lib/analytics/history-feature-types";
import { metricFromValue } from "@/lib/analytics/recency-weight";

const buildTeamHistoryFeatures = vi.fn();
const buildFixtureH2HFeatures = vi.fn();

vi.mock("@/lib/analytics/team-history-features", () => ({
  buildTeamHistoryFeatures: (...args: unknown[]) =>
    buildTeamHistoryFeatures(...args),
}));

vi.mock("@/lib/analytics/fixture-h2h-features", () => ({
  buildFixtureH2HFeatures: (...args: unknown[]) =>
    buildFixtureH2HFeatures(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: {
                provider_id: 9001,
                kickoff_at: "2026-03-15T15:00:00.000Z",
                home_team_id: "home-uuid",
                away_team_id: "away-uuid",
                league_id: "league-uuid",
                home_team: { provider_id: 10 },
                away_team: { provider_id: 20 },
                league: { provider_id: 39 },
              },
              error: null,
            }),
        }),
      }),
    }),
  }),
}));

function stubTeam(providerId: number): TeamHistoryFeatures {
  return {
    teamProviderId: providerId,
    beforeAt: "2026-03-15T15:00:00.000Z",
    restDays: 6,
    completenessByScope: [],
    windows: {},
    periodCompare: [],
    recentExamples: [],
    formSummaryLast5: null,
  };
}

function stubH2H(
  scope: "ALL" | "SAME_COMP",
  dataState: "available" | "unavailable",
  meetingsInWindow: number
): FixtureH2HFeatures {
  return {
    beforeAt: "2026-03-15T15:00:00.000Z",
    homeTeamProviderId: 10,
    awayTeamProviderId: 20,
    scope,
    meetingsTotal: meetingsInWindow,
    meetingsInWindow,
    effectiveMeetingWeight: meetingsInWindow > 0 ? 3 : 0,
    homeWins: 1,
    draws: 0,
    awayWins: 0,
    recencyWeightedHomeWinRate: metricFromValue(
      meetingsInWindow > 0 ? 0.5 : null,
      meetingsInWindow
    ),
    recencyWeightedAvgGoals: metricFromValue(
      meetingsInWindow > 0 ? 2.5 : null,
      meetingsInWindow
    ),
    avgGoalsSimple: metricFromValue(
      meetingsInWindow > 0 ? 2.5 : null,
      meetingsInWindow
    ),
    venueHomeWinRateAtHome: metricFromValue(null, 0),
    dataState,
  };
}

describe("fixture-history-features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildTeamHistoryFeatures.mockImplementation(
      async (input: { teamProviderId: number }) =>
        stubTeam(input.teamProviderId)
    );
  });

  it("excludes fixtures at or after beforeAt", () => {
    const beforeAt = "2026-03-15T15:00:00.000Z";
    const kickoffs = [
      "2026-03-14T12:00:00.000Z",
      "2026-03-15T15:00:00.000Z",
      "2026-03-16T12:00:00.000Z",
    ];
    const eligible = kickoffs.filter((k) => k < beforeAt);
    expect(eligible).toEqual(["2026-03-14T12:00:00.000Z"]);
  });

  it("builds PIT team features and prefers SAME_COMP H2H when available", async () => {
    const h2hAll = stubH2H("ALL", "available", 8);
    const h2hComp = stubH2H("SAME_COMP", "available", 3);
    buildFixtureH2HFeatures
      .mockResolvedValueOnce(h2hAll)
      .mockResolvedValueOnce(h2hComp);

    const { buildFixtureHistoryFeatures } =
      await import("@/lib/analytics/fixture-history-features");
    const result = await buildFixtureHistoryFeatures(9001);

    expect(result).not.toBeNull();
    expect(result!.beforeAt).toBe("2026-03-15T15:00:00.000Z");
    expect(result!.h2h.scope).toBe("SAME_COMP");
    expect(buildTeamHistoryFeatures).toHaveBeenCalledTimes(2);
    expect(buildTeamHistoryFeatures).toHaveBeenCalledWith(
      expect.objectContaining({
        teamProviderId: 10,
        teamUuid: "home-uuid",
        beforeAt: "2026-03-15T15:00:00.000Z",
        leagueProviderId: 39,
      })
    );
    expect(buildFixtureH2HFeatures).toHaveBeenCalledTimes(2);
  });

  it("falls back to ALL H2H when competition scope has no meetings", async () => {
    const h2hAll = stubH2H("ALL", "available", 5);
    const h2hComp = stubH2H("SAME_COMP", "unavailable", 0);
    buildFixtureH2HFeatures
      .mockResolvedValueOnce(h2hAll)
      .mockResolvedValueOnce(h2hComp);

    const { buildFixtureHistoryFeatures } =
      await import("@/lib/analytics/fixture-history-features");
    const result = await buildFixtureHistoryFeatures(9001);

    expect(result!.h2h.scope).toBe("ALL");
  });
});
