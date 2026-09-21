import { isApiFootballIngestOnly } from "@/lib/env";
import {
  PHASE_G_SMOKE_FIXTURE_QUOTAS,
  resolveMatchFixtureContext,
} from "@/lib/match/fixture-context";
import { createAdminClient } from "@/lib/supabase/admin";

type SmokeFixtureRow = {
  provider_id: number;
  status: string;
  league_provider_id: number;
  home_is_national: boolean;
  away_is_national: boolean;
};

async function loadFixturesForLeague(
  leagueProviderId: number,
  limit: number
): Promise<SmokeFixtureRow[]> {
  const client = createAdminClient();

  const { data: leagueRow, error: leagueError } = await client
    .from("leagues")
    .select("id")
    .eq("provider_id", leagueProviderId)
    .maybeSingle();

  if (leagueError) {
    throw new Error(
      `Failed to resolve league ${leagueProviderId}: ${leagueError.message}`
    );
  }

  if (!leagueRow) {
    return [];
  }

  const { data, error } = await client
    .from("fixtures")
    .select(
      `
      provider_id,
      status,
      home:teams!fixtures_home_team_id_fkey(is_national),
      away:teams!fixtures_away_team_id_fkey(is_national)
    `
    )
    .eq("league_id", leagueRow.id)
    .order("kickoff_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(
      `Failed to load fixtures for league ${leagueProviderId}: ${error.message}`
    );
  }

  return (data ?? []).map((row) => {
    const home = row.home as { is_national: boolean } | null;
    const away = row.away as { is_national: boolean } | null;

    return {
      provider_id: row.provider_id,
      status: row.status,
      league_provider_id: leagueProviderId,
      home_is_national: home?.is_national ?? false,
      away_is_national: away?.is_national ?? false,
    };
  });
}

async function main() {
  if (!isApiFootballIngestOnly()) {
    console.error(
      "Phase G national smoke requires API_FOOTBALL_INGEST_ONLY=true."
    );
    process.exit(1);
  }

  const report: Array<{
    label: string;
    leagueProviderId: number;
    expected: number;
    found: number;
    sample: Array<{
      fixtureId: number;
      status: string;
      context: ReturnType<typeof resolveMatchFixtureContext>;
    }>;
  }> = [];

  let missingTotal = 0;

  for (const bucket of PHASE_G_SMOKE_FIXTURE_QUOTAS) {
    const fixtures = await loadFixturesForLeague(
      bucket.leagueProviderId,
      bucket.limit
    );

    if (fixtures.length < bucket.limit) {
      missingTotal += bucket.limit - fixtures.length;
    }

    const sample = fixtures.map((fixture) => {
      const context = resolveMatchFixtureContext({
        leagueExternalId: fixture.league_provider_id,
        homeTeam: { isNational: fixture.home_is_national },
        awayTeam: { isNational: fixture.away_is_national },
      });

      if (context.category !== "national_team") {
        throw new Error(
          `Fixture ${fixture.provider_id} expected national_team category, got ${String(context.category)}`
        );
      }

      return {
        fixtureId: fixture.provider_id,
        status: fixture.status,
        context,
      };
    });

    report.push({
      label: bucket.label,
      leagueProviderId: bucket.leagueProviderId,
      expected: bucket.limit,
      found: fixtures.length,
      sample,
    });
  }

  if (missingTotal > 0) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          missingTotal,
          report,
          hint: "Run sync:fixtures for World / national_team leagues, then re-run smoke.",
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        quotas: PHASE_G_SMOKE_FIXTURE_QUOTAS,
        report,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("phase-g:national-smoke failed:", error);
  process.exit(1);
});
