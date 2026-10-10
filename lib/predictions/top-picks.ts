import { mapAiInsightRowToStored } from "@/lib/ai/cache";
import { readLatestPrematchInsight } from "@/lib/ai/db";
import { buildMatchHref } from "@/lib/fixtures/match-url";
import { getIngestionConfig } from "@/lib/ingestion/config";
import {
  mapPrematchPredictionRowForFixture,
  readLatestPrematchPrediction,
} from "@/lib/predictions/db";
import {
  confidenceMeetsMinimum,
  resolveTopPicksConfig,
} from "@/lib/predictions/top-picks-config";
import {
  dataQualityMeetsMinimum,
  rankScore,
} from "@/lib/predictions/top-picks-scoring";
import { predictionsTopPicksKey } from "@/lib/redis/keys";
import { peekCachedValue, writeCachedValue } from "@/lib/redis/cache";
import { maxWinProbability } from "@/lib/models/confidence";
import { predictedOutcomeFromProbabilities } from "@/lib/models/confidence";
import {
  startOfDayUtcForTimezone,
  addDaysToDateKey,
} from "@/lib/datetime/timezone";
import {
  getLifecycleTodayDateKey,
  LIFECYCLE_TIMEZONE,
} from "@/lib/fixtures/readiness/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Fixture, FixtureStatus } from "@/types/domain";
import type { AiConfidence, PrematchFeatureVector } from "@/types/prediction";
import type { PredictionDataQuality } from "@/types/prediction";

export type TopPickKeyFactor = {
  label: string;
  evidence?: string;
};

export type TopPick = {
  fixtureExternalId: number;
  fixtureUuid: string;
  kickoffAt: string;
  homeTeamName: string;
  awayTeamName: string;
  leagueName: string;
  predictedOutcome: "1" | "X" | "2";
  modelProbability: number;
  confidence: AiConfidence;
  dataQuality: PredictionDataQuality;
  rankScore: number;
  keyFactors: TopPickKeyFactor[];
  matchHref: string;
  analysisHref: string;
};

export type TopPicksResult = {
  utcDate: string;
  picks: TopPick[];
  generatedAt: string;
};

type FixtureCandidate = {
  fixtureUuid: string;
  fixture: Fixture;
};

function lifecycleTodayDate(now = new Date()): string {
  return getLifecycleTodayDateKey(now);
}

function secondsUntilLifecycleMidnight(now = new Date()): number {
  const todayKey = getLifecycleTodayDateKey(now);
  const end = new Date(
    startOfDayUtcForTimezone(addDaysToDateKey(todayKey, 1), LIFECYCLE_TIMEZONE)
  );
  return Math.max(60, Math.floor((end.getTime() - now.getTime()) / 1000));
}

async function loadUpcomingFixturesTodayLifecycle(
  lifecycleDate: string
): Promise<FixtureCandidate[]> {
  const client = createAdminClient();
  const config = getIngestionConfig();
  const dayStart = startOfDayUtcForTimezone(lifecycleDate, LIFECYCLE_TIMEZONE);
  const dayEnd = startOfDayUtcForTimezone(
    addDaysToDateKey(lifecycleDate, 1),
    LIFECYCLE_TIMEZONE
  );

  const { data: leagues } = await client
    .from("leagues")
    .select("id")
    .in("provider_id", [...config.leagueProviderIds]);

  if (!leagues?.length) {
    return [];
  }

  const { data, error } = await client
    .from("fixtures")
    .select(
      `
      id,
      provider_id,
      kickoff_at,
      status,
      minute,
      status_extra_minute,
      period_first_start_at,
      period_second_start_at,
      last_provider_sync_at,
      referee,
      round,
      score_home,
      score_away,
      ht_home,
      ht_away,
      ft_home,
      ft_away,
      et_home,
      et_away,
      pen_home,
      pen_away,
      home_team:teams!fixtures_home_team_id_fkey (
        provider_id,
        name,
        code,
        logo_url,
        is_national
      ),
      away_team:teams!fixtures_away_team_id_fkey (
        provider_id,
        name,
        code,
        logo_url,
        is_national
      ),
      league:leagues (
        provider_id,
        name,
        type,
        country_name,
        logo_url
      ),
      season:seasons (
        year
      ),
      venue:venues (
        provider_id,
        name,
        city,
        capacity,
        surface,
        image_url
      )
    `
    )
    .in(
      "league_id",
      leagues.map((league) => league.id)
    )
    .gte("kickoff_at", dayStart)
    .lt("kickoff_at", dayEnd)
    .in("status", ["NS", "TBD"])
    .order("kickoff_at", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to load today's fixtures for top picks: ${error.message}`
    );
  }

  return (data ?? []).flatMap((row) => {
    const home = row.home_team;
    const away = row.away_team;
    const league = row.league;
    if (!home || !away || !league) {
      return [];
    }

    const fixture: Fixture = {
      externalId: row.provider_id,
      league: {
        externalId: league.provider_id,
        name: league.name,
        type: league.type,
        country: league.country_name
          ? {
              externalId: null,
              code: null,
              name: league.country_name,
              flagUrl: null,
            }
          : null,
        logoUrl: league.logo_url,
      },
      seasonYear: row.season?.year ?? null,
      homeTeam: {
        externalId: home.provider_id,
        name: home.name,
        code: home.code,
        logoUrl: home.logo_url,
        isNational: home.is_national,
      },
      awayTeam: {
        externalId: away.provider_id,
        name: away.name,
        code: away.code,
        logoUrl: away.logo_url,
        isNational: away.is_national,
      },
      kickoffAt: row.kickoff_at,
      status: row.status as FixtureStatus,
      minute: row.minute,
      score: {
        home: row.score_home,
        away: row.score_away,
        halftimeHome: row.ht_home,
        halftimeAway: row.ht_away,
        fulltimeHome: row.ft_home,
        fulltimeAway: row.ft_away,
        extratimeHome: row.et_home,
        extratimeAway: row.et_away,
        penaltyHome: row.pen_home,
        penaltyAway: row.pen_away,
      },
      venue: row.venue
        ? {
            externalId: row.venue.provider_id,
            name: row.venue.name,
            city: row.venue.city,
            capacity: row.venue.capacity,
            surface: row.venue.surface,
            imageUrl: row.venue.image_url,
          }
        : null,
      referee: row.referee,
      round: row.round,
      liveClock: {
        statusExtraMinute: row.status_extra_minute,
        lastProviderSyncAt: row.last_provider_sync_at,
        periodFirstStartAt: row.period_first_start_at,
        periodSecondStartAt: row.period_second_start_at,
      },
    };

    return [{ fixtureUuid: row.id, fixture }];
  });
}

