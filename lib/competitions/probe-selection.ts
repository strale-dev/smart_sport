import type { CompetitionDefinition } from "@/lib/competitions/types";

export type CapabilityProbeSelectionOptions = {
  tier2SampleSize?: number;
  tier3SampleSize?: number;
};

const DEFAULT_TIER2_SAMPLE = 12;
const DEFAULT_TIER3_SAMPLE = 6;

function sampleByProviderId(
  items: CompetitionDefinition[],
  limit: number
): CompetitionDefinition[] {
  if (limit <= 0 || items.length === 0) {
    return [];
  }

  return [...items]
    .sort((left, right) => left.providerId - right.providerId)
    .slice(0, Math.min(limit, items.length));
}

/**
 * Tier 1 + all national_team + a deterministic sample of Tier 2/3 (excluding duplicates).
 */
export function selectCompetitionsForCapabilityProbe(
  competitions: readonly CompetitionDefinition[],
  options: CapabilityProbeSelectionOptions = {}
): CompetitionDefinition[] {
  const tier2SampleSize = options.tier2SampleSize ?? DEFAULT_TIER2_SAMPLE;
  const tier3SampleSize = options.tier3SampleSize ?? DEFAULT_TIER3_SAMPLE;

  const enabled = competitions.filter((item) => item.enabled);
  const seen = new Set<number>();
  const selected: CompetitionDefinition[] = [];

  const push = (item: CompetitionDefinition) => {
    if (seen.has(item.providerId)) {
      return;
    }
    seen.add(item.providerId);
    selected.push(item);
  };

  for (const item of enabled) {
    if (item.tier === 1) {
      push(item);
    }
  }

  for (const item of enabled) {
    if (item.category === "national_team") {
      push(item);
    }
  }

  const tier2Remaining = enabled.filter(
    (item) => item.tier === 2 && !seen.has(item.providerId)
  );
  for (const item of sampleByProviderId(tier2Remaining, tier2SampleSize)) {
    push(item);
  }

  const tier3Remaining = enabled.filter(
    (item) => item.tier === 3 && !seen.has(item.providerId)
  );
  for (const item of sampleByProviderId(tier3Remaining, tier3SampleSize)) {
    push(item);
  }

  return selected.sort((left, right) => {
    if (left.tier !== right.tier) {
      return left.tier - right.tier;
    }
    return left.providerId - right.providerId;
  });
}
