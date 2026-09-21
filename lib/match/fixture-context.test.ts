import { describe, expect, it } from "vitest";

import {
  PHASE_G_SMOKE_FIXTURE_QUOTAS,
  resolveMatchFixtureContext,
  standingsUnavailableCopy,
} from "@/lib/match/fixture-context";

describe("resolveMatchFixtureContext", () => {
  it("marks registry national_team competitions as international", () => {
    const ctx = resolveMatchFixtureContext({
      leagueExternalId: 10,
      homeTeam: { isNational: false },
      awayTeam: { isNational: false },
    });

    expect(ctx.category).toBe("national_team");
    expect(ctx.tier).toBe(1);
    expect(ctx.isInternational).toBe(true);
    expect(ctx.supportsStandings).toBe(false);
    expect(ctx.h2hSameCompLabel).toBe("Same competition");
  });

  it("uses Nations League standings capability from registry", () => {
    const ctx = resolveMatchFixtureContext({
      leagueExternalId: 5,
      homeTeam: { isNational: true },
      awayTeam: { isNational: true },
    });

    expect(ctx.supportsStandings).toBe(true);
    expect(ctx.teamNoun).toBe("team");
  });

  it("keeps domestic league club copy for legacy provider ids", () => {
    const ctx = resolveMatchFixtureContext({
      leagueExternalId: 39,
      homeTeam: { isNational: false },
      awayTeam: { isNational: false },
    });

    expect(ctx.isInternational).toBe(false);
    expect(ctx.teamNoun).toBe("club");
    expect(ctx.h2hSameCompLabel).toBe("Same league");
    expect(ctx.supportsStandings).toBe(true);
  });

  it("treats national sides in club leagues as international", () => {
    const ctx = resolveMatchFixtureContext({
      leagueExternalId: 39,
      homeTeam: { isNational: true },
      awayTeam: { isNational: false },
    });

    expect(ctx.isInternational).toBe(true);
    expect(ctx.teamNounPlural).toBe("teams");
  });
});

describe("standingsUnavailableCopy", () => {
  it("explains unsupported competition tables without league-table wording", () => {
    const ctx = resolveMatchFixtureContext({
      leagueExternalId: 10,
      homeTeam: { isNational: true },
      awayTeam: { isNational: true },
    });
    const copy = standingsUnavailableCopy("Friendlies", ctx);
    expect(copy.title).toContain("not available");
    expect(copy.description).toContain("Matches tab");
  });
});

describe("PHASE_G_SMOKE_FIXTURE_QUOTAS", () => {
  it("lists Friendlies 10, Nations League 5, one WCQ Europe", () => {
    expect(PHASE_G_SMOKE_FIXTURE_QUOTAS).toEqual([
      { leagueProviderId: 10, label: "Friendlies", limit: 10 },
      { leagueProviderId: 5, label: "UEFA Nations League", limit: 5 },
      {
        leagueProviderId: 32,
        label: "World Cup - Qualification Europe",
        limit: 1,
      },
    ]);
  });
});
