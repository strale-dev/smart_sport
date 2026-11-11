import * as Sentry from "@sentry/nextjs";

import { FINISHED_STATUSES, LIVE_STATUSES } from "@/lib/ai/status-map";
import type { FixtureStatus } from "@/types/domain";
import { canGeneratePrematchNarrative } from "@/lib/ai/prematch-availability";
import { resolvePrematchModelTier } from "@/lib/predictions/prematch-validation";
import { generatePrematchInsight } from "@/lib/services/aiService";
import { getOrComputePrematch } from "@/lib/services/predictionService";
import type {
  PrematchFeatureVector,
  WinProbabilities,
} from "@/types/prediction";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveCronOutcome } from "@/lib/ingestion/cron-outcome";
import { logIngestionEvent } from "@/lib/ingestion/ingestion-observability";
import { evaluateAndPersistFixtureReadiness } from "@/lib/fixtures/readiness/persist";
import type { FixtureReadinessSnapshot } from "@/lib/fixtures/readiness";

export type WarmAiPrematchScope = "daily" | "imminent" | "backfill" | "drain";

/** Leave headroom under route maxDuration (60s) and GHA trigger timeout (58s). */
const RUN_BUDGET_MS = 52_000;
const DAILY_MAX_FIXTURES = 40;
const IMMINENT_MAX_FIXTURES = 25;
const DEFAULT_BACKFILL_MAX_FIXTURES = 50;
const BACKFILL_LOOKBACK_MS = 14 * 86_400_000;
/** Leave enough of the 52s budget for at least one LLM call. */
const PREDICTION_WARM_RESERVE_MS = 28_000;
const PREDICTION_WARM_MAX = 12;

function getBackfillMaxFixtures(): number {
  const raw = process.env.WARM_AI_BACKFILL_MAX_FIXTURES;
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_BACKFILL_MAX_FIXTURES;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_BACKFILL_MAX_FIXTURES;
}

const BACKFILL_STATUSES: FixtureStatus[] = [
  ...LIVE_STATUSES,
  ...FINISHED_STATUSES,
];

export function warmWindowBoundsForScope(
  scope: WarmAiPrematchScope,
  now = Date.now()
): {
  from: string;
  to: string;
} {
  if (scope === "imminent") {
    return {
      from: new Date(now).toISOString(),
      to: new Date(now + 90 * 60_000).toISOString(),
    };
  }

  if (scope === "backfill") {
    return {
      from: new Date(now - BACKFILL_LOOKBACK_MS).toISOString(),
      to: new Date(now).toISOString(),
    };
  }

  if (scope === "drain") {
    return {
      from: new Date(now).toISOString(),
      to: new Date(now + 36 * 3_600_000).toISOString(),
    };
  }

  return {
    from: new Date(now).toISOString(),
    to: new Date(now + 36 * 3_600_000).toISOString(),
  };
}

type WarmFixtureRow = {
  provider_id: number;
  fixture_readiness: FixtureReadinessSnapshot | null;
  kickoff_at: string;
};

export function isAiGenerationAllowedFromRow(row: WarmFixtureRow): boolean {
  const gates = row.fixture_readiness?.gates;
  return gates?.aiGenerationAllowed === true;
}

export async function evaluateNullWarmReadinessRows(
  rows: WarmFixtureRow[],
  budget: number
): Promise<{ rows: WarmFixtureRow[]; evaluated: number }> {
  const updated = [...rows];
  let evaluated = 0;

  for (
    let index = 0;
    index < updated.length && evaluated < budget;
    index += 1
  ) {
    if (updated[index].fixture_readiness != null) {
      continue;
    }

    const snapshot = await evaluateAndPersistFixtureReadiness({
      providerId: updated[index].provider_id,
    });
    evaluated += 1;
    if (snapshot) {
      updated[index] = {
        ...updated[index],
        fixture_readiness: snapshot,
      };
    }
  }

  return { rows: updated, evaluated };
}

function isPredictionReadyFromRow(row: WarmFixtureRow): boolean {
  return row.fixture_readiness?.gates?.predictionReady === true;
}

function hasCurrentPrematchInsight(row: WarmFixtureRow): boolean {
  const insight = row.fixture_readiness?.artifacts?.aiPrematch;
  return Boolean(
    insight?.insightId && insight.matchesCurrentInputs && !insight.stale
  );
}

