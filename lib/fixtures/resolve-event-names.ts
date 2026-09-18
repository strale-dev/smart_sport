import type { FixtureEvent, Lineup } from "@/types/domain";

function nameFromLineups(
  lineups: Lineup[],
  playerExternalId: number | null
): string | null {
  if (playerExternalId == null) {
    return null;
  }

  for (const lineup of lineups) {
    for (const player of lineup.players) {
      if (player.playerExternalId === playerExternalId) {
        return player.name;
      }
    }
  }

  return null;
}

export function resolveEventPlayerName(
  event: FixtureEvent,
  lineups: Lineup[]
): string | null {
  return (
    event.playerName?.trim() ||
    nameFromLineups(lineups, event.playerExternalId) ||
    null
  );
}

export function resolveEventAssistName(
  event: FixtureEvent,
  lineups: Lineup[]
): string | null {
  return (
    event.assistPlayerName?.trim() ||
    nameFromLineups(lineups, event.assistPlayerExternalId) ||
    null
  );
}
