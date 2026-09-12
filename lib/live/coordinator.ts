import {
  LIVE_POLL_LOCK_TTL_SEC,
  type LiveWatchSurface,
} from "@/lib/live/constants";
import { isLivePollingEnabled } from "@/lib/env";
import {
  scheduleLiveCenterPollTick,
  scheduleMatchPollTick,
} from "@/lib/live/poller";
import {
  listActiveMatchWatchFixtureIds,
  shouldKeepLiveCenterPollRunning,
  shouldKeepMatchPollRunning,
} from "@/lib/live/viewers";
import { acquireLock } from "@/lib/redis/lock";
import {
  isLiveFixtureStatus,
  lockFixturePollKey,
  lockLiveCenterPollKey,
} from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";

export type EnsureWorkerResult = {
  started: boolean;
  reason?: string;
};

export async function ensureWorkerRunning(
  surface: LiveWatchSurface,
  fixtureProviderId?: number
): Promise<EnsureWorkerResult> {
  if (!isLivePollingEnabled()) {
    return { started: false, reason: "live_polling_disabled" };
  }

  if (surface === "match") {
    if (fixtureProviderId == null) {
      return { started: false, reason: "missing_fixture_id" };
    }

    const lockKey = lockFixturePollKey(fixtureProviderId);
    const acquired = await acquireLock(lockKey, LIVE_POLL_LOCK_TTL_SEC);
    if (!acquired) {
      return { started: false, reason: "lock_held" };
    }

    void scheduleMatchPollTick(fixtureProviderId);
    return { started: true };
  }

  const lockKey = lockLiveCenterPollKey();
  const acquired = await acquireLock(lockKey, LIVE_POLL_LOCK_TTL_SEC);
  if (!acquired) {
    return { started: false, reason: "lock_held" };
  }

  void scheduleLiveCenterPollTick();
  return { started: true };
}

export async function shouldContinueFixturePoll(
  fixtureProviderId: number
): Promise<boolean> {
  if (!(await shouldKeepMatchPollRunning(fixtureProviderId))) {
    return false;
  }

  try {
    const client = createAdminClient();
    const { data } = await client
      .from("fixtures")
      .select("status")
      .eq("provider_id", fixtureProviderId)
      .maybeSingle();

    if (!data?.status) {
      return true;
    }

    return isLiveFixtureStatus(data.status);
  } catch {
    return true;
  }
}

export async function shouldContinueLiveCenterPoll(): Promise<boolean> {
  return shouldKeepLiveCenterPollRunning();
}

export async function listReapMatchFixtureIds(): Promise<number[]> {
  const fromRedis = await listActiveMatchWatchFixtureIds();
  const ids = new Set(fromRedis);

  try {
    const client = createAdminClient();
    const { data } = await client
      .from("fixtures")
      .select("provider_id")
      .gt("active_viewers", 0);

    for (const row of data ?? []) {
      if (row.provider_id != null) {
        ids.add(row.provider_id);
      }
    }
  } catch {
    // Redis list is primary.
  }

  return [...ids];
}
