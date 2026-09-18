import type { OverviewCardId } from "@/lib/fixtures/overview-layout";

/**
 * Provider call groups behind the Overview blocks. A group is "failed" only when
 * the provider errored — a successful call that returned nothing stays "ok" so
 * the block can render its genuine empty state.
 */
export type MatchOverviewDataGroup =
  "matchDetails" | "lineups" | "form" | "h2h" | "standings";

export type MatchOverviewHydrateReport = {
  failedGroups: MatchOverviewDataGroup[];
};

export const EMPTY_HYDRATE_REPORT: MatchOverviewHydrateReport = {
  failedGroups: [],
};

const CARDS_BY_GROUP: Record<MatchOverviewDataGroup, OverviewCardId[]> = {
  matchDetails: ["timeline", "momentum", "playerOfMatch", "playersToWatch"],
  lineups: ["lineupTeaser"],
  form: ["formPreview"],
  h2h: ["h2hCompact"],
  standings: ["standingsSnippet"],
};

export type UnavailableOverviewCards = ReadonlySet<OverviewCardId>;

export function getUnavailableOverviewCards(
  report: MatchOverviewHydrateReport
): UnavailableOverviewCards {
  const cards = new Set<OverviewCardId>();

  for (const group of report.failedGroups) {
    for (const cardId of CARDS_BY_GROUP[group]) {
      cards.add(cardId);
    }
  }

  return cards;
}
