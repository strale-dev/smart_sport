import type { FixtureStatus } from "@/types/domain";

export type FixturePhase = "PREMATCH" | "LIVE" | "FINISHED" | "NEITHER";

export const PREMATCH_STATUSES = new Set<FixtureStatus>(["NS", "TBD"]);

export const LIVE_STATUSES = new Set<FixtureStatus>([
  "1H",
  "HT",
  "2H",
  "ET",
  "P",
  "BT",
  "LIVE",
  "INT",
  "SUSP",
]);

export const FINISHED_STATUSES = new Set<FixtureStatus>(["FT", "AET", "PEN"]);

export const NEITHER_STATUSES = new Set<FixtureStatus>([
  "PST",
  "CANC",
  "ABD",
  "AWD",
  "WO",
]);

export function resolveFixturePhase(status: string): FixturePhase {
  if (PREMATCH_STATUSES.has(status as FixtureStatus)) {
    return "PREMATCH";
  }

  if (LIVE_STATUSES.has(status as FixtureStatus)) {
    return "LIVE";
  }

  if (FINISHED_STATUSES.has(status as FixtureStatus)) {
    return "FINISHED";
  }

  return "NEITHER";
}

export function canGeneratePrematchInsight(status: string): boolean {
  return resolveFixturePhase(status) === "PREMATCH";
}

export function isHistoricalInsightOnly(status: string): boolean {
  const phase = resolveFixturePhase(status);
  return phase === "LIVE" || phase === "FINISHED";
}

export function isFixtureAnalyzable(status: string): boolean {
  return resolveFixturePhase(status) !== "NEITHER";
}
