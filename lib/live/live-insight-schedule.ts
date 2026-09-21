import {
  LIVE_INSIGHT_GENERATION_BACKOFF_MS,
  LIVE_INSIGHT_PERIODIC_REFRESH_MS,
  LIVE_INSIGHT_SCHEDULE_TTL_SEC,
} from "@/lib/live/constants";
import type { LiveDetectorSnapshot } from "@/lib/live/event-detector-types";
import { isProbabilityShiftMeaningful } from "@/lib/live/probability-shift";
import { getRedis } from "@/lib/redis/client";
import {
  liveInsightGenBackoffKey,
  liveInsightLastContextKey,
} from "@/lib/redis/keys";
import type { WinProbabilities } from "@/types/prediction";

export type StoredLiveInsightContext = {
  scoreHome: number | null;
  scoreAway: number | null;
  xgHome: number | null;
  xgAway: number | null;
  winProbabilities: WinProbabilities;
  recordedAt: string;
};

const memoryBackoff = new Map<number, number>();
const memoryLastContext = new Map<number, StoredLiveInsightContext>();

function findTeamStat(snapshot: LiveDetectorSnapshot, teamExternalId: number) {
  return snapshot.stats.find(
    (entry) => entry.teamExternalId === teamExternalId
  );
}

export function snapshotLiveContext(
  snapshot: LiveDetectorSnapshot,
  winProbabilities: WinProbabilities
): StoredLiveInsightContext {
  const homeStats = findTeamStat(snapshot, snapshot.homeTeamExternalId);
  const awayStats = findTeamStat(snapshot, snapshot.awayTeamExternalId);

  return {
    scoreHome: snapshot.score.home,
    scoreAway: snapshot.score.away,
    xgHome: homeStats?.expectedGoals ?? null,
    xgAway: awayStats?.expectedGoals ?? null,
    winProbabilities,
    recordedAt: new Date().toISOString(),
  };
}

function scoreChanged(
  prev: StoredLiveInsightContext,
  snapshot: LiveDetectorSnapshot
): boolean {
  return (
    prev.scoreHome !== snapshot.score.home ||
    prev.scoreAway !== snapshot.score.away
  );
}

function xgChanged(
  prev: StoredLiveInsightContext,
  snapshot: LiveDetectorSnapshot
): boolean {
  const homeStats = findTeamStat(snapshot, snapshot.homeTeamExternalId);
  const awayStats = findTeamStat(snapshot, snapshot.awayTeamExternalId);
  const xgHome = homeStats?.expectedGoals ?? null;
  const xgAway = awayStats?.expectedGoals ?? null;

  return prev.xgHome !== xgHome || prev.xgAway !== xgAway;
}

export async function isLiveInsightGenerationInBackoff(
  fixtureProviderId: number
): Promise<boolean> {
  const until = memoryBackoff.get(fixtureProviderId);
  if (until != null && Date.now() < until) {
    return true;
  }

  const redis = getRedis();
  if (!redis) {
    return false;
  }

  const raw = await redis.get<number>(
    liveInsightGenBackoffKey(fixtureProviderId)
  );
  if (raw == null) {
    return false;
  }

  return Date.now() < raw;
}

export async function markLiveInsightGenerationBackoff(
  fixtureProviderId: number
): Promise<void> {
  const until = Date.now() + LIVE_INSIGHT_GENERATION_BACKOFF_MS;
  memoryBackoff.set(fixtureProviderId, until);

  const redis = getRedis();
  if (!redis) {
    return;
  }

  await redis.set(liveInsightGenBackoffKey(fixtureProviderId), until, {
    ex: LIVE_INSIGHT_SCHEDULE_TTL_SEC,
  });
}

export async function readStoredLiveInsightContext(
  fixtureProviderId: number
): Promise<StoredLiveInsightContext | null> {
  const cached = memoryLastContext.get(fixtureProviderId);
  if (cached) {
    return cached;
  }

  const redis = getRedis();
  if (!redis) {
    return null;
  }

  const raw = await redis.get<StoredLiveInsightContext>(
    liveInsightLastContextKey(fixtureProviderId)
  );
  if (raw) {
    memoryLastContext.set(fixtureProviderId, raw);
  }
  return raw ?? null;
}

export async function writeStoredLiveInsightContext(
  fixtureProviderId: number,
  context: StoredLiveInsightContext
): Promise<void> {
  memoryLastContext.set(fixtureProviderId, context);

  const redis = getRedis();
  if (!redis) {
    return;
  }

  await redis.set(liveInsightLastContextKey(fixtureProviderId), context, {
    ex: LIVE_INSIGHT_SCHEDULE_TTL_SEC,
  });
}

export function shouldRunPeriodicLiveInsight(input: {
  lastInsightCreatedAt: string;
  storedContext: StoredLiveInsightContext | null;
  snapshot: LiveDetectorSnapshot;
  previewProbabilities: WinProbabilities;
  now?: number;
}): boolean {
  const now = input.now ?? Date.now();
  const elapsed = now - new Date(input.lastInsightCreatedAt).getTime();
  if (elapsed < LIVE_INSIGHT_PERIODIC_REFRESH_MS) {
    return false;
  }

  if (!input.storedContext) {
    return true;
  }

  if (scoreChanged(input.storedContext, input.snapshot)) {
    return true;
  }

  if (xgChanged(input.storedContext, input.snapshot)) {
    return true;
  }

  return isProbabilityShiftMeaningful(
    input.storedContext.winProbabilities,
    input.previewProbabilities
  );
}
