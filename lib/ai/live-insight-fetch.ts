import type { LiveInsightResponse } from "@/lib/ai/schemas";

export async function fetchLiveInsight(
  fixtureId: number
): Promise<LiveInsightResponse> {
  const response = await fetch(`/api/ai/live/${fixtureId}`, {
    method: "GET",
    cache: "no-store",
  });

  if (response.status === 403) {
    return {
      status: "UNAVAILABLE",
      fixtureExternalId: fixtureId,
      reason: "NOT_LIVE",
    };
  }

  if (!response.ok) {
    throw new Error(`Failed to load live AI insight (${response.status})`);
  }

  return (await response.json()) as LiveInsightResponse;
}
