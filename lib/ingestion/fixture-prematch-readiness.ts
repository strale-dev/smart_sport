import { hasMinimumModelSignal } from "@/lib/ai/prematch-availability";
import { buildPrematchFeatures } from "@/lib/models/features";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase";

export type PrematchReadinessSnapshot = {
  aiEligible: boolean;
  hasMinimumModelSignal: boolean;
  reasons: string[];
  evaluatedAt: string;
};

function buildReadinessFromFeatures(
  features: Awaited<ReturnType<typeof buildPrematchFeatures>>
): PrematchReadinessSnapshot {
  const evaluatedAt = new Date().toISOString();
  if (!features) {
    return {
      aiEligible: false,
      hasMinimumModelSignal: false,
      reasons: ["features_unavailable"],
      evaluatedAt,
    };
  }

  const hasSignal = hasMinimumModelSignal(features);
  const reasons: string[] = [];
  if (!hasSignal) {
    if (features.form5HomePpg == null || features.form5AwayPpg == null) {
      reasons.push("incomplete_form_both_teams");
    }
    if (
      features.homeLeagueRank == null &&
      features.awayLeagueRank == null &&
      Math.abs(features.eloDiff) < 8
    ) {
      reasons.push("missing_standings_and_elo_signal");
    }
  }

  return {
    aiEligible: hasSignal,
    hasMinimumModelSignal: hasSignal,
    reasons,
    evaluatedAt,
  };
}

export async function evaluatePrematchReadiness(
  fixtureExternalId: number
): Promise<PrematchReadinessSnapshot> {
  const features = await buildPrematchFeatures(fixtureExternalId, {
    fixtureExternalId,
  });
  return buildReadinessFromFeatures(features);
}

export async function persistPrematchReadiness(
  fixtureUuid: string,
  snapshot: PrematchReadinessSnapshot
): Promise<void> {
  const client = createAdminClient();
  const { error } = await client
    .from("fixtures")
    .update({
      prematch_readiness: snapshot as unknown as Json,
      prematch_readiness_updated_at: snapshot.evaluatedAt,
    })
    .eq("id", fixtureUuid);

  if (error) {
    throw new Error(`Failed to persist prematch readiness: ${error.message}`);
  }
}

export async function refreshPrematchReadinessForProviderFixture(
  fixtureExternalId: number
): Promise<PrematchReadinessSnapshot | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("fixtures")
    .select("id")
    .eq("provider_id", fixtureExternalId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to resolve fixture ${fixtureExternalId}: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  const snapshot = await evaluatePrematchReadiness(fixtureExternalId);
  await persistPrematchReadiness(data.id, snapshot);
  return snapshot;
}

export async function refreshPrematchReadinessBatch(
  fixtureExternalIds: readonly number[]
): Promise<number> {
  let updated = 0;
  for (const fixtureExternalId of fixtureExternalIds) {
    try {
      const result =
        await refreshPrematchReadinessForProviderFixture(fixtureExternalId);
      if (result) {
        updated += 1;
      }
    } catch (error) {
      console.error(
        `[fixture-prematch-readiness] fixture ${fixtureExternalId}`,
        error
      );
    }
  }
  return updated;
}
