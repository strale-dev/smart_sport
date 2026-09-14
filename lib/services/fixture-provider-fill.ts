import { listFixturesByDate as listFixturesByDateEndpoint } from "@/lib/api-football/endpoints/fixtures";
import { safeOptionalProviderFetch } from "@/lib/api-football/safe-call";
import { filterAllowlistedFixtures } from "@/lib/fixtures/navigable";
import { addUtcDays } from "@/lib/fixtures/window";
import type { Fixture } from "@/types/domain";

function utcDatesInRange(fromDate: string, toDateExclusive: string): string[] {
  const dates: string[] = [];
  let cursor = fromDate;

  while (cursor < toDateExclusive) {
    dates.push(cursor);
    cursor = addUtcDays(cursor, 1);
  }

  return dates;
}

export async function fillFixturesForUtcDateFromProvider(
  date: string
): Promise<Fixture[]> {
  const fixtures = await safeOptionalProviderFetch(
    `fixtures date ${date}`,
    () => listFixturesByDateEndpoint(date),
    []
  );

  return filterAllowlistedFixtures(fixtures);
}

export async function fillFixturesForUtcDateRangeFromProvider(
  fromDate: string,
  toDateExclusive: string
): Promise<Fixture[]> {
  const dates = utcDatesInRange(fromDate, toDateExclusive);
  const batches = await Promise.all(
    dates.map((date) => fillFixturesForUtcDateFromProvider(date))
  );

  const seen = new Set<number>();
  const merged: Fixture[] = [];

  for (const batch of batches) {
    for (const fixture of batch) {
      if (seen.has(fixture.externalId)) {
        continue;
      }

      seen.add(fixture.externalId);
      merged.push(fixture);
    }
  }

  return merged.sort(
    (left, right) =>
      new Date(left.kickoffAt).getTime() - new Date(right.kickoffAt).getTime()
  );
}
