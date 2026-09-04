import { describe, expect, it } from "vitest";

import {
  groupSquadByPosition,
  orderedSquadPositionKeys,
} from "@/lib/teams/squad";
import type { SquadPlayer } from "@/types/domain";

function player(overrides: Partial<SquadPlayer>): SquadPlayer {
  return {
    externalId: 1,
    name: "Player",
    age: 24,
    shirtNumber: 10,
    position: "MF",
    photoUrl: null,
    ...overrides,
  };
}

describe("groupSquadByPosition", () => {
  it("groups players by position and sorts by shirt number", () => {
    const groups = groupSquadByPosition([
      player({
        externalId: 3,
        name: "Forward",
        position: "FW",
        shirtNumber: 9,
      }),
      player({
        externalId: 1,
        name: "Keeper",
        position: "GK",
        shirtNumber: 1,
      }),
      player({
        externalId: 2,
        name: "Centre back",
        position: "DF",
        shirtNumber: 5,
      }),
      player({
        externalId: 4,
        name: "Left back",
        position: "DF",
        shirtNumber: 3,
      }),
    ]);

    expect(orderedSquadPositionKeys(groups)).toEqual(["GK", "DF", "FW"]);
    expect(groups.get("DF")?.map((entry) => entry.name)).toEqual([
      "Left back",
      "Centre back",
    ]);
  });
});
