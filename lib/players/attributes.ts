import type { PlayerPosition, PlayerSeasonStatistics } from "@/types/domain";

export type PlayerAttributeMetric = {
  key: string;
  label: string;
  value: number;
};

function dribbleSuccessRate(stats: PlayerSeasonStatistics): number | null {
  if (stats.dribblesAttempted == null || stats.dribblesAttempted === 0) {
    return null;
  }

  if (stats.dribblesSuccess == null) {
    return null;
  }

  return Math.round((stats.dribblesSuccess / stats.dribblesAttempted) * 100);
}

function pickMetric(
  stats: PlayerSeasonStatistics,
  key: keyof PlayerSeasonStatistics,
  label: string
): PlayerAttributeMetric | null {
  const raw = stats[key];
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return null;
  }

  return { key, label, value: raw };
}

export function getPlayerAttributeMetrics(
  stats: PlayerSeasonStatistics,
  position: PlayerPosition | null
): PlayerAttributeMetric[] {
  const role = position ?? "MF";

  const byRole: Record<PlayerPosition, Array<PlayerAttributeMetric | null>> = {
    GK: [
      pickMetric(stats, "saves", "Saves"),
      pickMetric(stats, "goalsConceded", "Goals conceded"),
      pickMetric(stats, "averageRating", "Avg rating"),
      pickMetric(stats, "appearances", "Appearances"),
    ],
    DF: [
      pickMetric(stats, "tacklesTotal", "Tackles"),
      pickMetric(stats, "interceptions", "Interceptions"),
      pickMetric(stats, "blocks", "Blocks"),
      pickMetric(stats, "averageRating", "Avg rating"),
    ],
    MF: [
      pickMetric(stats, "keyPasses", "Key passes"),
      pickMetric(stats, "assists", "Assists"),
      pickMetric(stats, "passesAccuracy", "Pass accuracy %"),
      (() => {
        const rate = dribbleSuccessRate(stats);
        return rate == null
          ? null
          : {
              key: "dribbleSuccessRate",
              label: "Dribble success %",
              value: rate,
            };
      })(),
    ],
    FW: [
      pickMetric(stats, "goals", "Goals"),
      pickMetric(stats, "assists", "Assists"),
      pickMetric(stats, "shotsOnTarget", "Shots on target"),
      (() => {
        const rate = dribbleSuccessRate(stats);
        return rate == null
          ? null
          : {
              key: "dribbleSuccessRate",
              label: "Dribble success %",
              value: rate,
            };
      })(),
    ],
  };

  const metrics = byRole[role].filter(
    (metric): metric is PlayerAttributeMetric => metric != null
  );

  if (metrics.length > 0) {
    return metrics;
  }

  return [
    pickMetric(stats, "goals", "Goals"),
    pickMetric(stats, "assists", "Assists"),
    pickMetric(stats, "appearances", "Appearances"),
    pickMetric(stats, "averageRating", "Avg rating"),
  ].filter((metric): metric is PlayerAttributeMetric => metric != null);
}