function sortWarmCandidates(rows: WarmFixtureRow[]): WarmFixtureRow[] {
  return [...rows].sort((left, right) => {
    const leftEligible = isAiGenerationAllowedFromRow(left) ? 1 : 0;
    const rightEligible = isAiGenerationAllowedFromRow(right) ? 1 : 0;
    if (leftEligible !== rightEligible) {
      return rightEligible - leftEligible;
    }

    const leftReady = isPredictionReadyFromRow(left) ? 1 : 0;
    const rightReady = isPredictionReadyFromRow(right) ? 1 : 0;
    if (leftReady !== rightReady) {
      return rightReady - leftReady;
    }

    return (
      new Date(left.kickoff_at).getTime() - new Date(right.kickoff_at).getTime()
    );
  });
}

export function selectWarmCandidateProviderIds(
  rows: WarmFixtureRow[],
  limit: number
): number[] {
  return sortWarmCandidates(rows)
    .filter(
      (row) =>
        isAiGenerationAllowedFromRow(row) || !hasCurrentPrematchInsight(row)
    )
    .slice(0, limit)
    .map((row) => row.provider_id);
}

export type WarmWorkBand = "imminent" | "daily" | "backfill";

export type WarmWorkItem = {
  providerId: number;
  kickoffAt: string;
  band: WarmWorkBand;
  hasPrediction: boolean;
  specific: boolean;
  hasInsight: boolean;
};

function compareWarmWork(left: WarmWorkItem, right: WarmWorkItem): number {
  const rank: Record<WarmWorkBand, number> = {
    imminent: 0,
    daily: 1,
    backfill: 2,
  };
  if (rank[left.band] !== rank[right.band]) {
    return rank[left.band] - rank[right.band];
  }

  const leftKick = new Date(left.kickoffAt).getTime();
  const rightKick = new Date(right.kickoffAt).getTime();
  if (left.band === "backfill") {
    return rightKick - leftKick;
  }
  return leftKick - rightKick;
}

export function selectPredictionWarmProviderIds(
  items: WarmWorkItem[],
  limit: number
): number[] {
  return items
    .filter((item) => item.band !== "backfill" && !item.hasPrediction)
    .sort(compareWarmWork)
    .slice(0, limit)
    .map((item) => item.providerId);
}

export function selectNarrativeWarmProviderIds(
  items: WarmWorkItem[],
  limit: number
): number[] {
  return items
    .filter((item) => item.hasPrediction && item.specific && !item.hasInsight)
    .sort(compareWarmWork)
    .slice(0, limit)
    .map((item) => item.providerId);
}

type FixtureWindowRow = {
  id: string;
  provider_id: number;
  kickoff_at: string;
};

type StoredPredictionRow = {
  fixture_id: string;
  created_at: string;
  home_win_prob: number | string;
  draw_prob: number | string;
  away_win_prob: number | string;
  input_snapshot: unknown;
};

function includesUpcoming(scope: WarmAiPrematchScope): boolean {
  return scope === "daily" || scope === "imminent" || scope === "drain";
}

function includesBackfill(scope: WarmAiPrematchScope): boolean {
  return scope === "backfill" || scope === "drain";
}

function isSpecificStoredPrediction(row: StoredPredictionRow): boolean {
  if (!row.input_snapshot || typeof row.input_snapshot !== "object") {
    return false;
  }

  const winProbabilities: WinProbabilities = {
    home: Number(row.home_win_prob),
    draw: Number(row.draw_prob),
    away: Number(row.away_win_prob),
  };
  if (
    !Number.isFinite(winProbabilities.home) ||
    !Number.isFinite(winProbabilities.draw) ||
    !Number.isFinite(winProbabilities.away)
  ) {
    return false;
  }

  return canGeneratePrematchNarrative(
    row.input_snapshot as PrematchFeatureVector,
    {
      winProbabilities,
      modelTier: resolvePrematchModelTier(
        row.input_snapshot as PrematchFeatureVector,
        winProbabilities
      ),
    }
  );
}

function pickStoredPrediction(
  rows: StoredPredictionRow[],
  kickoffAt: string,
  officialOnly: boolean
): StoredPredictionRow | null {
  const kickoffMs = new Date(kickoffAt).getTime();
  const eligible = officialOnly
    ? rows.filter((row) => new Date(row.created_at).getTime() < kickoffMs)
    : rows;
  if (eligible.length === 0) {
    return null;
  }

  return [...eligible].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  )[0];
}

