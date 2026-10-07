/**
 * @deprecated Use `@/lib/fixtures/readiness` — kept for import stability during migration.
 */
import { hasMinimumModelSignal } from "@/lib/ai/prematch-availability";
import { buildPrematchFeatures } from "@/lib/models/features";
import {
  evaluateAndPersistFixtureReadiness,
  refreshReadinessBatch,
} from "@/lib/fixtures/readiness";

export type PrematchReadinessSnapshot = {
  aiEligible: boolean;
  hasMinimumModelSignal: boolean;
  reasons: string[];
  evaluatedAt: string;
};

export function buildReadinessFromFeatures(
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

export async function refreshPrematchReadinessForProviderFixture(
  fixtureExternalId: number
): Promise<PrematchReadinessSnapshot | null> {
  const snapshot = await evaluateAndPersistFixtureReadiness({
    providerId: fixtureExternalId,
  });
  if (!snapshot) {
    return null;
  }
  return buildReadinessFromFeatures(
    await buildPrematchFeatures(fixtureExternalId, {
      fixtureExternalId,
    })
  );
}

export async function refreshPrematchReadinessBatch(
  fixtureExternalIds: readonly number[]
): Promise<number> {
  return refreshReadinessBatch(fixtureExternalIds);
}
