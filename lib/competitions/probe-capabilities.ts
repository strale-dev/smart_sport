import {
  getFixtureEvents,
  getFixtureLineups,
  getFixtureStatistics,
  listRecentFixturesByLeagueSeason,
} from "@/lib/api-football/endpoints/fixtures";
import {
  getStandings,
  listSeasonsByLeague,
} from "@/lib/api-football/endpoints/leagues";
import type { CompetitionCapabilityProbeResult } from "@/lib/competitions/merge-probed-capabilities";
import type { CompetitionDefinition } from "@/lib/competitions/types";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import type { Fixture } from "@/types/domain";

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

async function probeProviderCall<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    console.warn(`[capability-probe] ${label} failed`, error);
    return { ok: false };
  }
}

function resolveProbeSeasonYear(
  seasons: Awaited<ReturnType<typeof listSeasonsByLeague>>
): number | null {
  const current = seasons.find((season) => season.isCurrent);
  if (current) {
    return current.year;
  }

  const sorted = [...seasons].sort((left, right) => right.year - left.year);
  return sorted[0]?.year ?? null;
}

function pickSampleFixture(fixtures: Fixture[]): Fixture | null {
  const finished = fixtures.filter((fixture) =>
    FINISHED_STATUSES.has(fixture.status)
  );
  if (finished.length === 0) {
    return null;
  }

  return finished[finished.length - 1] ?? null;
}

export async function probeCompetitionCapabilities(
  competition: CompetitionDefinition
): Promise<CompetitionCapabilityProbeResult> {
  const capabilities: CompetitionCapabilityProbeResult["capabilities"] = {};
  let seasonYear: number | null = null;
  let sampleFixtureId: number | null = null;

  await throttleProviderRequest();
  const seasons = await listSeasonsByLeague(competition.providerId);
  seasonYear = resolveProbeSeasonYear(seasons);

  if (seasonYear != null) {
    await throttleProviderRequest();
    const standingsGroups = await getStandings(
      competition.providerId,
      seasonYear
    );
    const hasStandings = standingsGroups.some((group) => group.rows.length > 0);
    capabilities.standings = hasStandings;

    await throttleProviderRequest();
    const fixtures = await listRecentFixturesByLeagueSeason(
      competition.providerId,
      seasonYear,
      20
    );
    const sample = pickSampleFixture(fixtures);

    if (sample) {
      sampleFixtureId = sample.externalId;

      await throttleProviderRequest();
      const eventsResult = await probeProviderCall(
        `fixture ${sample.externalId} events`,
        () => getFixtureEvents(sample.externalId)
      );
      capabilities.fixtureEvents = eventsResult.ok
        ? eventsResult.value.length > 0
        : false;

      await throttleProviderRequest();
      const statisticsResult = await probeProviderCall(
        `fixture ${sample.externalId} statistics`,
        () => getFixtureStatistics(sample.externalId)
      );
      capabilities.fixtureStatistics = statisticsResult.ok
        ? statisticsResult.value.length > 0
        : false;

      await throttleProviderRequest();
      const lineupsResult = await probeProviderCall(
        `fixture ${sample.externalId} lineups`,
        () => getFixtureLineups(sample.externalId)
      );
      capabilities.lineups = lineupsResult.ok
        ? lineupsResult.value.length > 0
        : false;
    } else {
      capabilities.fixtureEvents = false;
      capabilities.fixtureStatistics = false;
      capabilities.lineups = false;
    }
  } else {
    capabilities.standings = false;
    capabilities.fixtureEvents = false;
    capabilities.fixtureStatistics = false;
    capabilities.lineups = false;
  }

  return {
    providerId: competition.providerId,
    seasonYear,
    sampleFixtureId,
    capabilities,
  };
}
