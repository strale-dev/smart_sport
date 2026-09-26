export type TeamFixturesApiParams = {
  limit: number;
  offset: number;
  seasonYear?: number;
  league?: number;
  temporal: "all" | "past" | "upcoming";
};

export function parseTeamFixturesSearchParams(
  searchParams: URLSearchParams
): TeamFixturesApiParams {
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "50", 10);
  const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
  const seasonRaw = searchParams.get("season");
  const leagueRaw = searchParams.get("league");
  const temporalRaw = searchParams.get("temporal");

  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 200
      ? limitRaw
      : 50;
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

  const seasonYear =
    seasonRaw != null && seasonRaw.length > 0
      ? Number.parseInt(seasonRaw, 10)
      : undefined;

  const league =
    leagueRaw != null && leagueRaw.length > 0
      ? Number.parseInt(leagueRaw, 10)
      : undefined;

  const temporal =
    temporalRaw === "past" || temporalRaw === "upcoming" ? temporalRaw : "all";

  return {
    limit,
    offset,
    seasonYear: Number.isFinite(seasonYear) ? seasonYear : undefined,
    league: Number.isFinite(league) ? league : undefined,
    temporal,
  };
}

export function teamFixturesQueryCacheKey(
  params: TeamFixturesApiParams
): string {
  return [
    params.temporal,
    params.limit,
    params.offset,
    params.seasonYear ?? "-",
    params.league ?? "-",
  ].join(":");
}
