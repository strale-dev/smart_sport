import { resolveMatchFixtureContext } from "@/lib/match/fixture-context";
import { selectRelevantStandingsGroup } from "@/lib/standings/select-relevant-group";
import type { MomentumBucket } from "@/lib/momentum/computeMatchMomentum";
import type { PlayersToWatchResult } from "@/lib/services/playersToWatchService";
import type {
  Fixture,
  FixtureEvent,
  FixturePlayerPerformance,
  FormSnapshot,
  H2HSummary,
  Lineup,
  StandingsGroup,
} from "@/types/domain";

export function hasTimelineContent(events: FixtureEvent[]): boolean {
  return events.length > 0;
}

export function hasMomentumContent(buckets: MomentumBucket[]): boolean {
  return buckets.some(
    (bucket) => bucket.homeIntensity > 0 || bucket.awayIntensity > 0
  );
}

export function hasH2HContent(h2h: H2HSummary | undefined): boolean {
  return (h2h?.meetings.length ?? 0) > 0;
}

export function hasStandingsSnippetContent(
  fixture: Pick<Fixture, "homeTeam" | "awayTeam" | "league">,
  standings: StandingsGroup[]
): boolean {
  const matchCtx = resolveMatchFixtureContext({
    leagueExternalId: fixture.league.externalId,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
  });

  if (!matchCtx.supportsStandings) {
    return false;
  }

  const group = selectRelevantStandingsGroup(
    standings,
    fixture.homeTeam.externalId,
    fixture.awayTeam.externalId
  );

  if (!group) {
    return false;
  }

  return group.rows.some(
    (row) =>
      row.team.externalId === fixture.homeTeam.externalId ||
      row.team.externalId === fixture.awayTeam.externalId
  );
}

export function hasFormPreviewContent(
  homeForm: FormSnapshot,
  awayForm: FormSnapshot
): boolean {
  return homeForm.results.length > 0 || awayForm.results.length > 0;
}

export function hasPlayersToWatchContent(data: PlayersToWatchResult): boolean {
  return data.players.length > 0;
}

export function hasPlayerOfTheMatchContent(
  player: FixturePlayerPerformance | null | undefined
): boolean {
  return player != null;
}

export function hasLineupTeaserContent(lineups: Lineup[]): boolean {
  return lineups.some((lineup) => lineup.players.length > 0);
}
