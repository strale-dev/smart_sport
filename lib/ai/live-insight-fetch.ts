import type { LiveInsightResponse } from "@/lib/ai/schemas";

type FetchCacheEntry = {
  promise: Promise<LiveInsightResponse>;
  response?: LiveInsightResponse;
};

const getCache = new Map<number, FetchCacheEntry>();

function persistLiveResponse(
  fixtureId: number,
  payload: LiveInsightResponse
): void {
  const entry = getCache.get(fixtureId);
  if (entry) {
    entry.response = payload;
    return;
  }

  getCache.set(fixtureId, {
    promise: Promise.resolve(payload),
    response: payload,
  });
}

export async function fetchLiveInsight(
  fixtureId: number
): Promise<LiveInsightResponse> {
  const cached = getCache.get(fixtureId);
  if (cached?.response) {
    return cached.response;
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const promise = fetch(`/api/ai/live/${fixtureId}`, {
    method: "GET",
    cache: "no-store",
  }).then(async (response) => {
    if (response.status === 403) {
      return {
        status: "UNAVAILABLE",
        fixtureExternalId: fixtureId,
        reason: "NOT_LIVE",
      } satisfies LiveInsightResponse;
    }

    if (!response.ok) {
      throw new Error(`Failed to load live AI insight (${response.status})`);
    }

    const payload = (await response.json()) as LiveInsightResponse;
    persistLiveResponse(fixtureId, payload);
    return payload;
  });

  getCache.set(fixtureId, { promise });
  return promise;
}

export function __resetLiveInsightFetchCacheForTests(): void {
  getCache.clear();
}
