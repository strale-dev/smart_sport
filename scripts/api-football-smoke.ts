import {
  getFixtureById,
  listFixturesByDate,
} from "@/lib/api-football/endpoints";
import { ApiFootballError } from "@/lib/api-football/errors";
import { getInMemoryQuotaSnapshot } from "@/lib/api-football/quota";
import { getApiFootballDailyLimit, hasApiFootballConfig } from "@/lib/env";

function explainProviderAuthFailure(error: unknown): void {
  if (!(error instanceof ApiFootballError)) {
    return;
  }

  const tokenError = error.providerErrors?.token;
  if (!tokenError) {
    return;
  }

  console.error(
    "\nAPI-Football rejected API_FOOTBALL_KEY from .env.local.\n" +
      "Verify the key at https://dashboard.api-football.com/ and ensure it is active.\n" +
      `Provider message: ${tokenError}`
  );
}

async function main() {
  if (!hasApiFootballConfig(process.env)) {
    console.error(
      "Missing API_FOOTBALL_KEY. Add it to .env.local before running the smoke test."
    );
    process.exit(1);
  }

  console.log(`API-Football daily limit: ${getApiFootballDailyLimit()}`);

  const today = new Date().toISOString().slice(0, 10);
  console.log(`Running API-Football smoke test for ${today}...`);

  const fixtures = await listFixturesByDate(today);
  console.log(`Fixtures today: ${fixtures.length}`);

  if (fixtures.length > 0) {
    const firstFixture = fixtures[0]!;
    const fixture = await getFixtureById(firstFixture.externalId);
    console.log(
      `Sample fixture: ${fixture?.homeTeam.name} vs ${fixture?.awayTeam.name} (${fixture?.status})`
    );
  } else {
    console.log("No fixtures today — skipping getFixtureById sample.");
  }

  const quota = getInMemoryQuotaSnapshot();
  console.log("Quota snapshot:", quota);
  console.log("API-Football smoke test passed.");
}

main().catch((error) => {
  explainProviderAuthFailure(error);
  console.error("API-Football smoke test failed:", error);
  process.exit(1);
});
