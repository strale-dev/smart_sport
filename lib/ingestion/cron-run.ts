import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ApiFootballError } from "@/lib/api-football/errors";
import { verifyCronRequest } from "@/lib/ingestion/cron-auth";
import { logIngestionEvent } from "@/lib/ingestion/ingestion-observability";
import { captureIngestionCronCompleted } from "@/lib/posthog/server";
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
    logIngestionEvent({
      job_name: options.jobName,
      stage: "lock",
      skipped: true,
      ok: true,
      error_type: "lock_not_acquired",
      reason: "Another cron instance is already running.",
    });
    return NextResponse.json({
      ok: true,
      job: options.jobName,
      skipped: true,
      reason: "Another cron instance is already running.",
    });
  }

  try {
    const result = await options.run();
    logIngestionEvent({
      job_name: options.jobName,
      stage: "complete",
      ok: result.ok,
      degraded: result.degraded,
      skipped: result.skipped,
      reason: result.reason,
      detail: result.stats ? { stats: result.stats } : undefined,
    });
    void captureIngestionCronCompleted({
      jobName: options.jobName,
      ok: result.ok,
      degraded: result.degraded,
      skipped: result.skipped,
      stats: result.stats,
    }).catch(() => {});
    return NextResponse.json(result, { status: cronJobHttpStatus(result) });
  } catch (error) {
    console.error(`[cron/${options.jobName}]`, error);
    logIngestionEvent({
      job_name: options.jobName,
      stage: "exception",
      ok: false,
      error_type: "cron_exception",
      reason: error instanceof Error ? error.message : "Unknown cron error",
    });
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
