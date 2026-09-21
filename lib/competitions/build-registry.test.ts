import { describe, expect, it } from "vitest";

import { buildCompetitionRegistry } from "@/lib/competitions/build-registry";
import type { RawRegistryLeagueEntry } from "@/lib/competitions/types";

function entry(
  partial: Partial<RawRegistryLeagueEntry> &
    Pick<RawRegistryLeagueEntry, "league" | "country">
): RawRegistryLeagueEntry {
  return {
    seasons: [
      { year: 2025, start: "2025-01-01", end: "2025-12-31", current: true },
    ],
    ...partial,
  };
}

describe("buildCompetitionRegistry", () => {
  it("includes seeded tier 1 leagues and excludes unseeded noise", () => {
    const registry = buildCompetitionRegistry([
      entry({
        league: { id: 39, name: "Premier League", type: "League" },
        country: { name: "England", code: "GB-ENG" },
      }),
      entry({
        league: { id: 9999, name: "U19 League", type: "League" },
        country: { name: "England", code: "GB-ENG" },
      }),
    ]);

    expect(registry.competitions.some((item) => item.providerId === 39)).toBe(
      true
    );
    expect(registry.competitions.some((item) => item.providerId === 9999)).toBe(
      false
    );
  });

  it("keeps national team seeds without requiring domestic season activity", () => {
    const registry = buildCompetitionRegistry([
      entry({
        league: { id: 10, name: "Friendlies", type: "Cup" },
        country: { name: "World", code: null },
        seasons: [],
      }),
    ]);

    expect(
      registry.competitions.find((item) => item.providerId === 10)
    ).toMatchObject({
      category: "national_team",
      tier: 1,
    });
  });
});
