import { readLatestPrematchInsight } from "@/lib/ai/db";
import { countCompletedTeamFixturesBefore } from "@/lib/analytics/team-history-query";
import { evaluateFixtureDependencyCompleteness } from "@/lib/ingestion/ingestion-result";
import { findCompetition } from "@/lib/competitions";
import { buildPrematchFeatures } from "@/lib/models/features";
import {
  mapPredictionRowToResult,
  readLatestPrematchPrediction,
  resolveFixtureUuidByExternalId,
} from "@/lib/predictions/db";
import { buildPrematchContext } from "@/lib/services/aiContextService";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase";
import type { PrematchFeatureVector } from "@/types/prediction";

import { getLifecycleTodayDateKey, LIFECYCLE_TIMEZONE } from "./constants";
import {
  evaluateFixtureReadiness,
  type FixtureEvaluationInput,
} from "./evaluate";
import {
  addDaysToDateKey,
  startOfDayUtcForTimezone,
} from "@/lib/datetime/timezone";
import type { FixtureReadinessSnapshot } from "./types";

async function loadDependencyCounts(fixtureUuid: string): Promise<{
  lineupsCount: number;
  sidelinedCount: number;
  eventsCount: number;
  statisticsCount: number;
}> {
  const client = createAdminClient();
  const [lineups, sidelined, events, statistics] = await Promise.all([
    client
      .from("lineups")
      .select("*", { count: "exact", head: true })
      .eq("fixture_id", fixtureUuid),
    client
      .from("fixture_sidelined_players")
      .select("*", { count: "exact", head: true })
      .eq("fixture_id", fixtureUuid),
    client
      .from("fixture_events")
      .select("*", { count: "exact", head: true })
      .eq("fixture_id", fixtureUuid),
    client
      .from("fixture_statistics")
      .select("*", { count: "exact", head: true })
      .eq("fixture_id", fixtureUuid),
  ]);

  return {
    lineupsCount: lineups.count ?? 0,
    sidelinedCount: sidelined.count ?? 0,
    eventsCount: events.count ?? 0,
    statisticsCount: statistics.count ?? 0,
  };
}

async function buildEvaluationInput(input: {
  providerId: number;
  nowMs?: number;
}): Promise<FixtureEvaluationInput | null> {
  const fixture = await resolveFixtureUuidByExternalId(input.providerId);
  if (!fixture) {
    return null;
  }

  const client = createAdminClient();
  const { data: row, error } = await client
    .from("fixtures")
    .select(
      `
      id,
      provider_id,
      status,
      kickoff_at,
      last_provider_sync_at,
      home_team_id,
      away_team_id,
      league:leagues (provider_id)
    `
    )
    .eq("id", fixture.id)
    .maybeSingle();

  if (error || !row) {
    return null;
  }

  const leagueProviderId =
    (row.league as { provider_id?: number } | null)?.provider_id ?? null;
  const competition =
    leagueProviderId != null ? findCompetition(leagueProviderId) : undefined;

  const [features, counts, predictionRow, insightRow, homeHist, awayHist] =
    await Promise.all([
      buildPrematchFeatures(input.providerId, {
        fixtureExternalId: input.providerId,
      }),
      loadDependencyCounts(row.id),
      readLatestPrematchPrediction(row.id),
      readLatestPrematchInsight(row.id),
      countCompletedTeamFixturesBefore({
        teamUuid: row.home_team_id,
        beforeAt: row.kickoff_at,
      }),
      countCompletedTeamFixturesBefore({
        teamUuid: row.away_team_id,
        beforeAt: row.kickoff_at,
      }),
    ]);

  const postmatch = await evaluateFixtureDependencyCompleteness(
    client,
    row.id,
    {
      fixtureStatus: row.status,
      kickoffAt: row.kickoff_at,
      competition,
    }
  );

  let currentContextHash: string | null = null;
  if (features && predictionRow) {
    try {
      const mapped = mapPredictionRowToResult(
        predictionRow,
        input.providerId,
        "1.0.0",
        true
      );
      const ctx = await buildPrematchContext(input.providerId, mapped);
      currentContextHash = ctx.contextHash;
    } catch {
      currentContextHash = null;
    }
  }

  return {
    fixtureUuid: row.id,
    providerId: row.provider_id,
    status: row.status,
    kickoffAt: row.kickoff_at,
    lastProviderSyncAt: row.last_provider_sync_at,
    nowMs: input.nowMs,
    features,
    homeHistoryCount: homeHist,
    awayHistoryCount: awayHist,
    lineupsCount: counts.lineupsCount,
    sidelinedCount: counts.sidelinedCount,
    eventsCount: counts.eventsCount,
    statisticsCount: counts.statisticsCount,
    postmatchDepsComplete: postmatch.complete,
    prediction: predictionRow
      ? {
          id: predictionRow.id,
          createdAt: predictionRow.created_at,
          inputSnapshot: predictionRow.input_snapshot as PrematchFeatureVector,
        }
      : null,
    prematchInsight: insightRow
      ? {
          id: insightRow.id,
          contextHash: insightRow.context_hash,
          createdAt: insightRow.created_at,
        }
      : null,
    currentContextHash,
  };
}

