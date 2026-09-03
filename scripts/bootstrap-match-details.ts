import { ingestMatchDetailsFromProvider } from "@/lib/ingestion/ingest-match-details";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasApiFootballConfig } from "@/lib/env";

function parseArgs(argv: string[]) {
  const fixtureIdsArg = argv.find((arg) => arg.startsWith("--fixture-ids="));
  const lastFtDaysArg = argv.find((arg) => arg.startsWith("--last-ft-days="));
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));

  const fixtureIds = fixtureIdsArg
    ? fixtureIdsArg
        .slice("--fixture-ids=".length)
        .split(",")
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value))
    : [];

  const lastFtDays = lastFtDaysArg
    ? Number.parseInt(lastFtDaysArg.slice("--last-ft-days=".length), 10)
    : 7;

  const limit = limitArg
    ? Number.parseInt(limitArg.slice("--limit=".length), 10)
    : 5;

  return { fixtureIds, lastFtDays, limit };
}

async function resolveFixtureIds(
  fixtureIds: number[],
  lastFtDays: number,
  limit: number
): Promise<number[]> {
  if (fixtureIds.length > 0) {
    return fixtureIds.slice(0, limit);
  }

  const client = createAdminClient();
  const cutoff = new Date(Date.now() - lastFtDays * 86_400_000).toISOString();

  const { data, error } = await client
    .from("fixtures")
    .select("provider_id")
    .in("status", ["FT", "AET", "PEN"])
    .gte("kickoff_at", cutoff)
    .order("kickoff_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to resolve fixtures: ${error.message}`);
  }

  return (data ?? []).map((row) => row.provider_id);
}

async function main() {
  if (!hasApiFootballConfig(process.env)) {
    console.error(
      "Missing API_FOOTBALL_KEY. Add it to .env.local before bootstrap."
    );
    process.exit(1);
  }

  const { fixtureIds, lastFtDays, limit } = parseArgs(process.argv.slice(2));
  const targets = await resolveFixtureIds(fixtureIds, lastFtDays, limit);

  if (targets.length === 0) {
    console.error(
      "No fixtures to bootstrap. Pass --fixture-ids=... or sync fixtures first."
    );
    process.exit(1);
  }

  console.log(
    `Bootstrapping match details for ${targets.length} fixture(s)...`
  );

  const results = [];

  for (const fixtureProviderId of targets) {
    const result = await ingestMatchDetailsFromProvider(fixtureProviderId);
    results.push(result);
    console.log(JSON.stringify(result, null, 2));
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("bootstrap-match-details failed:", error);
  process.exit(1);
});
