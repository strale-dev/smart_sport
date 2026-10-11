import type { PrematchInsightResponse } from "@/lib/ai/schemas";

export type AutoEnsureKeyInput = {
  fixtureId: number;
  predictionFingerprint: string | null | undefined;
  contextHash: string | null | undefined;
  aiGenerationAllowed: boolean;
  aiContextReady: boolean;
};

export type AutoEnsurePostOutcome =
  PrematchInsightResponse["status"] | "NETWORK_ERROR" | null;

/**
 * Stable key for auto-ensure: retry when fixture inputs or readiness gates change.
 */
export function buildAutoEnsureKey(input: AutoEnsureKeyInput): string {
  return [
    String(input.fixtureId),
    input.predictionFingerprint ?? "",
    input.contextHash ?? "",
    input.aiGenerationAllowed ? "1" : "0",
    input.aiContextReady ? "1" : "0",
  ].join(":");
}

/**
 * Outcomes that reached the server generation path (or exhausted quota).
 * UNAVAILABLE / MISS / NETWORK_ERROR do not block a later attempt for the same key.
 */
export function isAutoEnsureLockingOutcome(
  outcome: AutoEnsurePostOutcome
): boolean {
  if (outcome == null) {
    return false;
  }
  return (
    outcome === "OK" ||
    outcome === "GENERATION_FAILED" ||
    outcome === "FALLBACK" ||
    outcome === "AI_LIMIT_REACHED"
  );
}

export type ShouldStartAutoEnsureInput = {
  inFlight: boolean;
  lastLockedKey: string | null;
  currentKey: string;
  lastPostOutcome: AutoEnsurePostOutcome;
};

/**
 * Whether a new auto-ensure POST should start.
 */
export function shouldStartAutoEnsure(
  input: ShouldStartAutoEnsureInput
): boolean {
  if (input.inFlight) {
    return false;
  }

  if (input.lastLockedKey !== input.currentKey) {
    return true;
  }

  return !isAutoEnsureLockingOutcome(input.lastPostOutcome);
}

export function recordAutoEnsureOutcome(input: {
  currentKey: string;
  postOutcome: AutoEnsurePostOutcome;
}): string | null {
  if (isAutoEnsureLockingOutcome(input.postOutcome)) {
    return input.currentKey;
  }
  return null;
}
