export const PLAYER_TABS = ["overview", "matches", "statistics"] as const;

export type PlayerTab = (typeof PLAYER_TABS)[number];

export function parsePlayerTab(value: string | undefined): PlayerTab {
  if (value && PLAYER_TABS.includes(value as PlayerTab)) {
    return value as PlayerTab;
  }

  return "overview";
}

export function buildPlayerHref(playerId: number, tab?: PlayerTab): string {
  if (!tab || tab === "overview") {
    return `/players/${playerId}`;
  }

  return `/players/${playerId}?tab=${tab}`;
}