function keyFactorsFromSnapshot(
  snapshot: PrematchFeatureVector
): TopPickKeyFactor[] {
  const factors: TopPickKeyFactor[] = [];
  const eloDiff = snapshot.eloDiff;
  if (Number.isFinite(eloDiff)) {
    factors.push({
      label: "Elo strength gap",
      evidence:
        eloDiff > 0
          ? "Home side rates stronger on Elo."
          : eloDiff < 0
            ? "Away side rates stronger on Elo."
            : "Teams are closely matched on Elo.",
    });
  }
  if (snapshot.form5HomePpg != null && snapshot.form5AwayPpg != null) {
    factors.push({
      label: "Recent form (5)",
      evidence: `Home ${snapshot.form5HomePpg.toFixed(2)} PPG vs away ${snapshot.form5AwayPpg.toFixed(2)} PPG.`,
    });
  }
  if (factors.length === 0) {
    factors.push({
      label: "Open match analysis",
      evidence: "View the full AI breakdown on the match page.",
    });
  }
  return factors.slice(0, 2);
}

async function resolveKeyFactors(
  fixtureUuid: string,
  fixtureExternalId: number,
  snapshot: PrematchFeatureVector
): Promise<TopPickKeyFactor[]> {
  const insightRow = await readLatestPrematchInsight(fixtureUuid);
  if (insightRow) {
    const stored = mapAiInsightRowToStored(insightRow, fixtureExternalId, true);
    if (stored.keyFactors?.length) {
      return stored.keyFactors.slice(0, 2).map((factor) => ({
        label: factor.label,
        evidence: factor.evidence,
      }));
    }
  }
  return keyFactorsFromSnapshot(snapshot);
}

async function buildPickFromFixture(
  candidate: FixtureCandidate
): Promise<TopPick | null> {
  const { fixtureUuid, fixture } = candidate;
  const predictionRow = await readLatestPrematchPrediction(fixtureUuid);
  if (!predictionRow) {
    return null;
  }

  const config = resolveTopPicksConfig();
  const mapped = await mapPrematchPredictionRowForFixture(
    predictionRow,
    fixture.externalId,
    "1.0.0",
    true
  );
  if (!mapped || mapped.modelTier === "GENERIC_BASELINE") {
    return null;
  }
  const dataQuality = mapped.inputSnapshot.dataQuality;
  const modelProbability = maxWinProbability(mapped.winProbabilities);

  if (modelProbability < config.minModelProbability) {
    return null;
  }
  if (!confidenceMeetsMinimum(mapped.confidence, config.minConfidence)) {
    return null;
  }
  if (!dataQualityMeetsMinimum(dataQuality, config.minDataQuality)) {
    return null;
  }

  const score = rankScore({
    winProbabilities: mapped.winProbabilities,
    confidence: mapped.confidence,
    dataQuality,
  });

  const keyFactors = await resolveKeyFactors(
    fixtureUuid,
    fixture.externalId,
    mapped.inputSnapshot
  );

  const predictedOutcome =
    mapped.predictedOutcome ??
    predictedOutcomeFromProbabilities(mapped.winProbabilities);

  return {
    fixtureExternalId: fixture.externalId,
    fixtureUuid,
    kickoffAt: fixture.kickoffAt,
    homeTeamName: fixture.homeTeam.name,
    awayTeamName: fixture.awayTeam.name,
    leagueName: fixture.league.name,
    predictedOutcome,
    modelProbability,
    confidence: mapped.confidence,
    dataQuality,
    rankScore: score,
    keyFactors,
    matchHref: buildMatchHref(fixture.externalId),
    analysisHref: buildMatchHref(fixture.externalId, "ai"),
  };
}

export async function computeTopPicks(
  now = new Date()
): Promise<TopPicksResult> {
  const utcDate = lifecycleTodayDate(now);
  const config = resolveTopPicksConfig();
  const candidates = await loadUpcomingFixturesTodayLifecycle(utcDate);

  const picks: TopPick[] = [];
  for (const candidate of candidates) {
    const pick = await buildPickFromFixture(candidate);
    if (pick) {
      picks.push(pick);
    }
  }

  picks.sort((a, b) => b.rankScore - a.rankScore);

  return {
    utcDate,
    picks: picks.slice(0, config.limit),
    generatedAt: now.toISOString(),
  };
}

export async function getTopPicksOfTheDay(
  now = new Date()
): Promise<TopPicksResult> {
  const utcDate = lifecycleTodayDate(now);
  const cacheKey = predictionsTopPicksKey(utcDate);
  const cached = await peekCachedValue<TopPicksResult>(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await computeTopPicks(now);
  await writeCachedValue(cacheKey, result, secondsUntilLifecycleMidnight(now));
  return result;
}
