import type { StandingsGroup } from "@/types/domain";

export function selectRelevantStandingsGroup(
  groups: StandingsGroup[],
  homeTeamExternalId: number,
  awayTeamExternalId: number
): StandingsGroup | null {
  if (groups.length === 0) {
    return null;
  }

  const sharedGroup = groups.find(
    (group) =>
      group.groupName !== "Overall" &&
      group.rows.some((row) => row.team.externalId === homeTeamExternalId) &&
      group.rows.some((row) => row.team.externalId === awayTeamExternalId)
  );

  if (sharedGroup) {
    return sharedGroup;
  }

  return (
    groups.find((group) => group.groupName === "Overall") ?? groups[0] ?? null
  );
}
