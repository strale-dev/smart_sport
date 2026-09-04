import type { Player, SquadPlayer, TeamRef } from "@/types/domain";

export function squadPlayerToDomainPlayer(
  player: SquadPlayer,
  team: TeamRef | null = null
): Player {
  return {
    externalId: player.externalId,
    firstName: null,
    lastName: null,
    fullName: player.name,
    nationality: null,
    dateOfBirth: null,
    heightCm: null,
    weightKg: null,
    position: player.position,
    preferredFoot: "UNKNOWN",
    photoUrl: player.photoUrl,
    currentTeam: team,
    shirtNumber: player.shirtNumber,
    marketValue: null,
    averageRating: null,
  };
}
