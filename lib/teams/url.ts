export const TEAM_TABS = [
  "details",
  "matches",
  "standings",
  "squad",
  "statistics",
] as const;

export type TeamTab = (typeof TEAM_TABS)[number];

export function parseTeamTab(value: string | undefined): TeamTab {
  if (value && TEAM_TABS.includes(value as TeamTab)) {
    return value as TeamTab;
  }

  return "details";
}

export function buildTeamHref(teamId: number, tab?: TeamTab): string {
  if (!tab || tab === "details") {
    return `/teams/${teamId}`;
  }

  return `/teams/${teamId}?tab=${tab}`;
}
