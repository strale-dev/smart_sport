import { describe, expect, it, vi } from "vitest";

import {
  EntityNotFoundError,
  FollowLimitReachedError,
  mapFollowInsertError,
} from "@/lib/follow/errors";
import { favoriteFixture, followEntity } from "@/lib/services/followService";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/ingestion/db-read", () => ({
  readTeamIdByProviderIdFromDb: vi.fn(async (id: number) => `team-uuid-${id}`),
  readPlayerIdByProviderIdFromDb: vi.fn(
    async (id: number) => `player-uuid-${id}`
  ),
  readLeagueIdByProviderIdFromDb: vi.fn(
    async (id: number) => `league-uuid-${id}`
  ),
  readFixtureIdByProviderIdFromDb: vi.fn(
    async (id: number) => `fixture-uuid-${id}`
  ),
}));

import { createClient } from "@/lib/supabase/server";

describe("mapFollowInsertError", () => {
  it("maps trigger cap errors to FollowLimitReachedError", () => {
    const mapped = mapFollowInsertError({
      code: "23514",
      message: "FOLLOW_LIMIT_REACHED",
    });
    expect(mapped).toBeInstanceOf(FollowLimitReachedError);
    expect((mapped as FollowLimitReachedError).code).toBe(
      "FOLLOW_LIMIT_REACHED"
    );
  });
});

describe("followEntity concurrency", () => {
  it("returns exactly one success and one FOLLOW_LIMIT_REACHED under cap race", async () => {
    let insertCount = 0;
    const insert = vi.fn(async () => {
      insertCount += 1;
      if (insertCount === 1) {
        return { error: null };
      }
      return {
        error: {
          code: "23514",
          message: "FOLLOW_LIMIT_REACHED",
        },
      };
    });

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn(() => ({
        insert,
      })),
    } as never);

    const userId = "user-1";
    const results = await Promise.allSettled([
      followEntity(userId, { objectType: "TEAM", providerId: 1 }),
      followEntity(userId, { objectType: "TEAM", providerId: 2 }),
    ]);

    const successes = results.filter((result) => result.status === "fulfilled");
    const failures = results.filter((result) => result.status === "rejected");

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect((failures[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      FollowLimitReachedError
    );
  });
});

describe("favoriteFixture", () => {
  it("does not use follow insert path", async () => {
    const favoritesInsert = vi.fn(async () => ({ error: null }));
    const followsInsert = vi.fn(async () => ({ error: null }));

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "favorites") {
          return { insert: favoritesInsert };
        }
        return { insert: followsInsert };
      }),
    } as never);

    await favoriteFixture("user-1", 999);

    expect(favoritesInsert).toHaveBeenCalledTimes(1);
    expect(followsInsert).not.toHaveBeenCalled();
  });

  it("throws EntityNotFoundError when fixture is missing", async () => {
    const { readFixtureIdByProviderIdFromDb } =
      await import("@/lib/ingestion/db-read");
    vi.mocked(readFixtureIdByProviderIdFromDb).mockResolvedValueOnce(null);

    await expect(favoriteFixture("user-1", 404)).rejects.toBeInstanceOf(
      EntityNotFoundError
    );
  });
});
