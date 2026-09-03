import { isFinishedFixtureStatus } from "@/lib/fixtures/display";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import type { Fixture } from "@/types/domain";

export type TeamFixtureGroups = {
  live: Fixture[];
  upcoming: Fixture[];
  past: Fixture[];
};

/** Split kickoff-ascending fixtures into Live / Upcoming / Past. */
export function splitFixturesByStatus(fixtures: Fixture[]): TeamFixtureGroups {
  const live: Fixture[] = [];
  const upcoming: Fixture[] = [];
  const past: Fixture[] = [];

  for (const fixture of fixtures) {
    if (isLiveFixtureStatus(fixture.status)) {
      live.push(fixture);
    } else if (isFinishedFixtureStatus(fixture.status)) {
      past.push(fixture);
    } else {
      upcoming.push(fixture);
    }
  }

  past.reverse();

  return { live, upcoming, past };
}
