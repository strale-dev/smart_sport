import { createAdminClient } from "@/lib/supabase/admin";
import { generatePrematchInsight } from "@/lib/services/aiService";

type WarmWindow = "24h" | "60m";

function windowBounds(
  window: WarmWindow,
  now = Date.now()
): {
  from: string;
  to: string;
} {
  if (window === "24h") {
    return {
      from: new Date(now + 23 * 3_600_000).toISOString(),
      to: new Date(now + 25 * 3_600_000).toISOString(),
    };
  }

  return {
    from: new Date(now + 55 * 60_000).toISOString(),
    to: new Date(now + 65 * 60_000).toISOString(),
  };
}

async function loadFixturesInWindow(window: WarmWindow): Promise<number[]> {
  const client = createAdminClient();
  const { from, to } = windowBounds(window);

  const { data, error } = await client
    .from("fixtures")
    .select("provider_id")
    .in("status", ["NS", "TBD"])
    .gte("kickoff_at", from)
    .lte("kickoff_at", to)
    .order("kickoff_at", { ascending: true })
    .limit(40);

  if (error) {
    throw new Error(
      `Failed to load warm-up fixtures (${window}): ${error.message}`
    );
  }

  return (data ?? []).map((row) => row.provider_id);
}

export async function warmAiPrematchInsights(): Promise<{
  ok: boolean;
  job: string;
  stats: {
    candidates24h: number;
    candidates60m: number;
    generated: number;
    cached: number;
    fallback: number;
    errors: number;
  };
}> {
  const [window24h, window60m] = await Promise.all([
    loadFixturesInWindow("24h"),
    loadFixturesInWindow("60m"),
  ]);

  const fixtureIds = [...new Set([...window24h, ...window60m])];

  let generated = 0;
  let cached = 0;
  let fallback = 0;
  let errors = 0;

  for (const fixtureId of fixtureIds) {
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
      candidates24h: window24h.length,
      candidates60m: window60m.length,
      generated,
      cached,
      fallback,
      errors,
    },
  };
}
