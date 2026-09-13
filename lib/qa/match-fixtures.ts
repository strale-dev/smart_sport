import { PINNED_MATCH_QA_FIXTURES } from "@/lib/qa/pinned-fixture-ids";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FixtureStatus } from "@/types/domain";

export { PINNED_MATCH_QA_FIXTURES };

export type FixtureCandidate = {
  provider_id: number;
  status: string;
  stat_rows: number;
  event_rows: number;
  lineup_rows: number;
};

const CANDIDATE_STATUSES: FixtureStatus[] = [
  "FT",
  "NS",
  "2H",
  "1H",
  "HT",
  "LIVE",
];

export async function loadFixtureCandidates(
  limit = 50
): Promise<FixtureCandidate[]> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("fixtures")
    .select("provider_id, status")
    .in("status", CANDIDATE_STATUSES)
    .order("kickoff_at", { ascending: false })
    .limit(limit);

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

export function findRichFtFixture(
  candidates: FixtureCandidate[]
): FixtureCandidate | undefined {
  return candidates.find(
    (fixture) =>
      fixture.status === "FT" && fixture.stat_rows > 0 && fixture.event_rows > 0
  );
}

export function findFtWithStatsFixture(
  candidates: FixtureCandidate[]
): FixtureCandidate | undefined {
  return candidates.find(
    (fixture) => fixture.status === "FT" && fixture.stat_rows > 0
  );
}

/** Live fixture with ingested stats (required for UI-B3 smoke). */
export function findLiveFixtureWithData(
  candidates: FixtureCandidate[]
): FixtureCandidate | undefined {
  return candidates.find(
    (fixture) =>
      isLiveFixtureStatus(fixture.status as FixtureStatus) &&
      fixture.stat_rows > 0
  );
}
