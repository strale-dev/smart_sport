import type { FixtureEvent, FixtureTeamStatistics } from "@/types/domain";

export type MomentumBucket = {
  minuteStart: number;
  minuteEnd: number;
  homeIntensity: number;
  awayIntensity: number;
};

const BUCKET_SIZE = 5;

const INTENSITY_WEIGHTS: Record<string, number> = {
  Goal: 3,
  Card: 1.5,
  subst: 0.5,
  Var: 1,
};

function eventWeight(type: string): number {
  for (const [key, weight] of Object.entries(INTENSITY_WEIGHTS)) {
    if (type.toLowerCase().includes(key.toLowerCase())) {
      return weight;
    }
  }

  return 0.5;
}

function distributeStatToBuckets(
  total: number | null,
  bucketCount: number,
  side: "home" | "away",
  buckets: MomentumBucket[]
) {
  if (total == null || total <= 0 || bucketCount === 0) {
    return;
  }

  const perBucket = total / bucketCount;
  for (let index = 0; index < bucketCount; index += 1) {
    if (side === "home") {
      buckets[index]!.homeIntensity += perBucket;
    } else {
      buckets[index]!.awayIntensity += perBucket;
    }
  }
}

export function computeMatchMomentum(
  events: FixtureEvent[],
  stats: FixtureTeamStatistics[],
  maxMinute = 90
): MomentumBucket[] {
  const bucketCount = Math.max(1, Math.ceil(maxMinute / BUCKET_SIZE));
  const buckets: MomentumBucket[] = Array.from(
    { length: bucketCount },
    (_, index) => ({
      minuteStart: index * BUCKET_SIZE + 1,
      minuteEnd: Math.min((index + 1) * BUCKET_SIZE, maxMinute),
      homeIntensity: 0,
      awayIntensity: 0,
    })
  );

  for (const event of events) {
    const bucketIndex = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor((event.minute - 1) / BUCKET_SIZE))
    );
    const weight = eventWeight(event.type);
    const bucket = buckets[bucketIndex]!;

    if (event.teamExternalId === stats[0]?.teamExternalId) {
      bucket.homeIntensity += weight;
    } else if (event.teamExternalId === stats[1]?.teamExternalId) {
      bucket.awayIntensity += weight;
    } else if (event.teamExternalId != null) {
      bucket.homeIntensity += weight * 0.5;
      bucket.awayIntensity += weight * 0.5;
    }
  }

  const homeStats = stats[0];
  const awayStats = stats[1];

  distributeStatToBuckets(
    homeStats?.shotsOnTarget ?? homeStats?.shotsTotal ?? null,
    bucketCount,
    "home",
    buckets
  );
  distributeStatToBuckets(
    awayStats?.shotsOnTarget ?? awayStats?.shotsTotal ?? null,
    bucketCount,
    "away",
    buckets
  );

  return buckets.map((bucket) => ({
    ...bucket,
    homeIntensity: Number(bucket.homeIntensity.toFixed(2)),
    awayIntensity: Number(bucket.awayIntensity.toFixed(2)),
  }));
}
