import type {
  LiveDetectorSnapshot,
  SnapshotEvent,
} from "@/lib/live/event-detector-types";
import { readLineupsFromDb } from "@/lib/ingestion/db-read";
import { LIVE_DETECTOR_SNAPSHOT_TTL_SEC } from "@/lib/live/constants";
import { getRedis } from "@/lib/redis/client";
import {
  liveDetectorSnapshotKey,
  providerFixtureEventsKey,
  providerFixtureKey,
  providerFixtureStatsKey,
} from "@/lib/redis/keys";
import type {
  Fixture,
  FixtureEvent,
  FixtureTeamStatistics,
} from "@/types/domain";

type CachedEnvelope<T> = {
  value: T;
  cachedAt?: string;
};

const memorySnapshots = new Map<string, LiveDetectorSnapshot>();

function mapEvent(event: FixtureEvent): SnapshotEvent {
  return {
    externalEventId: event.externalEventId,
    type: event.type,
    detail: event.detail,
    comments: event.comments,
    minute: event.minute,
    teamExternalId: event.teamExternalId,
    playerExternalId: event.playerExternalId,
    assistPlayerExternalId: event.assistPlayerExternalId,
  };
}

function mapStats(
  stats: FixtureTeamStatistics
): LiveDetectorSnapshot["stats"][number] {
  return {
    teamExternalId: stats.teamExternalId,
    expectedGoals: stats.expectedGoals,
    redCards: stats.redCards,
  };
}

function starterIdsFromLineups(
  lineups: Awaited<ReturnType<typeof readLineupsFromDb>>
): number[] {
  const ids = new Set<number>();
  for (const lineup of lineups) {
    for (const player of lineup.players) {
      if (player.isStarting && player.playerExternalId != null) {
        ids.add(player.playerExternalId);
      }
    }
  }
  return [...ids];
}

async function readCachedValue<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get<CachedEnvelope<T> | T>(key);
    if (raw == null) {
      return null;
    }
    if (typeof raw === "object" && raw !== null && "value" in raw) {
      return (raw as CachedEnvelope<T>).value;
    }
    return raw as T;
  }

  return null;
}

export async function readDetectorSnapshot(
  fixtureProviderId: number
): Promise<LiveDetectorSnapshot | null> {
  const key = liveDetectorSnapshotKey(fixtureProviderId);
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get<LiveDetectorSnapshot>(key);
    return raw ?? null;
  }

  return memorySnapshots.get(key) ?? null;
}

export async function writeDetectorSnapshot(
  snapshot: LiveDetectorSnapshot
): Promise<void> {
  const key = liveDetectorSnapshotKey(snapshot.fixtureProviderId);
  const redis = getRedis();
  if (redis) {
    await redis.set(key, snapshot, { ex: LIVE_DETECTOR_SNAPSHOT_TTL_SEC });
    return;
  }

  memorySnapshots.set(key, snapshot);
}

export async function buildLiveDetectorSnapshot(
  fixtureProviderId: number
): Promise<LiveDetectorSnapshot | null> {
  const fixture = await readCachedValue<Fixture>(
    providerFixtureKey(fixtureProviderId)
  );
  if (!fixture) {
    return null;
  }

  const events =
    (await readCachedValue<FixtureEvent[]>(
      providerFixtureEventsKey(fixtureProviderId)
    )) ?? [];
  const statistics =
    (await readCachedValue<FixtureTeamStatistics[]>(
      providerFixtureStatsKey(fixtureProviderId)
    )) ?? [];

  let starterExternalIds: number[] = [];
  try {
    const lineups = await readLineupsFromDb(fixtureProviderId);
    starterExternalIds = starterIdsFromLineups(lineups);
  } catch {
    starterExternalIds = [];
  }

  return {
    fixtureProviderId,
    capturedAt: new Date().toISOString(),
    status: fixture.status,
    minute: fixture.minute,
    homeTeamExternalId: fixture.homeTeam.externalId,
    awayTeamExternalId: fixture.awayTeam.externalId,
    score: {
      home: fixture.score.home,
      away: fixture.score.away,
    },
    events: events.map(mapEvent),
    stats: statistics.map(mapStats),
    starterExternalIds,
  };
}

export function resetDetectorSnapshotMemoryForTests(): void {
  memorySnapshots.clear();
}
