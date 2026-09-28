import * as Sentry from "@sentry/nextjs";

import { FINISHED_STATUSES, LIVE_STATUSES } from "@/lib/ai/status-map";
import type { FixtureStatus } from "@/types/domain";
import { generatePrematchInsight } from "@/lib/services/aiService";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveCronOutcome } from "@/lib/ingestion/cron-outcome";
import { logIngestionEvent } from "@/lib/ingestion/ingestion-observability";

export type WarmAiPrematchScope = "daily" | "imminent" | "backfill";

/** Leave headroom under route maxDuration (60s) and GHA trigger timeout (58s). */
const RUN_BUDGET_MS = 52_000;
const DAILY_MAX_FIXTURES = 40;
const IMMINENT_MAX_FIXTURES = 25;
const BACKFILL_MAX_FIXTURES = 30;
const BACKFILL_LOOKBACK_MS = 7 * 86_400_000;

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

  return {
    from: new Date(now).toISOString(),
    to: new Date(now + 36 * 3_600_000).toISOString(),
  };
}

type WarmFixtureRow = {
  provider_id: number;
  prematch_readiness: { aiEligible?: boolean } | null;
  kickoff_at: string;
};

function sortWarmCandidates(rows: WarmFixtureRow[]): WarmFixtureRow[] {
  return [...rows].sort((left, right) => {
    const leftEligible = left.prematch_readiness?.aiEligible === true ? 1 : 0;
    const rightEligible = right.prematch_readiness?.aiEligible === true ? 1 : 0;
    if (leftEligible !== rightEligible) {
      return rightEligible - leftEligible;
    }
    return (
      new Date(left.kickoff_at).getTime() - new Date(right.kickoff_at).getTime()
    );
  });
}

async function loadBackfillFixturesWithoutInsight(
  limit: number
): Promise<number[]> {
  const client = createAdminClient();
  const { from, to } = warmWindowBoundsForScope("backfill");

  const { data: fixtures, error } = await client
    .from("fixtures")
    .select("id, provider_id, kickoff_at")
    .in("status", BACKFILL_STATUSES)
    .gte("kickoff_at", from)
    .lte("kickoff_at", to)
    .order("kickoff_at", { ascending: false })
    .limit(limit * 4);

  if (error) {
    throw new Error(`Failed to load backfill fixtures: ${error.message}`);
  }

  const rows = fixtures ?? [];
  if (rows.length === 0) {
    return [];
  }

  const fixtureUuids = rows.map((row) => row.id);
  const { data: insightRows, error: insightError } = await client
    .from("ai_insights")
    .select("fixture_id")
    .eq("type", "PREMATCH")
    .in("fixture_id", fixtureUuids);

  if (insightError) {
    throw new Error(
      `Failed to load backfill insight coverage: ${insightError.message}`
    );
  }

  const withInsight = new Set(
    (insightRows ?? [])
      .map((row) => row.fixture_id)
      .filter((id): id is string => id != null)
  );

  return rows
    .filter((row) => !withInsight.has(row.id))
    .slice(0, limit)
    .map((row) => row.provider_id);
}

async function loadFixturesInScope(
  scope: WarmAiPrematchScope
): Promise<number[]> {
  if (scope === "backfill") {
    return loadBackfillFixturesWithoutInsight(BACKFILL_MAX_FIXTURES);
  }

  const client = createAdminClient();
  const { from, to } = warmWindowBoundsForScope(scope);
  const limit =
    scope === "imminent" ? IMMINENT_MAX_FIXTURES : DAILY_MAX_FIXTURES;

  const { data, error } = await client
    .from("fixtures")
    .select("provider_id, kickoff_at, prematch_readiness")
    .in("status", ["NS", "TBD"])
    .gte("kickoff_at", from)
    .lte("kickoff_at", to)
    .order("kickoff_at", { ascending: true })
    .limit(limit * 2);

  if (error) {
    throw new Error(
      `Failed to load warm-up fixtures (${scope}): ${error.message}`
    );
  }

  const sorted = sortWarmCandidates((data ?? []) as WarmFixtureRow[]);
  return sorted.slice(0, limit).map((row) => row.provider_id);
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
    processed: number;
    stoppedEarly: boolean;
    generated: number;
    cached: number;
    fallback: number;
    unavailable: number;
    errors: number;
  };
}> {
  const fixtureIds = await loadFixturesInScope(scope);

  let generated = 0;
  let cached = 0;
  let fallback = 0;
  let unavailable = 0;
  let errors = 0;
  let processed = 0;
  const startedAt = Date.now();
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
      } else if (result.status === "FALLBACK") {
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
    processed,
    stoppedEarly,
    generated,
    cached,
    fallback,
    unavailable,
    errors,
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
