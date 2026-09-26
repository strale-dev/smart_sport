import type { Fixture } from "@/types/domain";

export function collectSeasonYearsFromFixtures(fixtures: Fixture[]): number[] {
  const years = new Set<number>();
  for (const fixture of fixtures) {
    if (fixture.seasonYear != null) {
      years.add(fixture.seasonYear);
    }
  }
  return [...years].sort((left, right) => right - left);
}

export function collectLeagueOptionsFromFixtures(
  fixtures: Fixture[]
): Array<{ providerId: number; name: string }> {
  const byId = new Map<number, string>();
  for (const fixture of fixtures) {
    byId.set(fixture.league.externalId, fixture.league.name);
  }

  return [...byId.entries()]
    .map(([providerId, name]) => ({ providerId, name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
