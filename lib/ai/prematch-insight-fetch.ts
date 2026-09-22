import type { PrematchInsightResponse } from "@/lib/ai/schemas";

type FetchCacheEntry = {
  promise: Promise<PrematchInsightResponse>;
};

const getCache = new Map<number, FetchCacheEntry>();

export async function fetchPrematchInsightGet(
  fixtureId: number
): Promise<PrematchInsightResponse> {
  const cached = getCache.get(fixtureId);
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = fetch(`/api/ai/prematch/${fixtureId}`, {
    method: "GET",
    cache: "no-store",
  })
    .then(async (response) => {
      if (response.status === 403) {
        return { status: "GUEST_FORBIDDEN" } satisfies PrematchInsightResponse;
      }

      if (!response.ok) {
        throw new Error(`Failed to load AI insight (${response.status})`);
      }

      return (await response.json()) as PrematchInsightResponse;
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

export async function fetchPrematchInsightPost(
  fixtureId: number
): Promise<PrematchInsightResponse> {
  const response = await fetch(`/api/ai/prematch/${fixtureId}`, {
    method: "POST",
    cache: "no-store",
  });

  if (response.status === 403) {
    return { status: "GUEST_FORBIDDEN" };
  }

  if (!response.ok) {
    throw new Error(`Failed to generate AI insight (${response.status})`);
  }

  return (await response.json()) as PrematchInsightResponse;
}

export function clearPrematchInsightFetchCache(fixtureId?: number): void {
  if (fixtureId == null) {
    getCache.clear();
    return;
  }

  getCache.delete(fixtureId);
}

export function __resetPrematchInsightFetchCacheForTests(): void {
  getCache.clear();
}
