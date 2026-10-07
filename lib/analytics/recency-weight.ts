import type { HistoryWindowKey } from "@/lib/analytics/history-feature-types";

const MS_PER_DAY = 86_400_000;
const LN2 = Math.LN2;

/** Half-life in days per analysis window (see audit 02-2). */
export const RECENCY_HALF_LIFE_DAYS: Record<HistoryWindowKey, number> = {
  5: 14,
  10: 21,
  20: 45,
  30: 90,
  "30plus": 90,
};

export function lambdaFromHalfLife(halfLifeDays: number): number {
  if (halfLifeDays <= 0) {
    throw new Error("halfLifeDays must be positive");
  }
  return LN2 / halfLifeDays;
}

export function ageDaysBefore(beforeAt: string, kickoffAt: string): number {
  const beforeMs = new Date(beforeAt).getTime();
  const kickoffMs = new Date(kickoffAt).getTime();
  const diff = beforeMs - kickoffMs;
  return Math.max(0, diff / MS_PER_DAY);
}

export function weightForKickoff(input: {
  kickoffAt: string;
  beforeAt: string;
  halfLifeDays: number;
}): number {
  const age = ageDaysBefore(input.beforeAt, input.kickoffAt);
  const lambda = lambdaFromHalfLife(input.halfLifeDays);
  return Math.exp(-lambda * age);
}

export function halfLifeForWindow(window: HistoryWindowKey): number {
  return RECENCY_HALF_LIFE_DAYS[window];
}

export type WeightedSample = { value: number; weight: number };

export function weightedMean(samples: WeightedSample[]): number | null {
  if (samples.length === 0) {
    return null;
  }
  let sumW = 0;
  let sumV = 0;
  for (const { value, weight } of samples) {
    if (weight <= 0) {
      continue;
    }
    sumW += weight;
    sumV += value * weight;
  }
  if (sumW <= 0) {
    return null;
  }
  return sumV / sumW;
}

export function weightedRate(
  samples: Array<{ hit: boolean; weight: number }>
): number | null {
  if (samples.length === 0) {
    return null;
  }
  let sumW = 0;
  let sumHits = 0;
  for (const { hit, weight } of samples) {
    if (weight <= 0) {
      continue;
    }
    sumW += weight;
    if (hit) {
      sumHits += weight;
    }
  }
  if (sumW <= 0) {
    return null;
  }
  return sumHits / sumW;
}

export function normalizeWeights(
  weights: number[],
  capTotal: number
): number[] {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0 || capTotal <= 0) {
    return weights.map(() => 0);
  }
  if (total <= capTotal) {
    return weights;
  }
  const scale = capTotal / total;
  return weights.map((w) => w * scale);
}

export function metricFromValue(
  value: number | null,
  sampleSize: number,
  reason?: string
): import("@/lib/analytics/history-feature-types").MetricAvailability {
  if (value === null || sampleSize === 0) {
    return {
      status: "unavailable",
      value: null,
      sampleSize: 0,
      reason: reason ?? "insufficient_data",
    };
  }
  return {
    status: "available",
    value: Number(value.toFixed(4)),
    sampleSize,
  };
}
