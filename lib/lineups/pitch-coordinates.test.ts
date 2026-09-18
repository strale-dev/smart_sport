import { describe, expect, it } from "vitest";

import { resolveTeamPitchPositions } from "@/lib/lineups/pitch-coordinates";
import type { LineupDisplayPlayer } from "@/lib/lineups/types";

function starter(
  overrides: Partial<LineupDisplayPlayer> &
    Pick<LineupDisplayPlayer, "name" | "grid">
): LineupDisplayPlayer {
  return {
    playerExternalId: null,
    shirtNumber: null,
    position: null,
    isStarting: true,
    isCaptain: false,
    photoUrl: null,
    rating: null,
    minutes: null,
    goals: null,
    assists: null,
    matchBadges: { goals: 0, assists: 0 },
    ...overrides,
  };
}

const formation433: LineupDisplayPlayer[] = [
  starter({ name: "GK", grid: "1:1", position: "G", shirtNumber: 1 }),
  starter({ name: "D1", grid: "2:1", position: "D", shirtNumber: 16 }),
  starter({ name: "D2", grid: "2:2", position: "D", shirtNumber: 19 }),
  starter({ name: "D3", grid: "2:3", position: "D", shirtNumber: 20 }),
  starter({ name: "D4", grid: "2:4", position: "D", shirtNumber: 13 }),
  starter({ name: "M1", grid: "3:1", position: "M", shirtNumber: 8 }),
  starter({ name: "M2", grid: "3:2", position: "M", shirtNumber: 23 }),
  starter({ name: "M3", grid: "3:3", position: "M", shirtNumber: 2 }),
  starter({ name: "F1", grid: "4:1", position: "F", shirtNumber: 17 }),
  starter({ name: "F2", grid: "4:2", position: "F", shirtNumber: 10 }),
  starter({ name: "F3", grid: "4:3", position: "F", shirtNumber: 7 }),
];

describe("resolveTeamPitchPositions", () => {
  it("centers GK and spreads 4-3-3 forwards across the pitch", () => {
    const placed = resolveTeamPitchPositions(
      formation433,
      "4-3-3",
      "fullAttackingUp"
    );
    const gk = placed.find((p) => p.player.name === "GK");
    const forwards = placed.filter((p) =>
      ["F1", "F2", "F3"].includes(p.player.name)
    );

    expect(gk?.point.x).toBeCloseTo(50, 0);
    expect(forwards).toHaveLength(3);
    const xs = forwards.map((f) => f.point.x).sort((a, b) => a - b);
    expect(xs[0]).toBeLessThan(40);
    expect(xs[2]).toBeGreaterThan(60);
    const unique = new Set(
      placed.map((p) => `${p.point.x.toFixed(1)},${p.point.y.toFixed(1)}`)
    );
    expect(unique.size).toBe(placed.length);
  });

  it("spreads five midfielders in 3-5-2", () => {
    const starters: LineupDisplayPlayer[] = [
      starter({ name: "GK", grid: "1:1", position: "G" }),
      starter({ name: "D1", grid: "2:1", position: "D" }),
      starter({ name: "D2", grid: "2:2", position: "D" }),
      starter({ name: "D3", grid: "2:3", position: "D" }),
      starter({ name: "M1", grid: "3:1", position: "M" }),
      starter({ name: "M2", grid: "3:2", position: "M" }),
      starter({ name: "M3", grid: "3:3", position: "M" }),
      starter({ name: "M4", grid: "3:4", position: "M" }),
      starter({ name: "M5", grid: "3:5", position: "M" }),
      starter({ name: "F1", grid: "4:1", position: "F" }),
      starter({ name: "F2", grid: "4:2", position: "F" }),
    ];
    const placed = resolveTeamPitchPositions(starters, "3-5-2", "homeHalf");
    const mids = placed.filter((p) => p.player.name.startsWith("M"));
    const xs = mids.map((m) => m.point.x).sort((a, b) => a - b);
    expect(xs[0]).toBeLessThan(25);
    expect(xs[4]).toBeGreaterThan(75);
  });

  it("orients homeHalf vs awayHalf on split pitch", () => {
    const home = resolveTeamPitchPositions(formation433, "4-3-3", "homeHalf");
    const away = resolveTeamPitchPositions(formation433, "4-3-3", "awayHalf");
    const homeGk = home.find((p) => p.player.name === "GK")!;
    const homeFw = home.find((p) => p.player.name === "F2")!;
    const awayGk = away.find((p) => p.player.name === "GK")!;
    const awayFw = away.find((p) => p.player.name === "F2")!;

    expect(homeGk.point.y).toBeLessThan(homeFw.point.y);
    expect(homeFw.point.y).toBeLessThan(50);
    expect(awayGk.point.y).toBeGreaterThan(awayFw.point.y);
    expect(awayGk.point.y).toBeGreaterThan(50);
  });

  it("uses formation fallback when grids are missing", () => {
    const noGrid = formation433.map((p) => ({ ...p, grid: null }));
    const placed = resolveTeamPitchPositions(
      noGrid,
      "4-3-3",
      "fullAttackingUp"
    );
    expect(placed.length).toBe(11);
    const unique = new Set(
      placed.map((p) => `${p.point.x.toFixed(0)},${p.point.y.toFixed(0)}`)
    );
    expect(unique.size).toBeGreaterThan(8);
  });
});
