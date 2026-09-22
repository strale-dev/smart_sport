import type { LiveInsightResponse } from "@/lib/ai/schemas";

type FetchCacheEntry = {
  promise: Promise<LiveInsightResponse>;
};

const getCache = new Map<number, FetchCacheEntry>();

export async function fetchLiveInsight(
  fixtureId: number
): Promise<LiveInsightResponse> {
  const cached = getCache.get(fixtureId);
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = fetch(`/api/ai/live/${fixtureId}`, {
    method: "GET",
    cache: "no-store",
  })
    .then(async (response) => {
      if (response.status === 403) {
        return { status: "GUEST_FORBIDDEN" } satisfies LiveInsightResponse;
      }

      if (!response.ok) {
        throw new Error(`Failed to load live AI insight (${response.status})`);
      }

      return (await response.json()) as LiveInsightResponse;
    })
    .finally(() => {
      const current = getCache.get(fixtureId);
      if (current?.promise === promise) {
        getCache.delete(fixtureId);
      }
    });

  getCache.set(fixtureId, { promise });
  return promise;
}

export function __resetLiveInsightFetchCacheForTests(): void {
  getCache.clear();
}
