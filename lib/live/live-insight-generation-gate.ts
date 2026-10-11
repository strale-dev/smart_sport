import { LIVE_INSIGHT_SCHEDULE_TTL_SEC } from "@/lib/live/constants";
import type {
  DetectedMeaningfulEvent,
  MeaningfulEventKind,
} from "@/lib/live/event-detector-types";
import { getRedis } from "@/lib/redis/client";
import {
  liveInsightLastSuccessKey,
  liveInsightProcessedEventsKey,
} from "@/lib/redis/keys";

/** Soft minimum between PERIODIC / PROBABILITY_SHIFT-only generations (same fixture). */
export const LIVE_INSIGHT_SOFT_MIN_INTERVAL_MS = 45_000;

const memoryProcessedEvents = new Map<number, Set<string>>();
const memoryLastSuccessAt = new Map<number, number>();

const SOFT_INTERVAL_KINDS = new Set<MeaningfulEventKind>([
  "PERIODIC",
  "PROBABILITY_SHIFT",
]);

export type LiveInsightGenerationGateInput = {
  fixtureProviderId: number;
  events: DetectedMeaningfulEvent[];
  triggerKinds: MeaningfulEventKind[];
  now?: number;
};

export type LiveInsightGenerationGateResult =
  { allow: true } | { allow: false; reason: string };

export function eventDedupeKey(event: DetectedMeaningfulEvent): string | null {
  if (event.externalEventId) {
    return event.externalEventId;
  }

  if (
    event.kind === "MATCH_STATE" ||
    event.kind === "FT" ||
    event.kind === "AET" ||
    event.kind === "PEN" ||
    event.kind === "HT"
  ) {
    const from = event.meta?.fromStatus;
    const to = event.meta?.toStatus;
    if (typeof from === "string" && typeof to === "string") {
      return `state:${from}->${to}`;
    }
  }

  if (event.kind === "PROBABILITY_SHIFT" || event.kind === "PERIODIC") {
    return `${event.kind}:${event.reason}:${event.minute ?? "null"}`;
  }

  return null;
}

function isSoftIntervalOnly(triggerKinds: MeaningfulEventKind[]): boolean {
  if (triggerKinds.length === 0) {
    return false;
  }
  return triggerKinds.every((kind) => SOFT_INTERVAL_KINDS.has(kind));
}

async function readProcessedEventKeys(
  fixtureProviderId: number
): Promise<Set<string>> {
  const cached = memoryProcessedEvents.get(fixtureProviderId);
  if (cached) {
    return cached;
  }

  const redis = getRedis();
  if (!redis) {
    return new Set();
  }

  const members = (await redis.smembers(
    liveInsightProcessedEventsKey(fixtureProviderId)
  )) as string[];
  const set = new Set(members);
  memoryProcessedEvents.set(fixtureProviderId, set);
  return set;
}

async function readLastSuccessAt(
  fixtureProviderId: number
): Promise<number | null> {
  const cached = memoryLastSuccessAt.get(fixtureProviderId);
  if (cached != null) {
    return cached;
  }

  const redis = getRedis();
  if (!redis) {
    return null;
  }

  const raw = await redis.get<number>(
    liveInsightLastSuccessKey(fixtureProviderId)
  );
  if (raw != null) {
    memoryLastSuccessAt.set(fixtureProviderId, raw);
  }
  return raw ?? null;
}

export async function evaluateLiveInsightGenerationGate(
  input: LiveInsightGenerationGateInput
): Promise<LiveInsightGenerationGateResult> {
  const now = input.now ?? Date.now();
  const dedupeKeys = input.events
    .map(eventDedupeKey)
    .filter((key): key is string => key != null);

  if (dedupeKeys.length > 0) {
    const processed = await readProcessedEventKeys(input.fixtureProviderId);
    const allAlreadyProcessed = dedupeKeys.every((key) => processed.has(key));
    if (allAlreadyProcessed) {
      return { allow: false, reason: "EVENTS_ALREADY_PROCESSED" };
    }
  }

  if (isSoftIntervalOnly(input.triggerKinds)) {
    const lastSuccess = await readLastSuccessAt(input.fixtureProviderId);
    if (
      lastSuccess != null &&
      now - lastSuccess < LIVE_INSIGHT_SOFT_MIN_INTERVAL_MS
    ) {
      return { allow: false, reason: "SOFT_MIN_INTERVAL" };
    }
  }

  return { allow: true };
}

export async function markLiveInsightGenerationSuccess(input: {
  fixtureProviderId: number;
  events: DetectedMeaningfulEvent[];
  now?: number;
}): Promise<void> {
  const now = input.now ?? Date.now();
  memoryLastSuccessAt.set(input.fixtureProviderId, now);

  const keys = input.events
    .map(eventDedupeKey)
    .filter((key): key is string => key != null);

  if (keys.length > 0) {
    let set = memoryProcessedEvents.get(input.fixtureProviderId);
    if (!set) {
      set = new Set();
      memoryProcessedEvents.set(input.fixtureProviderId, set);
    }
    for (const key of keys) {
      set.add(key);
    }
  }

  const redis = getRedis();
  if (!redis) {
    return;
  }

  await redis.set(liveInsightLastSuccessKey(input.fixtureProviderId), now, {
    ex: LIVE_INSIGHT_SCHEDULE_TTL_SEC,
  });

  if (keys.length > 0) {
    const processedKey = liveInsightProcessedEventsKey(input.fixtureProviderId);
    for (const key of keys) {
      await redis.sadd(processedKey, key);
    }
    await redis.expire(processedKey, LIVE_INSIGHT_SCHEDULE_TTL_SEC);
  }
}

/** Test-only reset for in-memory fallback state. */
export function resetLiveInsightGenerationGateMemoryForTests(): void {
  memoryProcessedEvents.clear();
  memoryLastSuccessAt.clear();
}
