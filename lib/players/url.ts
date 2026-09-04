export const PLAYER_TABS = [
  "overview",
  "matches",
  "statistics",
  "career",
  "ai",
] as const;

export type PlayerTab = (typeof PLAYER_TABS)[number];

export function parsePlayerTab(value: string | undefined): PlayerTab {
  if (value && PLAYER_TABS.includes(value as PlayerTab)) {
    return value as PlayerTab;
  }

  return "overview";
}

export function parsePlayerPage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function buildPlayerHref(
  playerId: number,
  options?: { tab?: PlayerTab; page?: number }
): string {
  const tab = options?.tab;
  const page = options?.page;

  if ((!tab || tab === "overview") && (!page || page <= 1)) {
    return `/players/${playerId}`;
  }

  const params = new URLSearchParams();

  if (tab && tab !== "overview") {
    params.set("tab", tab);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/players/${playerId}?${query}` : `/players/${playerId}`;
}
