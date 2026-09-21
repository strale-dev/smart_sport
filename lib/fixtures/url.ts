export type FixturesSearchParams = {
  league?: number;
  country?: string;
  q?: string;
};

export function buildFixturesHref(
  params: FixturesSearchParams,
  overrides: Partial<FixturesSearchParams> = {}
): string {
  const merged = { ...params, ...overrides };
  const searchParams = new URLSearchParams();

  if (merged.league != null) {
    searchParams.set("league", String(merged.league));
  }
  if (merged.country?.trim()) {
    searchParams.set("country", merged.country.trim());
  }
  if (merged.q?.trim()) {
    searchParams.set("q", merged.q.trim());
  }

  const query = searchParams.toString();
  return query ? `/fixtures?${query}` : "/fixtures";
}

export function parseFixturesParams(input: {
  league?: string;
  country?: string;
  q?: string;
}): FixturesSearchParams {
  const league =
    input.league != null && input.league !== ""
      ? Number.parseInt(input.league, 10)
      : undefined;

  const country = input.country?.trim() || undefined;
  const q = input.q?.trim() || undefined;

  return {
    league: Number.isFinite(league) ? league : undefined,
    country,
    q,
  };
}

export function buildFixturesApiHref(
  params: FixturesSearchParams = {}
): string {
  const searchParams = new URLSearchParams();
  if (params.league != null) {
    searchParams.set("league", String(params.league));
  }
  if (params.country) {
    searchParams.set("country", params.country);
  }
  if (params.q) {
    searchParams.set("q", params.q);
  }
  const query = searchParams.toString();
  return query ? `/api/fixtures?${query}` : "/api/fixtures";
}
