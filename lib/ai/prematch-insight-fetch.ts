import type { PrematchInsightResponse } from "@/lib/ai/schemas";

type FetchCacheEntry = {
  promise: Promise<PrematchInsightResponse>;
  response?: PrematchInsightResponse;
};

const getCache = new Map<number, FetchCacheEntry>();

function shouldPersistPrematchResponse(
  payload: PrematchInsightResponse
): boolean {
  return payload.status !== "FALLBACK";
}

function persistPrematchResponse(
  fixtureId: number,
  payload: PrematchInsightResponse
): void {
  if (!shouldPersistPrematchResponse(payload)) {
    getCache.delete(fixtureId);
    return;
  }

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

export async function fetchPrematchInsightGet(
  fixtureId: number
): Promise<PrematchInsightResponse> {
  const cached = getCache.get(fixtureId);
  if (cached?.response) {
    return cached.response;
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const promise = fetch(`/api/ai/prematch/${fixtureId}`, {
    method: "GET",
    cache: "no-store",
  }).then(async (response) => {
    if (response.status === 403) {
      return { status: "GUEST_FORBIDDEN" } satisfies PrematchInsightResponse;
    }

    if (!response.ok) {
      throw new Error(`Failed to load AI insight (${response.status})`);
    }

    const payload = (await response.json()) as PrematchInsightResponse;
    persistPrematchResponse(fixtureId, payload);
    return payload;
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

  const payload = (await response.json()) as PrematchInsightResponse;
  persistPrematchResponse(fixtureId, payload);
  return payload;
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
