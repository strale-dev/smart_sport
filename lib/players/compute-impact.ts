export function positionWeight(position: string | null): number {
  if (!position) {
    return 1;
  }

  const normalized = position.toUpperCase();
  if (normalized === "F" || normalized === "FW") {
    return 1.3;
  }
  if (normalized === "M" || normalized === "MF") {
    return 1.2;
  }
  if (normalized === "D" || normalized === "DF") {
    return 1;
  }
  if (normalized === "G" || normalized === "GK") {
    return 0.8;
  }

  return 1;
}

export function computePrematchImpactScore(input: {
  avgRating: number | null;
  goals: number;
  assists: number;
  position: string | null;
  isCaptain: boolean;
}): number {
  const rating = input.avgRating ?? 6.5;
  const positionMultiplier = positionWeight(input.position);
  const captainBonus = input.isCaptain ? 0.15 : 0;

  return (
    rating * positionMultiplier +
    input.goals * 0.3 +
    input.assists * 0.2 +
    captainBonus
  );
}

export function computeActualImpactScore(input: {
  rating: number | null;
  goals: number | null;
  assists: number | null;
}): number {
  if (input.rating != null) {
    return input.rating;
  }

  return (input.goals ?? 0) * 2 + (input.assists ?? 0) * 1.5;
}

export function pickTopPlayers<
  T extends { score: number; teamExternalId: number },
>(players: T[], limit = 3, maxPerTeam = 2): T[] {
  const sorted = [...players].sort((left, right) => right.score - left.score);
  const selected: T[] = [];
  const teamCounts = new Map<number, number>();

  for (const player of sorted) {
    const currentCount = teamCounts.get(player.teamExternalId) ?? 0;
    if (currentCount >= maxPerTeam) {
      continue;
    }

    selected.push(player);
    teamCounts.set(player.teamExternalId, currentCount + 1);

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}
