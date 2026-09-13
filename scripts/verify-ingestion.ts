/**
 * Phase 1 narrow gate (UTC fixtures today). For full DB/API report use:
 * npm.cmd run diagnose:ingestion
 */
import { createAdminClient } from "@/lib/supabase/admin";

async function main() {
  const client = createAdminClient();

  const [
    { count: leagues },
    { count: seasons },
    { count: fixtures },
    { count: standings },
  ] = await Promise.all([
    client.from("leagues").select("*", { count: "exact", head: true }),
    client.from("seasons").select("*", { count: "exact", head: true }),
    client.from("fixtures").select("*", { count: "exact", head: true }),
    client.from("standings").select("*", { count: "exact", head: true }),
  ]);

  console.log("DB counts:", { leagues, seasons, fixtures, standings });

  const today = new Date().toISOString().slice(0, 10);
  const dayEnd = new Date(`${today}T00:00:00.000Z`);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const { count: fixturesToday } = await client
    .from("fixtures")
    .select("*", { count: "exact", head: true })
    .gte("kickoff_at", `${today}T00:00:00.000Z`)
    .lt("kickoff_at", dayEnd.toISOString());

  console.log("Fixtures today (UTC):", fixturesToday);

  const { count: matchDetailsCount } = await client
    .from("fixture_events")
    .select("*", { count: "exact", head: true });

  console.log("Fixture events rows:", matchDetailsCount);

  if ((fixturesToday ?? 0) <= 0) {
    console.error(
      "Phase 1 DoD requires fixtures for UTC today. Run sync-fixtures first."
    );
    process.exit(1);
  }

  const { data: currentSeasons } = await client
    .from("seasons")
    .select("year, leagues!inner(provider_id, name)")
    .eq("is_current", true)
    .limit(3);

  console.log("Sample current seasons:", currentSeasons);
  console.log("verify:ingestion passed.");
}

main().catch((error) => {
  console.error("verify:ingestion failed:", error);
  process.exit(1);
});
