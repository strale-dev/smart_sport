import { competitionSupportsStandings } from "@/lib/competitions/capabilities";
import { findCompetition } from "@/lib/competitions/index";
import type {
  CompetitionCategory,
  CompetitionTier,
} from "@/lib/competitions/types";
import type { TeamRef } from "@/types/domain";

export type MatchFixtureContextInput = {
  leagueExternalId: number;
  homeTeam: Pick<TeamRef, "isNational">;
  awayTeam: Pick<TeamRef, "isNational">;
};

export type MatchFixtureContext = {
  category: CompetitionCategory | null;
  tier: CompetitionTier | null;
  isInternational: boolean;
  supportsStandings: boolean;
  teamNoun: "team" | "club";
  teamNounPlural: "teams" | "clubs";
  h2hSameCompLabel: "Same competition" | "Same league";
};

/** Manual QA sample sizes for Phase G national-team smoke (see scripts/phase-g-national-smoke.ts). */
export const PHASE_G_SMOKE_FIXTURE_QUOTAS = [
  { leagueProviderId: 10, label: "Friendlies", limit: 10 },
  { leagueProviderId: 5, label: "UEFA Nations League", limit: 5 },
  {
    leagueProviderId: 32,
    label: "World Cup - Qualification Europe",
    limit: 1,
  },
] as const;

export function resolveMatchFixtureContext(
  input: MatchFixtureContextInput
): MatchFixtureContext {
  const competition = findCompetition(input.leagueExternalId);
  const category = competition?.category ?? null;
  const tier = competition?.tier ?? null;

  const isInternational =
    category === "national_team" ||
    input.homeTeam.isNational ||
    input.awayTeam.isNational;

  const supportsStandings = competitionSupportsStandings(competition);

  return {
    category,
    tier,
    isInternational,
    supportsStandings,
    teamNoun: isInternational ? "team" : "club",
    teamNounPlural: isInternational ? "teams" : "clubs",
    h2hSameCompLabel: isInternational ? "Same competition" : "Same league",
  };
}

export function standingsUnavailableCopy(
  leagueName: string,
  ctx: MatchFixtureContext
): { title: string; description: string } {
  if (!ctx.supportsStandings) {
    return {
      title: "Standings not available for this competition",
      description: `${leagueName} does not include a table we track in Scorence. Recent form and head-to-head are on the Matches tab.`,
    };
  }

  return {
    title: "Standings not available yet",
    description: `We do not have a standings table for ${leagueName} right now. Check the competition page or try again later.`,
  };
}
