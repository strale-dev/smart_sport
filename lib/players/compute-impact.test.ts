import { describe, expect, it } from "vitest";

import {
  computeActualImpactScore,
  computePrematchImpactScore,
  pickTopPlayers,
  positionWeight,
} from "@/lib/players/compute-impact";

describe("compute-impact", () => {
  it("weights attacking positions higher", () => {
    expect(positionWeight("F")).toBeGreaterThan(positionWeight("G"));
  });

  it("scores prematch players using rating and form", () => {
    const score = computePrematchImpactScore({
      avgRating: 7.5,
      goals: 3,
      assists: 2,
      position: "F",
      isCaptain: true,
    });

    expect(score).toBeGreaterThan(8);
  });

  it("prefers actual match rating when available", () => {
    expect(
      computeActualImpactScore({ rating: 8.2, goals: 0, assists: 0 })
    ).toBe(8.2);
  });

  it("limits top picks per team", () => {
    const picks = pickTopPlayers(
      [
        { score: 9, teamExternalId: 1, name: "A" },
        { score: 8.5, teamExternalId: 1, name: "B" },
        { score: 8.4, teamExternalId: 1, name: "C" },
        { score: 8.3, teamExternalId: 2, name: "D" },
      ],
      3,
      2
    );

    expect(picks).toHaveLength(3);
    expect(picks.filter((player) => player.teamExternalId === 1)).toHaveLength(
      2
    );
  });
});
