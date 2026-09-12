import type { LiveInsightResponse } from "@/lib/ai/schemas";
import type { FixturePhase } from "@/lib/ai/status-map";
import { resolveFixturePhase } from "@/lib/ai/status-map";
import type { PrematchInsightHookState } from "@/lib/ai/prematch-insight-state";
import type { PrematchInsightMode, StoredAIInsight } from "@/lib/ai/schemas";

export function mapLiveInsightResponseToViewModel(
  response: LiveInsightResponse,
  fixtureStatus: string
): {
  state: PrematchInsightHookState;
  insight: StoredAIInsight | null;
  insightMode: PrematchInsightMode | null;
  fixturePhase: FixturePhase;
  errorMessage: string | null;
} {
  const fixturePhase = resolveFixturePhase(fixtureStatus);

  switch (response.status) {
    case "OK":
      return {
        state: "ok",
        insight: response.insight,
        insightMode: response.insightMode,
        fixturePhase,
        errorMessage: null,
      };
    case "MISS":
      return {
        state: "miss",
        insight: null,
        insightMode: null,
        fixturePhase,
        errorMessage: null,
      };
    case "UNAVAILABLE":
      return {
        state: "unavailable",
        insight: null,
        insightMode: null,
        fixturePhase,
        errorMessage: null,
      };
    default:
      return {
        state: "error",
        insight: null,
        insightMode: null,
        fixturePhase,
        errorMessage: "Unexpected live insight response",
      };
  }
}
