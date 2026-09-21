import {
  competitionSupportsLineups,
  competitionSupportsStandings,
} from "@/lib/competitions/capabilities";
import { findCompetition } from "@/lib/competitions/index";
import {
  listHeadToHeadFixturesRaw,
  listTeamLastFixturesRaw,
} from "@/lib/api-football/endpoints/fixtures";
import { ingestLineupsFromProvider } from "@/lib/ingestion/ingest-lineups";
import {
  ingestFixturePlayerPerformancesFromProvider,
  ingestMatchDetailsFromProvider,
} from "@/lib/ingestion/ingest-match-details";
import { ingestStandingsForLeagueSeason } from "@/lib/ingestion/sync-standings";
import {
  fixtureHasLineups,
  fixtureHasMatchDetails,
  fixtureHasPlayerPerformances,
  getFixtureUuidByProviderId,
} from "@/lib/ingestion/match-details-upsert";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import { ingestFixtureFromRaw } from "@/lib/ingestion/upsert";
import { getMatchOverviewRenderMode } from "@/lib/fixtures/overview-layout";
import {
  FORM_LOOKBACK_MATCHES,
  MIN_FORM_MATCHES,
  RECENT_PLAYER_FORM_MATCHES,
  shouldFillTeamForm,
  shouldIngestLineups,
  shouldIngestLiveOrFinishedDetails,
} from "@/lib/match/overview-hydrate-policy";
import { ensureFixturePersisted } from "@/lib/ingestion/ensure-fixture-persisted";
import {
  EMPTY_HYDRATE_REPORT,
  type MatchOverviewDataGroup,
  type MatchOverviewHydrateReport,
} from "@/lib/match/overview-block-status";
import { LockNotAcquiredError, isLockHeld, withLock } from "@/lib/redis/lock";
import { overviewHydrateLockKey } from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Fixture } from "@/types/domain";

const HYDRATE_LOCK_WAIT_MS = 45_000;
const HYDRATE_LOCK_POLL_MS = 400;

const FINISHED_STATUSES = ["FT", "AET", "PEN"] as const;

async function countFinishedTeamFixtures(
  teamProviderId: number
): Promise<number> {
  const client = createAdminClient();
  const { data: team, error: teamError } = await client
    .from("teams")
    .select("id")
    .eq("provider_id", teamProviderId)
    .maybeSingle();

  if (teamError) {
    throw new Error(
      `Failed to resolve team ${teamProviderId}: ${teamError.message}`
    );
  }

  if (!team) {
    return 0;
  }

  const { count, error } = await client
    .from("fixtures")
    .select("*", { count: "exact", head: true })
    .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
    .in("status", [...FINISHED_STATUSES])
    .not("score_home", "is", null);

  if (error) {
    throw new Error(
      `Failed to count finished fixtures for team ${teamProviderId}: ${error.message}`
    );
  }

  return count ?? 0;
}

async function ingestRawFixtureList(
  rawList: Awaited<ReturnType<typeof listTeamLastFixturesRaw>>
): Promise<void> {
  const client = createAdminClient();

  for (const raw of rawList) {
    await ingestFixtureFromRaw(client, raw);
  }
}

async function fillTeamFormIfThin(teamProviderId: number): Promise<boolean> {
  const finishedCount = await countFinishedTeamFixtures(teamProviderId);
  if (!shouldFillTeamForm(finishedCount)) {
    return true;
  }

  try {
    await throttleProviderRequest();
    const raw = await listTeamLastFixturesRaw(
      teamProviderId,
      FORM_LOOKBACK_MATCHES
    );
    await ingestRawFixtureList(raw);
    return true;
  } catch (error) {
    console.warn("[overview] team form backfill failed", error);
    return false;
  }
}

async function countH2HFinishedMeetings(
  homeTeamId: number,
  awayTeamId: number
): Promise<number> {
  const client = createAdminClient();
  const { data: teams, error } = await client
    .from("teams")
    .select("id, provider_id")
    .in("provider_id", [homeTeamId, awayTeamId]);

  if (error) {
    throw new Error(`Failed to resolve H2H teams: ${error.message}`);
  }

  const homeUuid = teams?.find((row) => row.provider_id === homeTeamId)?.id;
  const awayUuid = teams?.find((row) => row.provider_id === awayTeamId)?.id;
  if (!homeUuid || !awayUuid) {
    return 0;
  }

  const { count, error: countError } = await client
    .from("fixtures")
    .select("*", { count: "exact", head: true })
    .in("status", [...FINISHED_STATUSES])
    .not("score_home", "is", null)
    .not("score_away", "is", null)
    .or(
      `and(home_team_id.eq.${homeUuid},away_team_id.eq.${awayUuid}),and(home_team_id.eq.${awayUuid},away_team_id.eq.${homeUuid})`
    );

  if (countError) {
    throw new Error(`Failed to count H2H meetings: ${countError.message}`);
  }

  return count ?? 0;
}

async function fillH2HIfMissing(
  homeTeamId: number,
  awayTeamId: number
): Promise<boolean> {
  const existing = await countH2HFinishedMeetings(homeTeamId, awayTeamId);
  if (existing >= MIN_FORM_MATCHES) {
    return true;
  }

  try {
    await throttleProviderRequest();
    const raw = await listHeadToHeadFixturesRaw(homeTeamId, awayTeamId);
    await ingestRawFixtureList(raw);
    return true;
  } catch (error) {
    console.warn("[overview] H2H provider backfill failed", error);
    return false;
  }
}

