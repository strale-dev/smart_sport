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
