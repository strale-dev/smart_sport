import type { Season } from "@/types/domain";

export function resolveLeagueSeasonYear(
  seasons: Season[],
  requestedSeason?: number | null
): number | null {
  if (
    requestedSeason != null &&
    seasons.some((season) => season.year === requestedSeason)
  ) {
    return requestedSeason;
  }

  return (
    seasons.find((season) => season.isCurrent)?.year ?? seasons[0]?.year ?? null
  );
}

export function findLeagueSeason(
  seasons: Season[],
  seasonYear: number | null
): Season | null {
  if (seasonYear == null) {
    return null;
  }

  return seasons.find((season) => season.year === seasonYear) ?? null;
}
