import type { ScoreSnapshot } from "@/types/domain";

export type MeaningfulEventKind =
  | "GOAL"
  | "RED_CARD"
  | "PENALTY"
  | "VAR_DECISION"
  | "XG_DELTA"
  | "SIGNIFICANT_SUBSTITUTION"
  | "PROBABILITY_SHIFT"
  | "LIVE_BASELINE"
  | "HT"
  | "FT"
  | "AET"
  | "PEN"
  | "MATCH_STATE"
  | "PERIODIC";

/** Documented in docs/audit/07-1-live-ai.md — max team xG delta per poll tick. */
export const XG_DELTA_THRESHOLD = 0.5;

/** Starter sub before this minute is “significant” (PRD §7.7). */
export const SIGNIFICANT_SUB_MAX_MINUTE = 70;

/** Stable public contract for Realtime broadcast + future AI engine. */
export type MeaningfulEventBroadcastPayload = {
  kind: MeaningfulEventKind;
  minute: number | null;
  teamExternalId: number | null;
  reason: string;
  externalEventId?: string;
  meta?: Record<string, unknown>;
};

export type SnapshotEvent = {
  externalEventId: string | null;
  type: string;
  detail: string | null;
  comments: string | null;
  minute: number;
  teamExternalId: number | null;
  playerExternalId: number | null;
  assistPlayerExternalId: number | null;
};

export type SnapshotTeamStats = {
  teamExternalId: number;
  expectedGoals: number | null;
  redCards: number | null;
  shotsTotal?: number | null;
  shotsOnTarget?: number | null;
  ballPossession?: number | null;
};

export type LiveDetectorSnapshot = {
  fixtureProviderId: number;
  capturedAt: string;
  status: string;
  minute: number | null;
  homeTeamExternalId: number;
  awayTeamExternalId: number;
  score: Pick<ScoreSnapshot, "home" | "away">;
  events: SnapshotEvent[];
  stats: SnapshotTeamStats[];
  starterExternalIds: number[];
};

export type DetectedMeaningfulEvent = {
  kind: MeaningfulEventKind;
  reason: string;
  minute: number | null;
  teamExternalId: number | null;
  externalEventId?: string;
  meta?: Record<string, unknown>;
};

export type ScoreGoalMismatch = {
  totalScoreDelta: number;
  newGoalEventCount: number;
};

export type DetectResult = {
  events: DetectedMeaningfulEvent[];
  scoreGoalMismatch?: ScoreGoalMismatch;
};
