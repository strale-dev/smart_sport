import { describe, expect, it } from "vitest";

import { squadPlayerToDomainPlayer } from "@/lib/players/from-squad";
import type { SquadPlayer, TeamRef } from "@/types/domain";

const squadPlayer: SquadPlayer = {
  externalId: 276,
  name: "N. Kanté",
  age: 33,
  shirtNumber: 13,
  position: "MF",
  photoUrl: "https://example.com/kante.png",
};

const team: TeamRef = {
  externalId: 49,
  name: "Chelsea",
  code: "CHE",
  logoUrl: null,
  isNational: false,
};

describe("squadPlayerToDomainPlayer", () => {
  it("maps squad fields onto a Player record", () => {
    const player = squadPlayerToDomainPlayer(squadPlayer, team);

    expect(player.externalId).toBe(276);
    expect(player.fullName).toBe("N. Kanté");
    expect(player.position).toBe("MF");
    expect(player.shirtNumber).toBe(13);
    expect(player.photoUrl).toBe("https://example.com/kante.png");
    expect(player.currentTeam?.externalId).toBe(49);
  });
});
