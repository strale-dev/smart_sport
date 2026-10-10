import type { FormScope } from "@/types/domain";
import type { TeamHistoryCompleteness } from "@/lib/analytics/team-history-query";

export type MetricAvailability = {
  status: "available" | "unavailable";
  value: number | null;
  sampleSize: number;
  reason?: string;
};

export type HistoryWindowKey = 5 | 10 | 20 | 30 | "30plus";

export type TeamHistoryScope = FormScope;

export const HISTORY_WINDOW_LIMITS: Record<HistoryWindowKey, number> = {
  5: 5,
  10: 10,
  20: 20,
  30: 30,
  "30plus": 100,
};

export type WindowOutcomeMetrics = {
  window: HistoryWindowKey;
  scope: TeamHistoryScope;
  played: number;
  requested: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: MetricAvailability;
  ppg: MetricAvailability;
  goalsFor: MetricAvailability;
  goalsAgainst: MetricAvailability;
  goalDifference: MetricAvailability;
  cleanSheets: MetricAvailability;
  failedToScore: MetricAvailability;
  bttsRate: MetricAvailability;
  over25Rate: MetricAvailability;
  under25Rate: MetricAvailability;
  xgForAvg: MetricAvailability;
  xgAgainstAvg: MetricAvailability;
  recencyWeightedPpg: MetricAvailability;
  recencyWeightedGoalsFor: MetricAvailability;
  recencyWeightedGoalsAgainst: MetricAvailability;
  opponentStrengthElo: MetricAvailability;
  scheduleDifficultyElo: MetricAvailability;
};

export type PeriodCompareMetrics = {
  recentWindow: 5 | 10;
  recentPpg: MetricAvailability;
  previousPpg: MetricAvailability;
  recentGoalsForPerGame: MetricAvailability;
  previousGoalsForPerGame: MetricAvailability;
  recentGoalsAgainstPerGame: MetricAvailability;
  previousGoalsAgainstPerGame: MetricAvailability;
};

export type RecentMatchExample = {
  fixtureExternalId: number;
  kickoffAt: string;
  opponentName: string;
  isHome: boolean;
  goalsFor: number;
  goalsAgainst: number;
  result: "W" | "D" | "L";
  leagueName: string | null;
};

export type TeamHistoryFeatures = {
  teamProviderId: number;
  beforeAt: string;
  restDays: number | null;
  completenessByScope: TeamHistoryCompleteness[];
  windows: Partial<
    Record<
      TeamHistoryScope,
      Partial<Record<HistoryWindowKey, WindowOutcomeMetrics>>
    >
  >;
  periodCompare: PeriodCompareMetrics[];
  recentExamples: RecentMatchExample[];
  formSummaryLast5: string | null;
};

export type FixtureH2HFeatures = {
  beforeAt: string;
  homeTeamProviderId: number;
  awayTeamProviderId: number;
  scope: "ALL" | "SAME_COMP";
  meetingsTotal: number;
  meetingsInWindow: number;
  /** Recency-normalized so effective influence ≤ H2H_EFFECTIVE_MEETING_CAP */
  effectiveMeetingWeight: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  recencyWeightedHomeWinRate: MetricAvailability;
  recencyWeightedAvgGoals: MetricAvailability;
  avgGoalsSimple: MetricAvailability;
  venueHomeWinRateAtHome: MetricAvailability;
  dataState: "available" | "unavailable";
};

export type FixtureHistoryFeatures = {
  fixtureExternalId: number;
  beforeAt: string;
  leagueProviderId: number;
  home: TeamHistoryFeatures;
  away: TeamHistoryFeatures;
  h2h: FixtureH2HFeatures;
};

/** Max recency-equivalent meetings for H2H summary (old meetings down-weighted). */
export const H2H_EFFECTIVE_MEETING_CAP = 5;

export const MAX_RECENT_EXAMPLES = 3;

export const MAX_COMPACT_CONTEXT_BYTES = 16_384;
