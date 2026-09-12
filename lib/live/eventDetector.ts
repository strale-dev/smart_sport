import type {
  DetectedMeaningfulEvent,
  DetectResult,
  LiveDetectorSnapshot,
  MeaningfulEventBroadcastPayload,
  MeaningfulEventKind,
  SnapshotEvent,
  SnapshotTeamStats,
} from "@/lib/live/event-detector-types";
import {
  SIGNIFICANT_SUB_MAX_MINUTE,
  XG_DELTA_THRESHOLD,
} from "@/lib/live/event-detector-types";

function normalizeText(value: string | null | undefined): string {
  return value?.toLowerCase() ?? "";
}

function isGoalType(type: string): boolean {
  return type.toLowerCase().includes("goal");
}

function isSubstType(type: string): boolean {
  return type.toLowerCase().includes("subst");
}

function isVarType(type: string): boolean {
  return type.toLowerCase().includes("var");
}

export function isRedCardDetail(detail: string | null): boolean {
  const normalized = normalizeText(detail);
  return normalized.includes("red") || normalized.includes("second yellow");
}

function isRedCardEvent(event: SnapshotEvent): boolean {
  return event.type === "Card" && isRedCardDetail(event.detail);
}

function isPenaltyGoalEvent(event: SnapshotEvent): boolean {
  return (
    isGoalType(event.type) && normalizeText(event.detail).includes("penalty")
  );
}

function isPenaltyVarEvent(event: SnapshotEvent): boolean {
  if (!isVarType(event.type)) {
    return false;
  }

  const haystack = `${normalizeText(event.detail)} ${normalizeText(event.comments)}`;
  return haystack.includes("penalty");
}

function eventIdentityKey(event: SnapshotEvent): string | null {
  return event.externalEventId;
}

function prevEventIds(prev: LiveDetectorSnapshot): Set<string> {
  const ids = new Set<string>();
  for (const event of prev.events) {
    if (event.externalEventId) {
      ids.add(event.externalEventId);
    }
  }
  return ids;
}

function newEventsSince(
  prev: LiveDetectorSnapshot,
  next: LiveDetectorSnapshot
): SnapshotEvent[] {
  const known = prevEventIds(prev);
  return next.events.filter((event) => {
    const id = eventIdentityKey(event);
    if (!id) {
      return true;
    }
    return !known.has(id);
  });
}

function scoreGoals(value: number | null | undefined): number {
  return value ?? 0;
}

function computeScoreDelta(
  prev: LiveDetectorSnapshot,
  next: LiveDetectorSnapshot
): number {
  const deltaHome = Math.max(
    0,
    scoreGoals(next.score.home) - scoreGoals(prev.score.home)
  );
  const deltaAway = Math.max(
    0,
    scoreGoals(next.score.away) - scoreGoals(prev.score.away)
  );
  return deltaHome + deltaAway;
}

function statValue(value: number | null | undefined): number {
  return value ?? 0;
}

function findTeamStat(
  stats: SnapshotTeamStats[],
  teamExternalId: number
): SnapshotTeamStats | undefined {
  return stats.find((entry) => entry.teamExternalId === teamExternalId);
}

function hasAnyExpectedGoals(stats: SnapshotTeamStats[]): boolean {
  return stats.some((entry) => entry.expectedGoals != null);
}

function computeXgDelta(
  prev: LiveDetectorSnapshot,
  next: LiveDetectorSnapshot
): number | null {
  if (!hasAnyExpectedGoals(prev.stats) || !hasAnyExpectedGoals(next.stats)) {
    return null;
  }

  const teamIds = new Set<number>();
  for (const entry of [...prev.stats, ...next.stats]) {
    teamIds.add(entry.teamExternalId);
  }

  let maxDelta = 0;
  for (const teamExternalId of teamIds) {
    const prevStat = findTeamStat(prev.stats, teamExternalId);
    const nextStat = findTeamStat(next.stats, teamExternalId);
    const delta = Math.abs(
      statValue(nextStat?.expectedGoals) - statValue(prevStat?.expectedGoals)
    );
    maxDelta = Math.max(maxDelta, delta);
  }

  return maxDelta;
}

function totalRedCardStatDelta(
  prev: LiveDetectorSnapshot,
  next: LiveDetectorSnapshot
): number {
  const teamIds = new Set<number>();
  for (const entry of [...prev.stats, ...next.stats]) {
    teamIds.add(entry.teamExternalId);
  }

  let total = 0;
  for (const teamExternalId of teamIds) {
    const prevStat = findTeamStat(prev.stats, teamExternalId);
    const nextStat = findTeamStat(next.stats, teamExternalId);
    const delta = statValue(nextStat?.redCards) - statValue(prevStat?.redCards);
    if (delta > 0) {
      total += delta;
    }
  }

  return total;
}