async function fetchFixtureWindow(input: {
  statuses: FixtureStatus[];
  from: string;
  to: string;
  ascending: boolean;
  limit: number;
}): Promise<FixtureWindowRow[]> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("fixtures")
    .select("id, provider_id, kickoff_at")
    .in("status", input.statuses)
    .gte("kickoff_at", input.from)
    .lte("kickoff_at", input.to)
    .order("kickoff_at", { ascending: input.ascending })
    .limit(input.limit);

  if (error) {
    throw new Error(`Failed to load warm fixtures: ${error.message}`);
  }

  return (data ?? []) as FixtureWindowRow[];
}

async function loadRowsForFixtures<T>(
  fixtureIds: string[],
  loadChunk: (chunk: string[]) => Promise<T[]>
): Promise<T[]> {
  const rows: T[] = [];
  for (let index = 0; index < fixtureIds.length; index += 80) {
    rows.push(...(await loadChunk(fixtureIds.slice(index, index + 80))));
  }
  return rows;
}

async function annotateWarmFixtures(
  fixtures: FixtureWindowRow[],
  bandFor: (kickoffAt: string) => WarmWorkBand,
  officialOnly: boolean
): Promise<WarmWorkItem[]> {
  if (fixtures.length === 0) {
    return [];
  }

  const client = createAdminClient();
  const fixtureIds = fixtures.map((row) => row.id);
  const [predictionRows, insightRows] = await Promise.all([
    loadRowsForFixtures(fixtureIds, async (chunk) => {
      const { data, error } = await client
        .from("predictions")
        .select(
          "fixture_id, created_at, home_win_prob, draw_prob, away_win_prob, input_snapshot"
        )
        .eq("type", "PREMATCH")
        .in("fixture_id", chunk);
      if (error) {
        throw new Error(`Failed to load warm predictions: ${error.message}`);
      }
      return (data ?? []) as StoredPredictionRow[];
    }),
    loadRowsForFixtures(fixtureIds, async (chunk) => {
      const { data, error } = await client
        .from("ai_insights")
        .select("fixture_id")
        .eq("type", "PREMATCH")
        .in("fixture_id", chunk);
      if (error) {
        throw new Error(`Failed to load warm insights: ${error.message}`);
      }
      return (data ?? []) as { fixture_id: string | null }[];
    }),
  ]);

  const predictionsByFixture = new Map<string, StoredPredictionRow[]>();
  for (const row of predictionRows) {
    const existing = predictionsByFixture.get(row.fixture_id) ?? [];
    existing.push(row);
    predictionsByFixture.set(row.fixture_id, existing);
  }

  const withInsight = new Set(
    insightRows
      .map((row) => row.fixture_id)
      .filter((id): id is string => id != null)
  );

  return fixtures.map((fixture) => {
    const prediction = pickStoredPrediction(
      predictionsByFixture.get(fixture.id) ?? [],
      fixture.kickoff_at,
      officialOnly
    );
    return {
      providerId: fixture.provider_id,
      kickoffAt: fixture.kickoff_at,
      band: bandFor(fixture.kickoff_at),
      hasPrediction: prediction != null,
      specific: prediction != null && isSpecificStoredPrediction(prediction),
      hasInsight: withInsight.has(fixture.id),
    };
  });
}

async function loadWarmWorkItems(
  scope: WarmAiPrematchScope,
  now = Date.now()
): Promise<WarmWorkItem[]> {
  const items: WarmWorkItem[] = [];

  if (includesUpcoming(scope)) {
    const horizonMs = scope === "imminent" ? 90 * 60_000 : 36 * 3_600_000;
    const fetchLimit =
      scope === "imminent" ? IMMINENT_MAX_FIXTURES * 4 : DAILY_MAX_FIXTURES * 2;
    const fixtures = await fetchFixtureWindow({
      statuses: ["NS", "TBD"],
      from: new Date(now).toISOString(),
      to: new Date(now + horizonMs).toISOString(),
      ascending: true,
      limit: fetchLimit,
    });
    const imminentCutoff = now + 90 * 60_000;
    items.push(
      ...(await annotateWarmFixtures(
        fixtures,
        (kickoffAt) =>
          new Date(kickoffAt).getTime() <= imminentCutoff
            ? "imminent"
            : "daily",
        false
      ))
    );
  }

  if (includesBackfill(scope)) {
    const { from, to } = warmWindowBoundsForScope("backfill", now);
    const fixtures = await fetchFixtureWindow({
      statuses: BACKFILL_STATUSES,
      from,
      to,
      ascending: false,
      limit: getBackfillMaxFixtures() * 4,
    });
    items.push(
      ...(await annotateWarmFixtures(fixtures, () => "backfill", true))
    );
  }

  return items;
}

