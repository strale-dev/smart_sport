import type { MeaningfulEventKind } from "@/lib/live/event-detector-types";

const LABELS: Record<MeaningfulEventKind, string> = {
  GOAL: "Goal",
  RED_CARD: "Red card",
  PENALTY: "Penalty",
  XG_DELTA: "xG shift",
  SIGNIFICANT_SUBSTITUTION: "Key substitution",
  PROBABILITY_SHIFT: "Model shift",
  LIVE_BASELINE: "Live analysis started",
  HT: "Half-time update",
  PERIODIC: "Live refresh",
};

export function labelMeaningfulEvent(kind: MeaningfulEventKind): string {
  return LABELS[kind] ?? "Live update";
}