export function toMeaningfulEventBroadcastPayload(
  event: DetectedMeaningfulEvent
): MeaningfulEventBroadcastPayload {
  return {
    kind: event.kind,
    minute: event.minute,
    teamExternalId: event.teamExternalId,
    reason: event.reason,
    externalEventId: event.externalEventId,
    meta: event.meta,
  };
}

export function detectMeaningfulEvents(
  prev: LiveDetectorSnapshot | null,
  next: LiveDetectorSnapshot
): DetectResult {
  if (!prev) {
    return { events: [] };
  }

  const events: DetectedMeaningfulEvent[] = [];
  const seenKindByEventId = new Map<string, Set<MeaningfulEventKind>>();

  const pushEvent = (event: DetectedMeaningfulEvent): void => {
    if (event.externalEventId) {
      const kinds =
        seenKindByEventId.get(event.externalEventId) ??
        new Set<MeaningfulEventKind>();
      if (kinds.has(event.kind)) {
        return;
      }
      kinds.add(event.kind);
      seenKindByEventId.set(event.externalEventId, kinds);
    }
    events.push(event);
  };

  const freshEvents = newEventsSince(prev, next);

  for (const event of freshEvents) {
    if (isPenaltyGoalEvent(event) || isPenaltyVarEvent(event)) {
      pushEvent({
        kind: "PENALTY",
        reason: isPenaltyGoalEvent(event) ? "penalty_goal" : "penalty_var",
        minute: event.minute,
        teamExternalId: event.teamExternalId,
        externalEventId: event.externalEventId ?? undefined,
        meta: event.playerExternalId
          ? { playerExternalId: event.playerExternalId }
          : undefined,
      });
    }
  }

  const newGoalEvents = freshEvents.filter((event) => isGoalType(event.type));
  const newGoalEventCount = newGoalEvents.length;

  for (const event of newGoalEvents) {
    pushEvent({
      kind: "GOAL",
      reason: isPenaltyGoalEvent(event) ? "penalty_goal_scored" : "goal_event",
      minute: event.minute,
      teamExternalId: event.teamExternalId,
      externalEventId: event.externalEventId ?? undefined,
      meta: event.playerExternalId
        ? { playerExternalId: event.playerExternalId }
        : undefined,
    });
  }

  const newRedCardEvents = freshEvents.filter((event) => isRedCardEvent(event));
  for (const event of newRedCardEvents) {
    pushEvent({
      kind: "RED_CARD",
      reason: "red_card_event",
      minute: event.minute,
      teamExternalId: event.teamExternalId,
      externalEventId: event.externalEventId ?? undefined,
      meta: event.playerExternalId
        ? { playerExternalId: event.playerExternalId }
        : undefined,
    });
  }

  const statRedDelta = totalRedCardStatDelta(prev, next);
  const uncoveredRedCards = Math.max(0, statRedDelta - newRedCardEvents.length);
  for (let index = 0; index < uncoveredRedCards; index += 1) {
    pushEvent({
      kind: "RED_CARD",
      reason: "red_cards_stat_fallback",
      minute: next.minute,
      teamExternalId: null,
      meta: { statFallbackIndex: index + 1 },
    });
  }

  const xgDelta = computeXgDelta(prev, next);
  if (xgDelta != null && xgDelta >= XG_DELTA_THRESHOLD) {
    pushEvent({
      kind: "XG_DELTA",
      reason: "expected_goals_delta",
      minute: next.minute,
      teamExternalId: null,
      meta: { delta: xgDelta, threshold: XG_DELTA_THRESHOLD },
    });
  }

  const starterSet = new Set(next.starterExternalIds);
  for (const event of freshEvents) {
    if (!isSubstType(event.type)) {
      continue;
    }

    const offPlayerId = event.assistPlayerExternalId;
    if (offPlayerId == null || !starterSet.has(offPlayerId)) {
      continue;
    }

    if (event.minute >= SIGNIFICANT_SUB_MAX_MINUTE) {
      continue;
    }

    pushEvent({
      kind: "SIGNIFICANT_SUBSTITUTION",
      reason: "starter_substitution_before_70",
      minute: event.minute,
      teamExternalId: event.teamExternalId,
      externalEventId: event.externalEventId ?? undefined,
      meta: {
        playerOffExternalId: offPlayerId,
        playerOnExternalId: event.playerExternalId,
      },
    });
  }

  const totalScoreDelta = computeScoreDelta(prev, next);
  let scoreGoalMismatch: DetectResult["scoreGoalMismatch"];
  if (totalScoreDelta > newGoalEventCount) {
    scoreGoalMismatch = {
      totalScoreDelta,
      newGoalEventCount,
    };

    const fallbackCount = totalScoreDelta - newGoalEventCount;
    for (let index = 0; index < fallbackCount; index += 1) {
      pushEvent({
        kind: "GOAL",
        reason: "score_diff_fallback",
        minute: next.minute,
        teamExternalId: null,
        meta: { fallbackIndex: index + 1, scoreGoalMismatch: true },
      });
    }
  }

  return {
    events,
    scoreGoalMismatch,
  };
}
