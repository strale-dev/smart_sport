import { createAdminClient } from "@/lib/supabase/admin";
import { generatePrematchInsight } from "@/lib/services/aiService";

export type WarmAiPrematchScope = "daily" | "imminent";

const RUN_BUDGET_MS = 45_000;
const DAILY_MAX_FIXTURES = 30;
const IMMINENT_MAX_FIXTURES = 20;

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

  return {
    from: new Date(now).toISOString(),
    to: new Date(now + 36 * 3_600_000).toISOString(),
  };
}

async function loadFixturesInScope(
  scope: WarmAiPrematchScope
): Promise<number[]> {
  const client = createAdminClient();
  const { from, to } = warmWindowBoundsForScope(scope);
  const limit =
    scope === "imminent" ? IMMINENT_MAX_FIXTURES : DAILY_MAX_FIXTURES;

  const { data, error } = await client
    .from("fixtures")
    .select("provider_id")
    .in("status", ["NS", "TBD"])
    .gte("kickoff_at", from)
    .lte("kickoff_at", to)
    .order("kickoff_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(
      `Failed to load warm-up fixtures (${scope}): ${error.message}`
    );
  }

  return (data ?? []).map((row) => row.provider_id);
}

export async function warmAiPrematchInsights(
  scope: WarmAiPrematchScope = "daily"
): Promise<{
  ok: boolean;
  job: string;
  stats: {
    scope: WarmAiPrematchScope;
    candidates: number;
    processed: number;
    stoppedEarly: boolean;
    generated: number;
    cached: number;
    fallback: number;
    errors: number;
  };
}> {
  const fixtureIds = await loadFixturesInScope(scope);

  let generated = 0;
  let cached = 0;
  let fallback = 0;
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
      }
    } catch (error) {
      errors += 1;
      console.error(`[warm-ai-prematch] fixture ${fixtureId}`, error);
    }
  }

  return {
    ok: true,
    job: "warm-ai-prematch",
    stats: {
      scope,
      candidates: fixtureIds.length,
      processed,
      stoppedEarly,
      generated,
      cached,
      fallback,
      errors,
    },
  };
}