async function listRecentScoredFixtureProviderIds(
  teamProviderId: number,
  limit: number
): Promise<number[]> {
  const client = createAdminClient();
  const { data: team, error: teamError } = await client
    .from("teams")
    .select("id")
    .eq("provider_id", teamProviderId)
    .maybeSingle();

  if (teamError) {
    throw new Error(
      `Failed to resolve team ${teamProviderId}: ${teamError.message}`
    );
  }

  if (!team) {
    return [];
  }

  const { data, error } = await client
    .from("fixtures")
    .select("provider_id")
    .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
    .in("status", [...FINISHED_STATUSES])
    .not("score_home", "is", null)
    .order("kickoff_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(
      `Failed to list recent fixtures for team ${teamProviderId}: ${error.message}`
    );
  }

  return (data ?? []).map((row) => row.provider_id);
}

async function fillRecentPlayerPerformances(
  teamProviderId: number
): Promise<void> {
  const fixtureProviderIds = await listRecentScoredFixtureProviderIds(
    teamProviderId,
    RECENT_PLAYER_FORM_MATCHES
  );
  const client = createAdminClient();

  for (const fixtureProviderId of fixtureProviderIds) {
    const fixtureUuid = await getFixtureUuidByProviderId(
      client,
      fixtureProviderId
    );
    if (!fixtureUuid) {
      continue;
    }

    const hasPlayers = await fixtureHasPlayerPerformances(client, fixtureUuid);
    if (hasPlayers) {
      continue;
    }

    await ingestFixturePlayerPerformancesFromProvider(fixtureProviderId);
  }
}

async function waitForOverviewHydrateLock(
  fixtureProviderId: number
): Promise<void> {
  const lockKey = overviewHydrateLockKey(fixtureProviderId);
  const deadline = Date.now() + HYDRATE_LOCK_WAIT_MS;

  while (Date.now() < deadline) {
    const held = await isLockHeld(lockKey);
    if (!held) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, HYDRATE_LOCK_POLL_MS);
    });
  }
}

async function hydrateUnlocked(
  fixture: Fixture
): Promise<MatchOverviewHydrateReport> {
  const renderMode = getMatchOverviewRenderMode(fixture.status);
  const client = createAdminClient();
  const fixtureUuid = await ensureFixturePersisted(fixture.externalId);
  const failedGroups = new Set<MatchOverviewDataGroup>();

  if (!fixtureUuid) {
    return { failedGroups: [] };
  }

  const [hasEvents, hasPlayers, hasLineups] = await Promise.all([
    fixtureHasMatchDetails(client, fixtureUuid),
    fixtureHasPlayerPerformances(client, fixtureUuid),
    fixtureHasLineups(client, fixtureUuid),
  ]);

  if (
    shouldIngestLiveOrFinishedDetails({
      renderMode,
      hasEvents,
      hasPlayerPerformances: hasPlayers,
    })
  ) {
    try {
      const details = await ingestMatchDetailsFromProvider(fixture.externalId, {
        skipLineups: true,
      });
      if (!details.ok) {
        failedGroups.add("matchDetails");
        if (details.reason) {
          console.warn(
            `[overview] match details not ingested for ${fixture.externalId}: ${details.reason}`
          );
        }
      }
    } catch (error) {
      failedGroups.add("matchDetails");
      console.warn("[overview] match details ingest failed", error);
    }
  }

  // Independent of match details: finished and live fixtures need lineups too,
  // and the details call above deliberately skips them.
  if (
    shouldIngestLineups({ hasLineups, kickoffAt: fixture.kickoffAt }) &&
    competitionSupportsLineups(findCompetition(fixture.league.externalId))
  ) {
    try {
      await ingestLineupsFromProvider(fixture.externalId);
    } catch (error) {
      failedGroups.add("lineups");
      console.warn("[overview] lineups ingest failed", error);
    }
  }

  const [homeFormOk, awayFormOk, h2hOk] = await Promise.all([
    fillTeamFormIfThin(fixture.homeTeam.externalId),
    fillTeamFormIfThin(fixture.awayTeam.externalId),
    fillH2HIfMissing(fixture.homeTeam.externalId, fixture.awayTeam.externalId),
  ]);

  if (!homeFormOk || !awayFormOk) {
    failedGroups.add("form");
  }

  if (!h2hOk) {
    failedGroups.add("h2h");
  }

  if (renderMode === "pre") {
    if (
      fixture.seasonYear &&
      competitionSupportsStandings(findCompetition(fixture.league.externalId))
    ) {
      try {
        await ingestStandingsForLeagueSeason(
          fixture.league.externalId,
          fixture.seasonYear
        );
      } catch (error) {
        failedGroups.add("standings");
        console.warn("[overview] standings ingest failed", error);
      }
    }

    await Promise.all([
      fillRecentPlayerPerformances(fixture.homeTeam.externalId),
      fillRecentPlayerPerformances(fixture.awayTeam.externalId),
    ]);
  }

  return { failedGroups: [...failedGroups] };
}

export async function hydrateMatchOverviewFromProvider(
  fixture: Fixture
): Promise<MatchOverviewHydrateReport> {
  try {
    return await withLock(overviewHydrateLockKey(fixture.externalId), 60, () =>
      hydrateUnlocked(fixture)
    );
  } catch (error) {
    if (error instanceof LockNotAcquiredError) {
      await waitForOverviewHydrateLock(fixture.externalId);
      return EMPTY_HYDRATE_REPORT;
    }

    console.warn("[overview] provider hydrate failed", error);
    return {
      failedGroups: ["matchDetails", "lineups", "form", "h2h", "standings"],
    };
  }
}