export async function evaluateFixtureReadinessForProvider(
  providerId: number,
  nowMs?: number
): Promise<FixtureReadinessSnapshot | null> {
  const evalInput = await buildEvaluationInput({ providerId, nowMs });
  if (!evalInput) {
    return null;
  }
  return evaluateFixtureReadiness(evalInput);
}

export async function evaluateAndPersistFixtureReadiness(input: {
  providerId?: number;
  fixtureUuid?: string;
  nowMs?: number;
}): Promise<FixtureReadinessSnapshot | null> {
  let providerId = input.providerId;
  if (!providerId && input.fixtureUuid) {
    const client = createAdminClient();
    const { data } = await client
      .from("fixtures")
      .select("provider_id")
      .eq("id", input.fixtureUuid)
      .maybeSingle();
    providerId = data?.provider_id;
  }

  if (!providerId) {
    return null;
  }

  const snapshot = await evaluateFixtureReadinessForProvider(
    providerId,
    input.nowMs
  );
  if (!snapshot) {
    return null;
  }

  const client = createAdminClient();
  const { error } = await client
    .from("fixtures")
    .update({
      fixture_readiness: snapshot as unknown as Json,
      fixture_readiness_updated_at: snapshot.evaluatedAt,
    })
    .eq("provider_id", providerId);

  if (error) {
    throw new Error(`Failed to persist fixture readiness: ${error.message}`);
  }

  return snapshot;
}

export async function refreshReadinessBatch(
  providerIds: readonly number[]
): Promise<number> {
  let updated = 0;
  for (const providerId of providerIds) {
    try {
      const result = await evaluateAndPersistFixtureReadiness({ providerId });
      if (result) {
        updated += 1;
      }
    } catch (error) {
      console.error(`[fixture-readiness] fixture ${providerId}`, error);
    }
  }
  return updated;
}

/** Belgrade today through +7d kickoff window — fixes FR-09 scope. */
export async function refreshReadinessForKickoffWindow(
  now = new Date()
): Promise<number> {
  const todayKey = getLifecycleTodayDateKey(now);
  const toKey = addDaysToDateKey(todayKey, 8);
  const fromUtc = startOfDayUtcForTimezone(todayKey, LIFECYCLE_TIMEZONE);
  const toUtc = startOfDayUtcForTimezone(toKey, LIFECYCLE_TIMEZONE);

  const client = createAdminClient();
  const { data, error } = await client
    .from("fixtures")
    .select("provider_id")
    .gte("kickoff_at", fromUtc)
    .lt("kickoff_at", toUtc)
    .in("status", [
      "NS",
      "TBD",
      "1H",
      "HT",
      "2H",
      "ET",
      "BT",
      "P",
      "LIVE",
      "INT",
      "SUSP",
      "FT",
      "AET",
      "PEN",
    ]);

  if (error) {
    throw new Error(
      `Failed to load fixtures for readiness refresh: ${error.message}`
    );
  }

  const ids = (data ?? []).map((row) => row.provider_id);
  return refreshReadinessBatch(ids);
}

export async function readPersistedFixtureReadiness(
  providerId: number
): Promise<FixtureReadinessSnapshot | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("fixtures")
    .select("fixture_readiness")
    .eq("provider_id", providerId)
    .maybeSingle();

  if (error || !data?.fixture_readiness) {
    return null;
  }

  const raw = data.fixture_readiness as FixtureReadinessSnapshot;
  if (raw.version !== 1) {
    return null;
  }
  return raw;
}
