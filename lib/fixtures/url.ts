export type FixturesSearchParams = {
  league?: number;
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

  const query = searchParams.toString();
  return query ? `/fixtures?${query}` : "/fixtures";
}

export function parseFixturesParams(input: {
  league?: string;
}): FixturesSearchParams {
  const league =
    input.league != null && input.league !== ""
      ? Number.parseInt(input.league, 10)
      : undefined;

  return {
    league: Number.isFinite(league) ? league : undefined,
  };
}

export function buildFixturesApiHref(
  params: FixturesSearchParams = {}
): string {
  const searchParams = new URLSearchParams();
  if (params.league != null) {
    searchParams.set("league", String(params.league));
  }
  const query = searchParams.toString();
  return query ? `/api/fixtures?${query}` : "/api/fixtures";
}
