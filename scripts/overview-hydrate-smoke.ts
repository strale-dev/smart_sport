import { readFixtureByProviderIdFromDb } from "@/lib/ingestion/db-read";
import { hydrateMatchOverviewFromProvider } from "@/lib/ingestion/ensure-match-overview";
import { computeH2H } from "@/lib/services/analyticsService";
import {
  readFixtureEventsFromDb,
  readFixtureStatisticsFromDb,
} from "@/lib/ingestion/db-read";

const fixtureId = Number(process.argv[2]);

async function main() {
  if (!Number.isFinite(fixtureId) || fixtureId <= 0) {
    console.error(
      "Usage: tsx scripts/overview-hydrate-smoke.ts <fixtureProviderId>"
    );
    process.exit(1);
  }

  const fixture = await readFixtureByProviderIdFromDb(fixtureId);
  if (!fixture) {
    console.error(
      `Fixture ${fixtureId} not found in DB (run match page once or sync fixtures).`
    );
    process.exit(1);
  }

  console.log(
    `Hydrating ${fixture.homeTeam.name} vs ${fixture.awayTeam.name} (${fixture.status})…`
  );
  await hydrateMatchOverviewFromProvider(fixture);

  const [events, stats, h2h] = await Promise.all([
    readFixtureEventsFromDb(fixtureId),
    readFixtureStatisticsFromDb(fixtureId),
    computeH2H(fixture.homeTeam.externalId, fixture.awayTeam.externalId, {
      windowSize: 10,
      scope: "ALL",
    }),
  ]);

  console.log({
    events: events.length,
    stats: stats.length,
    h2hMeetings: h2h.meetings.length,
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
