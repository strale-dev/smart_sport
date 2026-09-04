import type { StandingsGroup } from "@/types/domain";

export function selectStandingsGroupForTeam(
  groups: StandingsGroup[],
  teamExternalId: number
): StandingsGroup | null {
  if (groups.length === 0) {
    return null;
  }

  const teamGroup = groups.find(
    (group) =>
      group.groupName !== "Overall" &&
      group.rows.some((row) => row.team.externalId === teamExternalId)
  );

  if (teamGroup) {
    return teamGroup;
  }

  const overallGroup = groups.find((group) => group.groupName === "Overall");
  if (
    overallGroup?.rows.some((row) => row.team.externalId === teamExternalId)
  ) {
    return overallGroup;
  }

  return (
    groups.find((group) =>
      group.rows.some((row) => row.team.externalId === teamExternalId)
    ) ?? null
  );
}
