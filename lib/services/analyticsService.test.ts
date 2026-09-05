import { afterEach, describe, expect, it, vi } from "vitest";

import { aggregateForm } from "@/lib/analytics/compute-form";
import { summarizeH2HMeetings } from "@/lib/analytics/compute-h2h";
import { resetCacheForTests } from "@/lib/redis/cache";
import * as analyticsService from "@/lib/services/analyticsService";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/redis/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/redis/cache")>();
  return {
    ...actual,
    cached: vi.fn(async ({ fn }: { fn: () => Promise<unknown> }) => ({
      value: await fn(),
      meta: { cached: false, stale: false },
    })),
  };
});

import { createAdminClient } from "@/lib/supabase/admin";

function mockAdminClient(handlers: {
  teams?: Record<number, string | null>;
  leagues?: Record<number, string | null>;
  fixtures?: unknown[];
}) {
  const client = {
    from: vi.fn((table: string) => {
      if (table === "teams") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_column: string, providerId: number) => ({
              maybeSingle: vi.fn(async () => ({
                data: handlers.teams?.[providerId]
                  ? { id: handlers.teams[providerId] }
                  : null,
                error: null,
              })),
            })),
          })),
        };
      }

      if (table === "leagues") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_column: string, providerId: number) => ({
              maybeSingle: vi.fn(async () => ({
                data: handlers.leagues?.[providerId]
                  ? { id: handlers.leagues[providerId] }
                  : null,
                error: null,
              })),
            })),
          })),
        };
      }

      if (table === "fixtures") {
        const chain = {
          select: vi.fn(() => chain),
          in: vi.fn(() => chain),
          order: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          or: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          lte: vi.fn(() => chain),
          then: undefined as unknown,
        };

        chain.then = undefined;
        Object.assign(chain, {
          then(onFulfilled: (value: unknown) => unknown) {
            return Promise.resolve({
              data: handlers.fixtures ?? [],
              error: null,
            }).then(onFulfilled);
          },
        });

        return chain;
      }

      if (table === "form_snapshots" || table === "h2h_summaries") {
        return {
          insert: vi.fn(async () => ({ error: null })),
        };
      }

      throw new Error(`Unexpected table mock: ${table}`);
    }),
  };

  vi.mocked(createAdminClient).mockReturnValue(
    client as unknown as ReturnType<typeof createAdminClient>
  );
}

describe("analyticsService", () => {
  afterEach(() => {
    resetCacheForTests();
    vi.restoreAllMocks();
  });

  it("returns empty form snapshot when team is unknown", async () => {
    mockAdminClient({ teams: { 999: null } });

    const snapshot = await analyticsService.computeRecentForm(999, {
      matches: 5,
      scope: "ALL",
    });

    expect(snapshot.results).toEqual([]);
    expect(snapshot.matches).toBe(5);
    expect(snapshot.scope).toBe("ALL");
  });

  it("computes and persists form snapshot from fixtures", async () => {
    mockAdminClient({
      teams: { 40: "team-a-uuid" },
      fixtures: [
        {
          provider_id: 1001,
          kickoff_at: "2026-08-20T15:00:00.000Z",
          score_home: 2,
          score_away: 1,
          home_team: { provider_id: 40, name: "Liverpool" },
          away_team: { provider_id: 50, name: "Arsenal" },
          league: { provider_id: 39, name: "Premier League" },
        },
      ],
    });

    const snapshot = await analyticsService.computeRecentForm(40, {
      matches: 5,
      scope: "ALL",
    });

    expect(snapshot.results).toHaveLength(1);
    expect(snapshot.wins).toBe(1);
    expect(createAdminClient().from).toHaveBeenCalledWith("form_snapshots");
  });

  it("returns empty H2H summary when either team is unknown", async () => {
    mockAdminClient({
      teams: { 40: "team-a-uuid", 50: null },
    });

    const summary = await analyticsService.computeH2H(40, 50, {
      windowSize: 10,
      scope: "ALL",
    });

    expect(summary.meetings).toEqual([]);
    expect(summary.teamAWins).toBe(0);
    expect(summary.teamBWins).toBe(0);
  });

  it("getRecentForm uses cached wrapper and returns typed snapshot", async () => {
    mockAdminClient({ teams: { 40: "team-a-uuid" }, fixtures: [] });

    const snapshot = await analyticsService.getRecentForm(40, {
      matches: 10,
      scope: "ALL",
    });

    expect(snapshot).toEqual(aggregateForm([], "ALL", 10));
  });

  it("getH2H uses cached wrapper and returns typed summary", async () => {
    mockAdminClient({
      teams: { 40: "team-a-uuid", 50: "team-b-uuid" },
      fixtures: [],
    });

    const summary = await analyticsService.getH2H(40, 50, {
      windowSize: 10,
      scope: "ALL",
    });

    expect(summary).toEqual(summarizeH2HMeetings([], 40, 50, 10, "ALL"));
  });
});
