import type { PlayerPosition, PlayerSeasonStatistics } from "@/types/domain";

export type PlayerAttributeCategory = {
  key: string;
  label: string;
  value: number;
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ratioScore(value: number | null, cap: number): number | null {
  if (value == null || !Number.isFinite(value) || cap <= 0) {
    return null;
  }
  return clampScore((value / cap) * 100);
}

function avgRatingScore(rating: number | null): number | null {
  if (rating == null || !Number.isFinite(rating)) {
    return null;
  }
  return clampScore(((rating - 5) / 4) * 100);
}

function passAccuracyScore(accuracy: number | null): number | null {
  if (accuracy == null || !Number.isFinite(accuracy)) {
    return null;
  }
  return clampScore(accuracy);
}

function dribbleRate(stats: PlayerSeasonStatistics): number | null {
  if (!stats.dribblesAttempted || stats.dribblesSuccess == null) {
    return null;
  }
  return clampScore((stats.dribblesSuccess / stats.dribblesAttempted) * 100);
}

type CategoryBuilder = (
  stats: PlayerSeasonStatistics
) => PlayerAttributeCategory | null;

function category(
  key: string,
  label: string,
  score: number | null
): PlayerAttributeCategory | null {
  if (score == null) {
    return null;
  }
  return { key, label, value: score };
}

const GK_CATEGORIES: CategoryBuilder[] = [
  (s) => category("shot_stopping", "Shot stopping", ratioScore(s.saves, 120)),
  (s) =>
    category(
      "distribution",
      "Distribution",
      passAccuracyScore(s.passesAccuracy)
    ),
  (s) => category("handling", "Handling", ratioScore(s.saves, 100)),
  (s) =>
    category("positioning", "Positioning", avgRatingScore(s.averageRating)),
];

const DF_CATEGORIES: CategoryBuilder[] = [
  (s) => category("defending", "Defending", ratioScore(s.tacklesTotal, 80)),
  (s) =>
    category("interceptions", "Interceptions", ratioScore(s.interceptions, 60)),
  (s) => category("aerial", "Aerial duels", ratioScore(s.blocks, 35)),
  (s) => category("passing", "Passing", passAccuracyScore(s.passesAccuracy)),
  (s) => category("blocks", "Blocks", ratioScore(s.blocks, 40)),
];

const MF_CATEGORIES: CategoryBuilder[] = [
  (s) => category("passing", "Passing", passAccuracyScore(s.passesAccuracy)),
  (s) => category("creativity", "Creativity", ratioScore(s.keyPasses, 60)),
  (s) => category("assists", "Assists", ratioScore(s.assists, 15)),
  (s) =>
    category("ball_recovery", "Ball recovery", ratioScore(s.tacklesTotal, 50)),
  (s) => category("dribbling", "Dribbling", dribbleRate(s)),
];

const FW_CATEGORIES: CategoryBuilder[] = [
  (s) => category("finishing", "Finishing", ratioScore(s.goals, 25)),
  (s) =>
    category("shot_quality", "Shot quality", ratioScore(s.shotsOnTarget, 40)),
  (s) => category("movement", "Movement", ratioScore(s.shotsTotal, 60)),
  (s) => category("link_play", "Link play", ratioScore(s.assists, 12)),
  (s) => category("pressing", "Pressing", ratioScore(s.tacklesTotal, 35)),
];

const ROLE_BUILDERS: Record<PlayerPosition, CategoryBuilder[]> = {
  GK: GK_CATEGORIES,
  DF: DF_CATEGORIES,
  MF: MF_CATEGORIES,
  FW: FW_CATEGORIES,
};

export function getPlayerAttributeCategories(
  stats: PlayerSeasonStatistics,
  position: PlayerPosition | null
): PlayerAttributeCategory[] {
  const role = position ?? "MF";
  const builders = ROLE_BUILDERS[role];
  return builders
    .map((build) => build(stats))
    .filter((entry): entry is PlayerAttributeCategory => entry != null);
}
