import { beforeEach, describe, expect, it, vi } from "vitest";

import * as dbRead from "@/lib/search/db-read";
import * as footballService from "@/lib/services/footballService";
import { globalSearch } from "@/lib/services/searchService";

vi.mock("@/lib/redis/cache", () => ({
  cached: async <T>(options: { fn: () => Promise<T> }) => ({
    value: await options.fn(),
    meta: { cached: false, stale: false },
  }),
}));

vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    isApiFootballIngestOnly: vi.fn(() => true),
  };
});

describe("globalSearch provider fallback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dbRead, "searchTeamsFromDb").mockResolvedValue([]);
    vi.spyOn(dbRead, "searchPlayersFromDb").mockResolvedValue([]);
    vi.spyOn(dbRead, "searchLeaguesFromDb").mockResolvedValue([]);
    vi.spyOn(dbRead, "searchFixturesFromDb").mockResolvedValue([]);
  });

  it("does not call provider search when ingest-only", async () => {
    const teamsSpy = vi.spyOn(footballService, "searchTeams");
    const playersSpy = vi.spyOn(footballService, "searchPlayers");

    await globalSearch("realm", "palette");

    expect(teamsSpy).not.toHaveBeenCalled();
    expect(playersSpy).not.toHaveBeenCalled();
  });
});
