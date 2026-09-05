import { isApiFootballIngestOnly } from "@/lib/env";
import { getH2H, getRecentForm } from "@/lib/services/analyticsService";
import {
  getFixtureById,
  getFixtureEvents,
  getFixtureLineups,
  getFixtureStatistics,
} from "@/lib/services/footballService";
import { createAdminClient } from "@/lib/supabase/admin";

type FixtureCandidate = {
  provider_id: number;
  status: string;
  stat_rows: number;
  event_rows: number;
  lineup_rows: number;
};

async function loadFixtureCandidates(): Promise<FixtureCandidate[]> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("fixtures")
    .select("provider_id, status")
    .in("status", ["FT", "NS", "2H", "1H", "HT", "LIVE"])
    .order("kickoff_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to load fixtures: ${error.message}`);
  }

  const candidates: FixtureCandidate[] = [];

  for (const row of data ?? []) {
    const { data: fixtureRow, error: fixtureError } = await client
      .from("fixtures")
      .select("id")
      .eq("provider_id", row.provider_id)
      .maybeSingle();

    if (fixtureError || !fixtureRow) {
      continue;
    }

    const [stats, events, lineups] = await Promise.all([
      client
        .from("fixture_statistics")
        .select("id", { count: "exact", head: true })
        .eq("fixture_id", fixtureRow.id),
      client
        .from("fixture_events")
        .select("id", { count: "exact", head: true })
        .eq("fixture_id", fixtureRow.id),
      client
        .from("lineups")
        .select("id", { count: "exact", head: true })
        .eq("fixture_id", fixtureRow.id),
    ]);

    candidates.push({
      provider_id: row.provider_id,
      status: row.status,
      stat_rows: stats.count ?? 0,
      event_rows: events.count ?? 0,
      lineup_rows: lineups.count ?? 0,
    });
  }

  return candidates;
}

async function main() {
  if (!isApiFootballIngestOnly()) {
    console.error(
      "Phase 3 match DoD requires API_FOOTBALL_INGEST_ONLY=true so UI reads Postgres."
    );
    process.exit(1);
  }

  const candidates = await loadFixtureCandidates();
  const richFt = candidates.find(
    (fixture) =>
      fixture.status === "FT" && fixture.stat_rows > 0 && fixture.event_rows > 0
  );
  const ftWithStats = candidates.find(
    (fixture) => fixture.status === "FT" && fixture.stat_rows > 0
  );
  const upcoming = candidates.find((fixture) => fixture.status === "NS");
  const target = richFt ?? ftWithStats ?? upcoming ?? candidates[0];

  if (!target) {
    console.error(
      "No fixtures in Postgres. Run npm.cmd run sync:fixtures and bootstrap:match-details first."
    );
    process.exit(1);
  }

  const fixtureId = target.provider_id;
  console.log("Fixture candidate:", target);

  const { data: fixture } = await getFixtureById(fixtureId);
  if (!fixture) {
    console.error(`getFixtureById(${fixtureId}) returned no fixture.`);
    process.exit(1);
  }

  const [statsResult, eventsResult, lineupsResult, homeForm, awayForm, h2hAll] =
    await Promise.all([
      getFixtureStatistics(fixtureId),
      getFixtureEvents(fixtureId),
      getFixtureLineups(fixtureId),
      getRecentForm(fixture.homeTeam.externalId, { matches: 10, scope: "ALL" }),
      getRecentForm(fixture.awayTeam.externalId, { matches: 10, scope: "ALL" }),
      getH2H(fixture.homeTeam.externalId, fixture.awayTeam.externalId, {
        windowSize: 10,
        scope: "ALL",
      }),
    ]);

  console.log("Match data paths:", {
    fixtureId,
    status: fixture.status,
    stats: statsResult.data.length,
    events: eventsResult.data.length,
    lineups: lineupsResult.data.length,
    homeFormResults: homeForm.results.length,
    awayFormResults: awayForm.results.length,
    h2hMeetings: h2hAll.meetings.length,
  });

  if (target.status === "FT" && target.stat_rows === 0) {
    console.warn(
      "No FT fixtures with ingested stats yet. Run: npm.cmd run bootstrap:match-details -- --last-ft-days=14 --limit=8"
    );
  }

  const client = createAdminClient();
  const { count: standingsCount, error: standingsError } = await client
    .from("standings")
    .select("id", { count: "exact", head: true });

  if (standingsError) {
    throw new Error(`Failed to count standings: ${standingsError.message}`);
  }

  if ((standingsCount ?? 0) === 0) {
    console.warn(
      "Standings table is empty. Free API plan may block current-season standings; match/league standings tabs will show empty states."
    );
  }

  console.log("\nManual QA URLs:");
  console.log(`  FT/rich match:  /matches/${fixtureId}`);
  console.log(`  Upcoming match: /matches/1552754`);
  console.log("  League page:    /leagues/39?tab=overview");
  console.log(
    `  Team page:      /teams/${fixture.homeTeam.externalId}?tab=details`
  );

  console.log("\nphase3:match-smoke passed.");
}

main().catch((error) => {
  console.error("phase3:match-smoke failed:", error);
  process.exit(1);
});
