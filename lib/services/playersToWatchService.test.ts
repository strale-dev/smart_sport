import { describe, expect, it, vi } from "vitest";

import { pickTopPlayers } from "@/lib/players/compute-impact";

vi.mock("@/lib/ingestion/db-read", () => ({
  readLineupsFromDb: vi.fn(async () => []),
}));

vi.mock("@/lib/services/footballService", () => ({
  getFixturePlayers: vi.fn(async () => ({
    data: [],
    meta: { cached: false, stale: false },
  })),
}));

describe("playersToWatchService", () => {
  it("reuses top-player selection helper", () => {
    const players = pickTopPlayers(
      [
        { score: 10, teamExternalId: 10 },
        { score: 9, teamExternalId: 20 },
        { score: 8, teamExternalId: 10 },
      ],
      2,
      1
    );

    expect(players).toHaveLength(2);
  });
});
