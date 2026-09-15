import * as Sentry from "@sentry/nextjs";

import {
  AiLimitReachedError,
  getUserEntitlement,
  isPremiumEntitlement,
} from "@/lib/entitlements/entitlementService";
import { getFreeTierLimits } from "@/lib/entitlements/limits";
import {
  addActiveLiveWatchForUser,
  listActiveLiveFixtureIdsForUser,
  removeActiveLiveWatchForUser,
} from "@/lib/entitlements/live-active-watches";
import { isRedisUsageAvailable } from "@/lib/entitlements/redis-usage";
import {
  incrementAiUsageCounters,
  readAiUsageRow,
} from "@/lib/entitlements/usage";
import { LIVE_USER_ACTIVE_WATCH_TTL_SEC } from "@/lib/live/constants";

export class LiveSimultaneousLimitError extends Error {
  readonly code = "LIVE_SIMULTANEOUS_LIMIT" as const;
  readonly limit: number;
  readonly used: number;

  constructor(limit: number, used: number) {
    super("Too many simultaneous live matches");
    this.name = "LiveSimultaneousLimitError";
    this.limit = limit;
    this.used = used;
  }
}

export class LiveDailyLimitError extends Error {
  readonly code = "LIVE_DAILY_LIMIT" as const;
  readonly limit: number;
  readonly used: number;

  constructor(limit: number, used: number) {
    super("Daily live AI match limit reached");
    this.name = "LiveDailyLimitError";
    this.limit = limit;
    this.used = used;
  }
}

function listActiveFixturesFromUsageFallback(
  usage: Awaited<ReturnType<typeof readAiUsageRow>>
): string[] {
  const now = Date.now();
  const windowMs = LIVE_USER_ACTIVE_WATCH_TTL_SEC * 1000;
  const active: string[] = [];

  for (const [fixtureUuid, ts] of Object.entries(usage.last_live_ai_at)) {
    const elapsed = now - new Date(ts).getTime();
    if (elapsed >= 0 && elapsed <= windowMs) {
      active.push(fixtureUuid);
    }
  }

  return active;
}

function isFixtureRecentlyActive(
  usage: Awaited<ReturnType<typeof readAiUsageRow>>,
  fixtureUuid: string
): boolean {
  const ts = usage.last_live_ai_at[fixtureUuid];
  if (!ts) {
    return false;
  }
  const elapsed = Date.now() - new Date(ts).getTime();
  return elapsed >= 0 && elapsed <= LIVE_USER_ACTIVE_WATCH_TTL_SEC * 1000;
}

export async function assertSimultaneousLiveWatches(
  userId: string,
  fixtureProviderId: number,
  fixtureUuid: string
): Promise<void> {
  const entitlement = await getUserEntitlement(userId);
  if (isPremiumEntitlement(entitlement.tier, entitlement.subscriptionStatus)) {
    return;
  }

  const limits = getFreeTierLimits();
  const usage = await readAiUsageRow(userId);

  const activeIds = isRedisUsageAvailable()
    ? await listActiveLiveFixtureIdsForUser(userId)
    : [];

  const activeCount = isRedisUsageAvailable()
    ? activeIds.length
    : listActiveFixturesFromUsageFallback(usage).length;

  const alreadyWatching =
    activeIds.includes(fixtureProviderId) ||
    isFixtureRecentlyActive(usage, fixtureUuid);

  if (!alreadyWatching && activeCount >= limits.liveMatchesSimultaneous) {
    const error = new LiveSimultaneousLimitError(
      limits.liveMatchesSimultaneous,
      activeCount
    );
    Sentry.addBreadcrumb({
      category: "entitlements",
      message: "Live simultaneous watch denied",
      level: "info",
      data: { userId, fixtureProviderId, ...error },
    });
    throw error;
  }
}

export async function recordLiveMatchView(
  userId: string,
  fixtureUuid: string,
  fixtureProviderId: number
): Promise<void> {
  const entitlement = await getUserEntitlement(userId);
  if (isPremiumEntitlement(entitlement.tier, entitlement.subscriptionStatus)) {
    await addActiveLiveWatchForUser(userId, fixtureProviderId);
    return;
  }

  const limits = getFreeTierLimits();
  const usage = await readAiUsageRow(userId);
  const alreadyTracked = usage.live_ai_matches.includes(fixtureUuid);

  if (
    !alreadyTracked &&
    usage.live_ai_matches.length >= limits.liveAiMatchesPerDay
  ) {
    throw new LiveDailyLimitError(
      limits.liveAiMatchesPerDay,
      usage.live_ai_matches.length
    );
  }

  if (!alreadyTracked) {
    await incrementAiUsageCounters(userId, {
      generations: 1,
      liveFixtureUuid: fixtureUuid,
    });
  } else {
    await incrementAiUsageCounters(userId, {
      liveFixtureUuid: fixtureUuid,
    });
  }

  await addActiveLiveWatchForUser(userId, fixtureProviderId);
}

export async function assertLiveMatchView(
  userId: string,
  fixtureUuid: string,
  fixtureProviderId: number
): Promise<void> {
  await assertSimultaneousLiveWatches(userId, fixtureProviderId, fixtureUuid);

  const entitlement = await getUserEntitlement(userId);
  if (isPremiumEntitlement(entitlement.tier, entitlement.subscriptionStatus)) {
    return;
  }

  const limits = getFreeTierLimits();
  const usage = await readAiUsageRow(userId);
  const alreadyTracked = usage.live_ai_matches.includes(fixtureUuid);

  if (
    !alreadyTracked &&
    usage.live_ai_matches.length >= limits.liveAiMatchesPerDay
  ) {
    const error = new LiveDailyLimitError(
      limits.liveAiMatchesPerDay,
      usage.live_ai_matches.length
    );
    Sentry.addBreadcrumb({
      category: "entitlements",
      message: "Live daily view denied",
      level: "info",
      data: { userId, fixtureUuid, ...error },
    });
    throw error;
  }

  const lastAt = usage.last_live_ai_at[fixtureUuid];
  if (lastAt && alreadyTracked) {
    const elapsedMs = Date.now() - new Date(lastAt).getTime();
    const minMs = limits.liveAiMinIntervalSec * 1000;
    if (elapsedMs < minMs) {
      throw new AiLimitReachedError(
        "live_interval",
        limits.liveAiMinIntervalSec,
        Math.floor(elapsedMs / 1000)
      );
    }
  }
}

export async function releaseLiveMatchView(
  userId: string,
  fixtureProviderId: number
): Promise<void> {
  await removeActiveLiveWatchForUser(userId, fixtureProviderId);
}

export async function userHasLiveMatchAccessToday(
  userId: string,
  fixtureUuid: string
): Promise<boolean> {
  const entitlement = await getUserEntitlement(userId);
  if (isPremiumEntitlement(entitlement.tier, entitlement.subscriptionStatus)) {
    return true;
  }

  const usage = await readAiUsageRow(userId);
  return usage.live_ai_matches.includes(fixtureUuid);
}
