import { describe, expect, it } from "vitest";

import {
  makeMatchTestFixture,
  makeTeamStats,
} from "@/components/match/match-test-fixtures";
import {
  aggregatePlayerDerivedStats,
  buildMatchStatisticsViewModel,
  computeHomeBarPercent,
} from "@/lib/match/build-match-statistics-view-model";
import type { FixturePlayerPerformance } from "@/types/domain";

describe("computeHomeBarPercent", () => {
  it("returns 50 when both sides are zero", () => {
    expect(computeHomeBarPercent(0, 0)).toBe(50);
  });

  it("splits by share of total", () => {
    expect(computeHomeBarPercent(54, 46)).toBeCloseTo(54, 5);
  });
});

describe("aggregatePlayerDerivedStats", () => {
  it("sums tackles and duels and averages ratings", () => {
    const performances: FixturePlayerPerformance[] = [
      {
        teamExternalId: 10,
        playerExternalId: 1,
        name: "A",
        shirtNumber: 1,
        position: "M",
        minutes: 90,
        rating: 7,
        goals: null,
        assists: null,
        yellowCards: null,
        redCards: null,
        saves: null,
        shotsTotal: null,
        shotsOnTarget: null,
        passes: null,
        keyPasses: null,
        tacklesTotal: 2,
        duelsTotal: 5,
        wasStarter: true,
        wasCaptain: false,
      },
      {
        teamExternalId: 10,
        playerExternalId: 2,
        name: "B",
        shirtNumber: 2,
        position: "M",
        minutes: 45,
        rating: 9,
        goals: null,
        assists: null,
        yellowCards: null,
        redCards: null,
        saves: null,
        shotsTotal: null,
        shotsOnTarget: null,
        passes: null,
        keyPasses: null,
        tacklesTotal: 1,
        duelsTotal: 3,
        wasStarter: false,
        wasCaptain: false,
      },
      {
        teamExternalId: 20,
        playerExternalId: 3,
        name: "C",
        shirtNumber: 3,
        position: "D",
        minutes: 90,
        rating: 6,
        goals: null,
        assists: null,
        yellowCards: null,
        redCards: null,
        saves: null,
        shotsTotal: null,
        shotsOnTarget: null,
        passes: null,
        keyPasses: null,
        tacklesTotal: 4,
        duelsTotal: 8,
        wasStarter: true,
        wasCaptain: false,
      },
    ];

    const derived = aggregatePlayerDerivedStats(performances, 10, 20);

    expect(derived.home.tacklesTotal).toBe(3);
    expect(derived.home.duelsTotal).toBe(8);
    expect(derived.home.averageRating).toBe(8);
    expect(derived.away.tacklesTotal).toBe(4);
  });
});

describe("buildMatchStatisticsViewModel", () => {
  it("hides rows and sections when values are missing", () => {
    const fixture = makeMatchTestFixture("FT");
    const stats = [makeTeamStats(10), makeTeamStats(20)];

    const sections = buildMatchStatisticsViewModel(fixture, stats, {
      home: { tacklesTotal: null, duelsTotal: null, averageRating: null },
      away: { tacklesTotal: null, duelsTotal: null, averageRating: null },
    });

    const labels = sections.flatMap((section) =>
      section.rows.map((row) => row.label)
    );

    expect(labels).toContain("Ball possession");
    expect(labels).not.toContain("Distance covered");
    expect(labels).not.toContain("Big chances");
    expect(sections.some((section) => section.title === "Rating")).toBe(false);
  });

  it("includes player-derived defensive stats when present", () => {
    const fixture = makeMatchTestFixture("FT");
    const homeStats = makeTeamStats(10);
    const awayStats = makeTeamStats(20);

    const sections = buildMatchStatisticsViewModel(
      fixture,
      [homeStats, awayStats],
      {
        home: { tacklesTotal: 11, duelsTotal: 22, averageRating: 7.2 },
        away: { tacklesTotal: 9, duelsTotal: 18, averageRating: 6.8 },
      }
    );

    const defensive = sections.find((s) => s.title === "Defensive");
    expect(defensive?.rows.map((r) => r.label)).toEqual(["Tackles", "Duels"]);
  });
});
