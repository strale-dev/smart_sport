export const MATCH_TABS = ["overview", "ai", "lineups", "form"] as const;

export type MatchTab = (typeof MATCH_TABS)[number];

export function parseMatchTab(value: string | undefined): MatchTab {
  if (value && MATCH_TABS.includes(value as MatchTab)) {
    return value as MatchTab;
  }

  return "overview";
}

export function buildMatchHref(fixtureId: number, tab?: MatchTab): string {
  if (!tab || tab === "overview") {
    return `/matches/${fixtureId}`;
  }

  return `/matches/${fixtureId}?tab=${tab}`;
}
