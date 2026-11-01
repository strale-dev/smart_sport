import { computeContextHash } from "@/lib/ai/hash";
import type { PrematchFeatureVector } from "@/types/prediction";

/** Fields that affect prematch model output — used to invalidate stale DB rows. */
export function prematchFeatureFingerprintPayload(
  features: PrematchFeatureVector
): Record<string, unknown> {
  return {
    fixtureExternalId: features.fixtureExternalId,
    homeTeamProviderId: features.homeTeamProviderId,
    awayTeamProviderId: features.awayTeamProviderId,
    leagueProviderId: features.leagueProviderId,
    asOf: features.asOf,
    eloHome: features.eloHome,
    eloAway: features.eloAway,
    form5HomePpg: features.form5HomePpg,
    form5AwayPpg: features.form5AwayPpg,
    form10HomePpg: features.form10HomePpg,
    form10AwayPpg: features.form10AwayPpg,
    h2hHomeWinRate: features.h2hHomeWinRate,
    homeLeagueRank: features.homeLeagueRank,
    awayLeagueRank: features.awayLeagueRank,
    standingPointsDiff: features.standingPointsDiff,
    homeRestDays: features.homeRestDays,
    awayRestDays: features.awayRestDays,
    homeGoalsForAvg: features.homeGoalsForAvg,
    awayGoalsForAvg: features.awayGoalsForAvg,
    homeXgForAvg: features.homeXgForAvg,
    awayXgForAvg: features.awayXgForAvg,
    homeInjuryImpact: features.homeInjuryImpact,
    awayInjuryImpact: features.awayInjuryImpact,
    homeTopScorersSidelined: features.homeTopScorersSidelined,
    awayTopScorersSidelined: features.awayTopScorersSidelined,
    lineupsState: features.lineupsState,
    hasXg: features.hasXg,
  };
}

export function computePrematchFeatureFingerprint(
  features: PrematchFeatureVector
): string {
  return computeContextHash(prematchFeatureFingerprintPayload(features));
}
