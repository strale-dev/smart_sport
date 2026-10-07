import type {
  FixtureReadinessGates,
  FixtureReadinessSnapshot,
  ReadinessItem,
} from "./types";

export function isFixtureReadyForPrediction(
  snapshot: FixtureReadinessSnapshot
): boolean {
  return snapshot.gates.predictionReady;
}

export function isPredictionFresh(snapshot: FixtureReadinessSnapshot): boolean {
  return snapshot.gates.predictionFresh;
}

export function isAiContextReady(snapshot: FixtureReadinessSnapshot): boolean {
  return snapshot.gates.aiContextReady;
}

export function isAiGenerationAllowed(
  snapshot: FixtureReadinessSnapshot
): boolean {
  return snapshot.gates.aiGenerationAllowed;
}

export function isLiveDataCurrent(snapshot: FixtureReadinessSnapshot): boolean {
  return snapshot.gates.liveDataCurrent;
}

export function isHistoricalDataSufficient(
  snapshot: FixtureReadinessSnapshot
): boolean {
  return snapshot.gates.historicalDataSufficient;
}

export function listReadinessItems(
  snapshot: FixtureReadinessSnapshot
): ReadinessItem[] {
  return snapshot.items;
}

export function parseFixtureReadinessSnapshot(
  raw: unknown
): FixtureReadinessSnapshot | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as FixtureReadinessSnapshot;
  if (record.version !== 1 || !record.gates || !record.phase) {
    return null;
  }
  return record;
}

export function gatesFromSnapshot(
  snapshot: FixtureReadinessSnapshot | null
): FixtureReadinessGates {
  if (!snapshot) {
    return {
      predictionReady: false,
      predictionFresh: false,
      aiContextReady: false,
      aiGenerationAllowed: false,
      liveDataCurrent: false,
      historicalDataSufficient: false,
    };
  }
  return snapshot.gates;
}
