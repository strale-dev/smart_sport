import { getCompetitionRegistry } from "@/lib/competitions/index";
import { resolveTargetPrestigeScore } from "@/lib/competitions/prestige";
import { createAdminClient } from "@/lib/supabase/admin";

export type SyncLeaguePrestigeResult = {
  ok: boolean;
  enabledCompetitions: number;
  leaguesInDb: number;
  updated: number;
  unchanged: number;
  skippedMissingLeague: number;
};

export async function syncLeaguePrestigeFromRegistry(): Promise<SyncLeaguePrestigeResult> {
  const client = createAdminClient();
  const competitions = getCompetitionRegistry();
  const providerIds = competitions.map((item) => item.providerId);

  const { data: leagues, error } = await client
    .from("leagues")
    .select("provider_id, prestige_score")
    .in("provider_id", providerIds);

  if (error) {
    throw new Error(
      `Failed to read leagues for prestige sync: ${error.message}`
    );
  }

  const byProviderId = new Map(
    (leagues ?? []).map((row) => [row.provider_id, row.prestige_score])
  );

  let updated = 0;
  let unchanged = 0;
  let skippedMissingLeague = 0;

  for (const competition of competitions) {
    if (!byProviderId.has(competition.providerId)) {
      skippedMissingLeague += 1;
      continue;
    }

    const existingScore = byProviderId.get(competition.providerId);
    const target = resolveTargetPrestigeScore({
      providerId: competition.providerId,
      tier: competition.tier,
      existingScore,
    });

    if (Number(existingScore ?? 0) === target) {
      unchanged += 1;
      continue;
    }

    const { error: updateError } = await client
      .from("leagues")
      .update({ prestige_score: target })
      .eq("provider_id", competition.providerId);

    if (updateError) {
      throw new Error(
        `Failed to update prestige for provider ${competition.providerId}: ${updateError.message}`
      );
    }

    updated += 1;
  }

  return {
    ok: true,
    enabledCompetitions: competitions.length,
    leaguesInDb: leagues?.length ?? 0,
    updated,
    unchanged,
    skippedMissingLeague,
  };
}

async function main() {
  console.log("Syncing league prestige from competition registry...");
  const result = await syncLeaguePrestigeFromRegistry();
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("sync-league-prestige-from-registry failed:", error);
  process.exit(1);
});
