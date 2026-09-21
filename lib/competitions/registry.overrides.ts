import type {
  CompetitionCategory,
  CompetitionTier,
} from "@/lib/competitions/types";

export type CompetitionOverride = {
  providerId: number;
  enabled?: boolean;
  tier?: CompetitionTier;
  category?: CompetitionCategory;
  capabilities?: Partial<
    import("@/lib/competitions/types").CompetitionCapabilities
  >;
};

/** Manual tweaks only — IDs must exist in API `/leagues` output. */
export const COMPETITION_OVERRIDES: CompetitionOverride[] = [
  {
    providerId: 10,
    category: "national_team",
    capabilities: { standings: false },
  },
  {
    providerId: 32,
    category: "national_team",
    capabilities: { standings: false },
  },
  {
    providerId: 34,
    category: "national_team",
    capabilities: { standings: false },
  },
  {
    providerId: 29,
    category: "national_team",
    capabilities: { standings: false },
  },
  {
    providerId: 30,
    category: "national_team",
    capabilities: { standings: false },
  },
  {
    providerId: 31,
    category: "national_team",
    capabilities: { standings: false },
  },
  {
    providerId: 33,
    category: "national_team",
    capabilities: { standings: false },
  },
];
