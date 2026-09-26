/**
 * GitHub Actions cron trigger success rules (mirrors scripts/trigger-production-cron).
 */

export type CronTriggerJsonPayload = {
  ok?: boolean;
  skipped?: boolean;
  degraded?: boolean;
};

/** Returns true when GHA should fail the workflow step. */
export function isGhaCronTriggerFailure(
  httpOk: boolean,
  payload: CronTriggerJsonPayload | null
): boolean {
  if (!httpOk) {
    return true;
  }

  if (payload && payload.ok === false && !payload.skipped) {
    return true;
  }

  return false;
}

export function parseCronTriggerJsonBody(
  body: string
): CronTriggerJsonPayload | null {
  if (!body.trim()) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object") {
      return parsed as CronTriggerJsonPayload;
    }
  } catch {
    // Non-JSON success body — treat as success.
  }

  return null;
}
