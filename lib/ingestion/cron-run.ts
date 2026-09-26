import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ApiFootballError } from "@/lib/api-football/errors";
import { verifyCronRequest } from "@/lib/ingestion/cron-auth";
import { acquireLock, releaseLock } from "@/lib/redis/lock";

export type CronJobResult = {
  ok: boolean;
  job: string;
  skipped?: boolean;
  degraded?: boolean;
  reason?: string;
  stats?: Record<string, unknown>;
};

/** Skipped jobs are successful no-ops for schedulers (GitHub Actions, Vercel cron). */
export function cronJobHttpStatus(
  result: Pick<CronJobResult, "ok" | "skipped">
): number {
  if (result.skipped) {
    return 200;
  }

  return result.ok ? 200 : 500;
}

type RunCronJobOptions = {
  jobName: string;
  lockTtlSeconds?: number;
  run: () => Promise<CronJobResult>;
};

export async function runCronRoute(
  request: NextRequest,
  options: RunCronJobOptions
): Promise<NextResponse> {
  const auth = verifyCronRequest(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.message },
      { status: auth.status }
    );
  }

  const lockKey = `lock:cron:${options.jobName}`;
  const lockTtlSeconds = options.lockTtlSeconds ?? 300;
  const acquired = await acquireLock(lockKey, lockTtlSeconds);

  if (!acquired) {
    return NextResponse.json({
      ok: true,
      job: options.jobName,
      skipped: true,
      reason: "Another cron instance is already running.",
    });
  }

  try {
    const result = await options.run();
    return NextResponse.json(result, { status: cronJobHttpStatus(result) });
  } catch (error) {
    console.error(`[cron/${options.jobName}]`, error);
    const payload: Record<string, unknown> = {
      ok: false,
      job: options.jobName,
      error: error instanceof Error ? error.message : "Unknown cron error",
    };

    if (error instanceof ApiFootballError) {
      payload.path = error.path;
      if (error.providerErrors) {
        payload.providerErrors = error.providerErrors;
      }
      if (error.statusCode !== undefined) {
        payload.statusCode = error.statusCode;
      }
    }

    return NextResponse.json(payload, { status: 500 });
  } finally {
    await releaseLock(lockKey);
  }
}