async function warmMissingPredictions(
  providerIds: number[],
  startedAt: number
): Promise<number> {
  let written = 0;

  for (const fixtureId of providerIds) {
    if (Date.now() - startedAt >= RUN_BUDGET_MS - PREDICTION_WARM_RESERVE_MS) {
      break;
    }

    try {
      const prediction = await getOrComputePrematch(fixtureId);
      if (prediction && !prediction.fromCache) {
        written += 1;
      }
    } catch (error) {
      console.error(`[warm-ai-prematch] prediction ${fixtureId}`, error);
    }
  }

  return written;
}

export async function warmAiPrematchInsights(
  scope: WarmAiPrematchScope = "daily"
): Promise<{
  ok: boolean;
  job: string;
  degraded?: boolean;
  stats: {
    scope: WarmAiPrematchScope;
    candidates: number;
    readinessEvaluated: number;
    processed: number;
    stoppedEarly: boolean;
    generated: number;
    cached: number;
    fallback: number;
    unavailable: number;
    errors: number;
    predictionsWritten: number;
  };
}> {
  const startedAt = Date.now();
  const initialWork = await loadWarmWorkItems(scope);
  const predictionsWritten =
    scope === "backfill"
      ? 0
      : await warmMissingPredictions(
          selectPredictionWarmProviderIds(initialWork, PREDICTION_WARM_MAX),
          startedAt
        );
  const work =
    predictionsWritten > 0 ? await loadWarmWorkItems(scope) : initialWork;
  const fixtureIds = selectNarrativeWarmProviderIds(
    work,
    getBackfillMaxFixtures()
  );

  let generated = 0;
  let cached = 0;
  let fallback = 0;
  let unavailable = 0;
  let errors = 0;
  let processed = 0;
  let stoppedEarly = false;

  for (const fixtureId of fixtureIds) {
    if (Date.now() - startedAt >= RUN_BUDGET_MS) {
      stoppedEarly = true;
      break;
    }

    processed += 1;
    try {
      const result = await generatePrematchInsight(fixtureId, {
        trigger: "cron",
      });

      if (result.status === "OK" && result.cached) {
        cached += 1;
      } else if (result.status === "OK") {
        generated += 1;
      } else if (
        result.status === "FALLBACK" ||
        result.status === "GENERATION_FAILED"
      ) {
        fallback += 1;
        logIngestionEvent({
          job_name: "warm-ai-prematch",
          stage: "fixture_unit",
          fixture_id: fixtureId,
          ok: false,
          error_type: "llm_fallback",
          detail: { scope, status: result.status },
        });
      } else if (result.status === "UNAVAILABLE") {
        unavailable += 1;
        logIngestionEvent({
          job_name: "warm-ai-prematch",
          stage: "fixture_unit",
          fixture_id: fixtureId,
          ok: true,
          error_type: "generation_not_allowed",
          detail: {
            scope,
            status: result.status,
            reason: "reason" in result ? result.reason : undefined,
          },
        });
      }
    } catch (error) {
      errors += 1;
      console.error(`[warm-ai-prematch] fixture ${fixtureId}`, error);
      logIngestionEvent({
        job_name: "warm-ai-prematch",
        stage: "fixture_unit",
        fixture_id: fixtureId,
        ok: false,
        error_type: "unknown",
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const stats = {
    scope,
    candidates: fixtureIds.length,
    readinessEvaluated: 0,
    processed,
    stoppedEarly,
    generated,
    cached,
    fallback,
    unavailable,
    errors,
    predictionsWritten,
  };

  Sentry.addBreadcrumb({
    category: "ai.warm",
    message: "warm_ai_prematch_completed",
    level: fallback > 0 || errors > 0 || unavailable > 0 ? "warning" : "info",
    data: stats,
  });

  const failedUnits = fallback + errors;
  const outcome = resolveCronOutcome({
    failedCount: failedUnits,
    partialForTimeBudget:
      stoppedEarly && failedUnits === 0 && generated + cached > 0,
  });

  if (outcome.degraded) {
    Sentry.captureMessage("warm_ai_prematch_degraded", {
      level: "warning",
      extra: stats,
    });
  }

  return {
    ok: outcome.ok,
    degraded: outcome.degraded,
    job: "warm-ai-prematch",
    stats,
  };
}
