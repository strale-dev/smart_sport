import type { TeamRef } from "@/types/domain";

export function formatWinProbability(probability: number): string {
  return `${Math.round(probability * 100)}%`;
}

export function formatRelativeTime(
  isoTimestamp: string,
  now = Date.now()
): string {
  const then = new Date(isoTimestamp).getTime();
  if (Number.isNaN(then)) {
    return "Updated recently";
  }

  const diffSec = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSec < 60) {
    return `Updated ${diffSec}s ago`;
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `Updated ${diffMin}m ago`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `Updated ${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Updated ${diffDays}d ago`;
}

export function outcomeLabel(
  outcome: "1" | "X" | "2",
  homeTeam: Pick<TeamRef, "name">,
  awayTeam: Pick<TeamRef, "name">
): string {
  if (outcome === "1") {
    return `${homeTeam.name} win`;
  }

  if (outcome === "2") {
    return `${awayTeam.name} win`;
  }

  return "Draw";
}

export function formatExpectedGoalsRange(range: [number, number]): string {
  const [min, max] = range;
  if (min === max) {
    return `${min}`;
  }

  return `${min}–${max}`;
}
