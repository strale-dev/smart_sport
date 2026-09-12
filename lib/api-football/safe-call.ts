export function isOptionalProviderFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "ApiFootballError" ||
    error.name === "ApiFootballQuotaError" ||
    error.message.includes("API-Football")
  );
}

export async function safeOptionalProviderFetch<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isOptionalProviderFailure(error)) {
      console.warn(`[api-football] ${label} unavailable`, error);
      return fallback;
    }

    throw error;
  }
}
