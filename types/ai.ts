export type {
  AIInsightPayload,
  PrematchInsightResponse,
  StoredAIInsight,
} from "@/lib/ai/schemas";

export { isAiLimitReachedResponse } from "@/lib/ai/schemas";

export type LineupsContextState = "CONFIRMED" | "PREDICTED" | "MISSING";

export type PrematchFormSlice = {
  wins: number;
  draws: number;
  losses: number;
  ppg: number;
  goalsFor: number;
  goalsAgainst: number;
} | null;

export type PrematchAiContext = {
  fixtureExternalId: number;
  kickoffAt: string;
  status: string;
  venue: string | null;
  league: {
    externalId: number;
    name: string;
    category: string | null;
    tier: number | null;
    isInternational: boolean;
    supportsStandings: boolean;
  };
  homeTeam: {
    externalId: number;
    name: string;
    isNational: boolean;
  };
  awayTeam: {
    externalId: number;
    name: string;
    isNational: boolean;
  };
  lineupsState: LineupsContextState;
  round: string | null;
  referee: string | null;
  modelVersion: string;
  promptVersion: string;
  prediction: {
    winProbabilities: {
      home: number;
      draw: number;
      away: number;
    };
    expectedGoalsHome: number;
    expectedGoalsAway: number;
    expectedGoalsTotalMin: number;
    expectedGoalsTotalMax: number;
    bttsProb: number;
    weakerTeamScoringProb: number;
    confidence: "LOW" | "MEDIUM" | "HIGH";
    predictedOutcome: "1" | "X" | "2";
    dataQuality: "COMPLETE" | "PARTIAL";
  };
  form: {
    homeLast5: PrematchFormSlice;
    awayLast5: PrematchFormSlice;
    homeLast5Home: PrematchFormSlice;
    awayLast5Away: PrematchFormSlice;
  };
  standings: {
    home: import("@/lib/ai/context-helpers").TeamStandingContext | null;
    away: import("@/lib/ai/context-helpers").TeamStandingContext | null;
  } | null;
  lineups: import("@/lib/ai/context-helpers").LineupTeamContext[] | null;
  sidelined: Array<{
    teamExternalId: number;
    playerExternalId: number | null;
    name: string;
    kind: string;
    reason: string | null;
  }> | null;
  dataAvailable: string[];
  dataMissing: string[];
  h2h: {
    meetings: number;
    homeWins: number;
    draws: number;
    awayWins: number;
    avgGoals: number | null;
  } | null;
  /** Recency-weighted team history + trends (bounded; no raw 30–100 match lists). */
  analyticsCompact?: import("@/lib/analytics/compact-ai-context").CompactPrematchAnalyticsContext;
  /** Compact historical aggregates (not raw fixture lists). */
  historicalContext?: {
    home: {
      sampleSize: number;
      last20Ppg: number | null;
      seasonPpg: number | null;
      previousSeasonPpg: number | null;
      topCompetitions: Array<{
        leagueName: string;
        matches: number;
        ppg: number | null;
      }>;
    };
    away: {
      sampleSize: number;
      last20Ppg: number | null;
      seasonPpg: number | null;
      previousSeasonPpg: number | null;
      topCompetitions: Array<{
        leagueName: string;
        matches: number;
        ppg: number | null;
      }>;
    };
  };
  dataQuality: "COMPLETE" | "PARTIAL" | "STALE";
  dataTimestamp: string;
};

export type LiveAiContext = {
  fixtureExternalId: number;
  kickoffAt: string;
  status: string;
  minute: number | null;
  score: {
    home: number | null;
    away: number | null;
  };
  venue: string | null;
  league: {
    externalId: number;
    name: string;
    category: string | null;
    tier: number | null;
    isInternational: boolean;
    supportsStandings: boolean;
  };
  homeTeam: {
    externalId: number;
    name: string;
    isNational: boolean;
  };
  awayTeam: {
    externalId: number;
    name: string;
    isNational: boolean;
  };
  modelVersion: string;
  promptVersion: string;
  meaningfulTriggers: string[];
  prediction: PrematchAiContext["prediction"];
  lineupsState: LineupsContextState;
  round: string | null;
  referee: string | null;
  form: PrematchAiContext["form"];
  standings: PrematchAiContext["standings"];
  lineups: PrematchAiContext["lineups"];
  sidelined: PrematchAiContext["sidelined"];
  dataAvailable: string[];
  dataMissing: string[];
  h2h: PrematchAiContext["h2h"];
  liveStats: {
    xgHome: number | null;
    xgAway: number | null;
    redCardsHome: number;
    redCardsAway: number;
    shotsTotalHome: number | null;
    shotsTotalAway: number | null;
    shotsOnTargetHome: number | null;
    shotsOnTargetAway: number | null;
    ballPossessionHome: number | null;
    ballPossessionAway: number | null;
  };
  prematchReference: {
    winProbabilities: {
      home: number;
      draw: number;
      away: number;
    };
    predictedOutcome: "1" | "X" | "2";
    summary: string | null;
  } | null;
  dataQuality: "COMPLETE" | "PARTIAL" | "STALE";
  dataTimestamp: string;
};
