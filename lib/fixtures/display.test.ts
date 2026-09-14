import { describe, expect, it } from "vitest";

import {
  formatFixtureKickoffDateTime,
  formatFixtureKickoffTime,
  formatFixtureScheduledCenterLabel,
  formatFixtureScore,
  formatMatchHeaderStatusLabel,
  shouldShowFixtureScore,
} from "@/lib/fixtures/display";
import { mergeTeamFixtures } from "@/lib/match/merge-team-fixtures";
import { selectRelevantStandingsGroup } from "@/lib/standings/select-relevant-group";
import type { Fixture, StandingsGroup } from "@/types/domain";

const BELGRADE = "Europe/Belgrade";

function buildFixture(
  externalId: number,
  kickoffAt: string,
  overrides: Partial<Fixture> = {}
): Fixture {
  return {
    externalId,
    league: {
      externalId: 39,
      name: "Premier League",
      type: "League",
      country: null,
      logoUrl: null,
    },
    seasonYear: 2025,
    homeTeam: {
      externalId: 1,
      name: "Home",
      code: null,
      logoUrl: null,
      isNational: false,
    },
    awayTeam: {
      externalId: 2,
      name: "Away",
      code: null,
      logoUrl: null,
      isNational: false,
    },
    kickoffAt,
    status: "NS",
    minute: null,
    score: {
      home: null,
      away: null,
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
    ...overrides,
  };
}

describe("formatMatchHeaderStatusLabel", () => {
  const kickoff = "2026-09-08T16:45:00.000Z";

  it("formats scheduled fixtures with kickoff datetime", () => {
    const fixture = buildFixture(1, kickoff, { status: "NS" });
    expect(formatMatchHeaderStatusLabel(fixture, BELGRADE)).toContain("18:45");
  });

  it("formats live minute", () => {
    const fixture = buildFixture(1, kickoff, {
      status: "2H",
      minute: 67,
    });
    expect(formatMatchHeaderStatusLabel(fixture, BELGRADE)).toBe("67'");
  });

  it("formats finished variants", () => {
    expect(
      formatMatchHeaderStatusLabel(
        buildFixture(1, kickoff, { status: "FT" }),
        BELGRADE
      )
    ).toBe("Full time");
    expect(
      formatMatchHeaderStatusLabel(
        buildFixture(1, kickoff, { status: "AET" }),
        BELGRADE
      )
    ).toBe("After extra time");
    expect(
      formatMatchHeaderStatusLabel(
        buildFixture(1, kickoff, { status: "PEN" }),
        BELGRADE
      )
    ).toBe("Penalties");
  });

  it("formats interrupted fixtures without kickoff datetime", () => {
    expect(
      formatMatchHeaderStatusLabel(
        buildFixture(1, kickoff, { status: "PST" }),
        BELGRADE
      )
    ).toBe("Postponed");
    expect(
      formatMatchHeaderStatusLabel(
        buildFixture(1, kickoff, { status: "CANC" }),
        BELGRADE
      )
    ).toBe("Cancelled");
  });
});

describe("shouldShowFixtureScore", () => {
  it("shows score for finished status", () => {
    const fixture = buildFixture(1, "2026-09-08T16:45:00.000Z", {
      status: "FT",
      score: { home: 2, away: 1 },
    });
    expect(shouldShowFixtureScore(fixture)).toBe(true);
  });

  it("shows score when goals exist but status is still NS", () => {
    const fixture = buildFixture(1, "2026-09-08T16:45:00.000Z", {
      status: "NS",
      score: {
        home: 2,
        away: 1,
        halftimeHome: null,
        halftimeAway: null,
        fulltimeHome: null,
        fulltimeAway: null,
        extratimeHome: null,
        extratimeAway: null,
        penaltyHome: null,
        penaltyAway: null,
      },
    });
    expect(shouldShowFixtureScore(fixture)).toBe(true);
    expect(formatFixtureScore(fixture, BELGRADE)).toBe("2 – 1");
  });

  it("shows kickoff time for scheduled fixtures without goals", () => {
    const fixture = buildFixture(1, "2026-09-08T16:45:00.000Z", {
      status: "NS",
    });
    expect(shouldShowFixtureScore(fixture)).toBe(false);
    expect(formatFixtureScore(fixture, BELGRADE)).toBe("18:45");
  });
});

describe("formatFixtureScheduledCenterLabel", () => {
  it("shows time only for kickoffs on today", () => {
    const fixture = buildFixture(1, "2026-09-14T16:00:00.000Z", {
      status: "NS",
    });
    expect(
      formatFixtureScheduledCenterLabel(fixture, BELGRADE, "2026-09-14")
    ).toMatch(/^\d{2}:\d{2}$/);
  });

  it("shows date and time for kickoffs after today", () => {
    const fixture = buildFixture(1, "2026-09-15T18:30:00.000Z", {
      status: "NS",
    });
    const label = formatFixtureScheduledCenterLabel(
      fixture,
      BELGRADE,
      "2026-09-14"
    );
    expect(label).toContain(",");
    expect(label).toMatch(/\d{2}:\d{2}/);
  });

  it("shows score for finished fixtures", () => {
    const fixture = buildFixture(1, "2026-09-13T16:00:00.000Z", {
      status: "FT",
      score: {
        home: 2,
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
    });
    expect(
      formatFixtureScheduledCenterLabel(fixture, BELGRADE, "2026-09-14")
    ).toBe("2 – 0");
  });
});

describe("formatFixtureKickoffTime", () => {
  it("uses 24-hour clock", () => {
    const formatted = formatFixtureKickoffTime(
      "2026-03-03T18:30:00.000Z",
      BELGRADE
    );
    expect(formatted).not.toMatch(/am|pm/i);
    expect(formatted).toMatch(/^\d{2}:\d{2}$/);
  });

  it("formats kickoff in the requested timezone", () => {
    expect(formatFixtureKickoffTime("2026-09-08T16:45:00.000Z", "UTC")).toBe(
      "16:45"
    );
    expect(formatFixtureKickoffTime("2026-09-08T16:45:00.000Z", BELGRADE)).toBe(
      "18:45"
    );
  });
});

describe("formatFixtureKickoffDateTime", () => {
  it("uses 24-hour clock in datetime strings", () => {
    const formatted = formatFixtureKickoffDateTime(
      "2026-03-03T18:30:00.000Z",
      BELGRADE
    );
    expect(formatted).not.toMatch(/am|pm/i);
  });

  it("formats kickoff date and time in the requested timezone", () => {
    expect(
      formatFixtureKickoffDateTime("2026-09-08T16:45:00.000Z", BELGRADE)
    ).toContain("18:45");
  });

  it("uses en-GB locale for stable SSR and client output", () => {
    expect(
      formatFixtureKickoffDateTime("2026-09-13T12:00:00.000Z", "UTC")
    ).toBe("Sun 13 Sept, 12:00");
  });
});

describe("selectRelevantStandingsGroup", () => {
  const groups: StandingsGroup[] = [
    {
      leagueExternalId: 2,
      seasonYear: 2025,
      groupName: "Group A",
      rows: [
        {
          rank: 1,
          team: {
            externalId: 10,
            name: "Team A",
            code: null,
            logoUrl: null,
            isNational: false,
          },
          points: 6,
          goalsDiff: 2,
          groupName: "Group A",
          form: "WW",
          played: 2,
          win: 2,
          draw: 0,
          lose: 0,
          goalsFor: 4,
          goalsAgainst: 2,
        },
        {
          rank: 2,
          team: {
            externalId: 20,
            name: "Team B",
            code: null,
            logoUrl: null,
            isNational: false,
          },
          points: 3,
          goalsDiff: 0,
          groupName: "Group A",
          form: "WD",
          played: 2,
          win: 1,
          draw: 0,
          lose: 1,
          goalsFor: 2,
          goalsAgainst: 2,
        },
      ],
    },
    {
      leagueExternalId: 2,
      seasonYear: 2025,
      groupName: "Overall",
      rows: [],
    },
  ];

  it("prefers the shared knockout/league group over Overall", () => {
    expect(selectRelevantStandingsGroup(groups, 10, 20)?.groupName).toBe(
      "Group A"
    );
  });
});

describe("mergeTeamFixtures", () => {
  it("dedupes fixtures and excludes the current match", () => {
    const merged = mergeTeamFixtures(
      [buildFixture(100, "2026-03-01T15:00:00.000Z")],
      [
        buildFixture(100, "2026-03-01T15:00:00.000Z"),
        buildFixture(101, "2026-03-02T15:00:00.000Z"),
      ],
      { excludeFixtureId: 100 }
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.externalId).toBe(101);
  });
});
