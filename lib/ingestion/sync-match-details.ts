import {
  competitionSupportsFixtureEvents,
  competitionSupportsFixtureStatistics,
  competitionSupportsLineups,
  competitionSupportsPlayerPerformances,
} from "@/lib/competitions/capabilities";
import { findCompetition } from "@/lib/competitions/index";
import { getIngestionConfig } from "@/lib/ingestion/config";
import { ingestLineupsFromProvider } from "@/lib/ingestion/ingest-lineups";
import { ingestMatchDetailsFromProvider } from "@/lib/ingestion/ingest-match-details";
import {
  fixtureHasLineups,
  fixtureHasMatchDetails,
} from "@/lib/ingestion/match-details-upsert";
import { createAdminClient } from "@/lib/supabase/admin";

const TERMINAL_STATUSES = ["FT", "AET", "PEN"] as const;

function competitionNeedsMatchDetailSync(providerId: number): boolean {
  const competition = findCompetition(providerId);
  return (
    competitionSupportsFixtureEvents(competition) ||
    competitionSupportsFixtureStatistics(competition) ||
    competitionSupportsPlayerPerformances(competition) ||
    competitionSupportsLineups(competition)
  );
}

function getMatchDetailsSyncBatch(): number {
  const raw = process.env.MATCH_DETAILS_SYNC_BATCH;
  const parsed = raw ? Number.parseInt(raw, 10) : 10;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

export type SyncMatchDetailsResult = {
  ok: boolean;
  job: string;
  skipped?: boolean;
  reason?: string;
  stats: {
    candidates: number;
    ingested: number;
    apiRequests: number;
  };
};

export async function syncMatchDetails(): Promise<SyncMatchDetailsResult> {
  const config = getIngestionConfig();
  const client = createAdminClient();
  const batchSize = getMatchDetailsSyncBatch();
  const cutoff = new Date(Date.now() - 48 * 3_600_000).toISOString();

  const detailLeagueProviderIds = config.leagueProviderIds.filter((id) =>
    competitionNeedsMatchDetailSync(id)
  );

  const { data: leagues, error: leaguesError } = await client
    .from("leagues")
    .select("id, provider_id")
    .in("provider_id", [...detailLeagueProviderIds]);

  if (leaguesError) {
    throw new Error(`Failed to load leagues: ${leaguesError.message}`);
  }

  if (!leagues?.length) {
    return {
      ok: true,
      job: "sync-match-details",
      skipped: true,
      reason: "No allowlist leagues in database.",
      stats: { candidates: 0, ingested: 0, apiRequests: 0 },
    };
  }

  const leagueIds = leagues.map((league) => league.id);
  const leagueProviderByUuid = new Map(
    leagues.map((league) => [league.id, league.provider_id])
  );

  const { data: fixtures, error: fixturesError } = await client
    .from("fixtures")
    .select("id, provider_id, status, kickoff_at, league_id")
    .in("league_id", leagueIds)
    .in("status", [...TERMINAL_STATUSES])
    .gte("kickoff_at", cutoff)
    .order("kickoff_at", { ascending: false })
    .limit(batchSize * 3);

  if (fixturesError) {
    throw new Error(`Failed to load fixtures: ${fixturesError.message}`);
  }

  type Candidate = {
    provider_id: number;
    needs: "details" | "lineups";
  };

  const candidates: Candidate[] = [];

  for (const fixture of fixtures ?? []) {
    if (candidates.length >= batchSize) {
      break;
    }

    const leagueProviderId = leagueProviderByUuid.get(fixture.league_id);
    if (
      leagueProviderId != null &&
      !competitionNeedsMatchDetailSync(leagueProviderId)
    ) {
      continue;
    }

    const hasDetails = await fixtureHasMatchDetails(client, fixture.id);
    if (!hasDetails) {
      candidates.push({ provider_id: fixture.provider_id, needs: "details" });
      continue;
    }

    const hasLineups = await fixtureHasLineups(client, fixture.id);
    if (
      !hasLineups &&
      competitionSupportsLineups(findCompetition(leagueProviderId ?? -1))
    ) {
      candidates.push({ provider_id: fixture.provider_id, needs: "lineups" });
    }
  }

  let ingested = 0;
  let apiRequests = 0;

  for (const fixture of candidates) {
    if (fixture.needs === "lineups") {
      const result = await ingestLineupsFromProvider(fixture.provider_id);
      apiRequests += result.stats.apiRequests;
      if (result.ok) {
        ingested += 1;
      }
      continue;
    }

    const result = await ingestMatchDetailsFromProvider(fixture.provider_id);
    apiRequests += result.stats.apiRequests;

    if (result.ok) {
      ingested += 1;
    }
  }

  return {
    ok: true,
    job: "sync-match-details",
    stats: {
      candidates: candidates.length,
      ingested,
      apiRequests,
    },
  };
}
