import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { verifyCronRequest } from "@/lib/ingestion/cron-auth";
import { pingRedis } from "@/lib/redis/client";
import { cached } from "@/lib/redis/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type HealthChecks = {
  redis: { ok: boolean; cacheRoundTrip: boolean };
  database: { ok: boolean };
};

export async function GET(request: NextRequest) {
  const auth = verifyCronRequest(
    request.headers.get("authorization"),
    process.env
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const redisOk = await pingRedis();
  let cacheRoundTrip = false;
  if (redisOk) {
    const probeKey = "ops:health:cache-probe";
    try {
      const written = await cached({
        key: probeKey,
        freshTtlSeconds: 30,
        staleTtlSeconds: 60,
        fn: async () => "ok",
      });
      cacheRoundTrip = written.value === "ok";
    } catch {
      cacheRoundTrip = false;
    }
  }

  let databaseOk = false;
  try {
    const client = createAdminClient();
    const { error } = await client.from("fixtures").select("id").limit(1);
    databaseOk = !error;
  } catch {
    databaseOk = false;
  }

  const checks: HealthChecks = {
    redis: { ok: redisOk, cacheRoundTrip },
    database: { ok: databaseOk },
  };

  const ok =
    checks.redis.ok && checks.redis.cacheRoundTrip && checks.database.ok;

  return NextResponse.json(
    {
      ok,
      checks,
      checkedAt: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
