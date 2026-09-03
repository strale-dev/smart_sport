import type { Fixture } from "@/types/domain";

export function mergeTeamFixtures(
  homeFixtures: Fixture[],
  awayFixtures: Fixture[],
  options?: { excludeFixtureId?: number }
): Fixture[] {
  const byId = new Map<number, Fixture>();

  for (const fixture of [...homeFixtures, ...awayFixtures]) {
    if (options?.excludeFixtureId === fixture.externalId) {
      continue;
    }

    byId.set(fixture.externalId, fixture);
  }

  return [...byId.values()].sort(
    (left, right) =>
      new Date(left.kickoffAt).getTime() - new Date(right.kickoffAt).getTime()
  );
}
