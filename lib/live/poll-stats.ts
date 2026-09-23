import { getRedis } from "@/lib/redis/client";
import { livePollStatsDayKey } from "@/lib/redis/keys";

export type LivePollStatField =
  | "fixture_poll_calls"
  | "fixture_poll_ingest"
  | "fixture_poll_skipped"
  | "center_poll_calls"
  | "center_poll_ingest"
  | "center_poll_skipped"
  | "center_api_requests"
  | "center_fixtures_upserted"
  | "follow_poll_calls"
  | "follow_poll_ingest"
  | "follow_poll_skipped";

export type LivePollStatsSnapshot = {
  utcDay: string;
  fixturePollCalls: number;
  fixturePollIngest: number;
  fixturePollSkipped: number;
  centerPollCalls: number;
  centerPollIngest: number;
  centerPollSkipped: number;
  centerApiRequests: number;
  centerFixturesUpserted: number;
  followPollCalls: number;
  followPollIngest: number;
  followPollSkipped: number;
  followNotificationActiveChains: number | null;
};

const memoryStats = new Map<string, Map<LivePollStatField, number>>();

function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function readMemoryField(utcDay: string, field: LivePollStatField): number {
  return memoryStats.get(utcDay)?.get(field) ?? 0;
}

function writeMemoryIncrement(
  utcDay: string,
  field: LivePollStatField,
  by: number
): void {
  const bucket = memoryStats.get(utcDay) ?? new Map();
  bucket.set(field, (bucket.get(field) ?? 0) + by);
  memoryStats.set(utcDay, bucket);
}

export async function incrementLivePollStat(
  field: LivePollStatField,
  by = 1,
  date = new Date()
): Promise<void> {
  if (by === 0) {
    return;
  }

  const utcDay = utcDayKey(date);
  const redis = getRedis();
  if (redis) {
    const key = livePollStatsDayKey(utcDay);
    await redis.hincrby(key, field, by);
    await redis.expire(key, 86_400 * 14);
    return;
  }

  writeMemoryIncrement(utcDay, field, by);
}

export async function recordFixturePollTick(input: {
  skipped?: boolean;
  ingested?: boolean;
}): Promise<void> {
  await incrementLivePollStat("fixture_poll_calls");
  if (input.skipped) {
    await incrementLivePollStat("fixture_poll_skipped");
  }
  if (input.ingested) {
    await incrementLivePollStat("fixture_poll_ingest");
  }
}

export async function recordCenterPollTick(input: {
  skipped?: boolean;
  ingested?: boolean;
  apiRequests?: number;
  fixturesUpserted?: number;
}): Promise<void> {
  await incrementLivePollStat("center_poll_calls");
  if (input.skipped) {
    await incrementLivePollStat("center_poll_skipped");
  }
  if (input.ingested) {
    await incrementLivePollStat("center_poll_ingest");
  }
  if (input.apiRequests && input.apiRequests > 0) {
    await incrementLivePollStat("center_api_requests", input.apiRequests);
  }
  if (input.fixturesUpserted && input.fixturesUpserted > 0) {
    await incrementLivePollStat(
      "center_fixtures_upserted",
      input.fixturesUpserted
    );
  }
}

export async function recordFollowPollTick(input: {
  skipped?: boolean;
  ingested?: boolean;
}): Promise<void> {
  await incrementLivePollStat("follow_poll_calls");
  if (input.skipped) {
    await incrementLivePollStat("follow_poll_skipped");
  }
  if (input.ingested) {
    await incrementLivePollStat("follow_poll_ingest");
  }
}

function parseHashField(
  raw: Record<string, unknown> | null | undefined,
  field: LivePollStatField
): number {
  if (!raw) {
    return 0;
  }
  const value = raw[field];
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getLivePollStatsForDay(
  date = new Date()
): Promise<LivePollStatsSnapshot> {
  const utcDay = utcDayKey(date);
  const redis = getRedis();

  let hash: Record<string, unknown> | null = null;
  if (redis) {
    hash = (await redis.hgetall(livePollStatsDayKey(utcDay))) as Record<
      string,
      unknown
    > | null;
  }

  const read = (field: LivePollStatField) =>
    redis ? parseHashField(hash, field) : readMemoryField(utcDay, field);

  let followNotificationActiveChains: number | null = null;
  if (redis) {
    const { liveFollowNotificationActiveSetKey } =
      await import("@/lib/redis/keys");
    followNotificationActiveChains = await redis.scard(
      liveFollowNotificationActiveSetKey()
    );
  }

  return {
    utcDay,
    fixturePollCalls: read("fixture_poll_calls"),
    fixturePollIngest: read("fixture_poll_ingest"),
    fixturePollSkipped: read("fixture_poll_skipped"),
    centerPollCalls: read("center_poll_calls"),
    centerPollIngest: read("center_poll_ingest"),
    centerPollSkipped: read("center_poll_skipped"),
    centerApiRequests: read("center_api_requests"),
    centerFixturesUpserted: read("center_fixtures_upserted"),
    followPollCalls: read("follow_poll_calls"),
    followPollIngest: read("follow_poll_ingest"),
    followPollSkipped: read("follow_poll_skipped"),
    followNotificationActiveChains,
  };
}

export function resetLivePollStatsMemoryForTests(): void {
  memoryStats.clear();
}
