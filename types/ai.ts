export type {
  AIInsightPayload,
  PrematchInsightResponse,
  StoredAIInsight,
} from "@/lib/ai/schemas";

export { isAiLimitReachedResponse } from "@/lib/ai/schemas";

export type LineupsContextState = "CONFIRMED" | "PREDICTED" | "MISSING";

export type PrematchAiContext = {
  fixtureExternalId: number;
  kickoffAt: string;
  status: string;
  venue: string | null;
  league: {
    externalId: number;
    name: string;
  };
  homeTeam: {
    externalId: number;
    name: string;
  };
  awayTeam: {
    externalId: number;
    name: string;
  };
  lineupsState: LineupsContextState;
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
    homeLast5: {
      wins: number;
      draws: number;
      losses: number;
      ppg: number;
      goalsFor: number;
      goalsAgainst: number;
    } | null;
    awayLast5: {
      wins: number;
      draws: number;
      losses: number;
      ppg: number;
      goalsFor: number;
      goalsAgainst: number;
    } | null;
  };
  h2h: {
    meetings: number;
    homeWins: number;
    draws: number;
    awayWins: number;
    avgGoals: number | null;
  } | null;
  dataQuality: "COMPLETE" | "PARTIAL" | "STALE";
  dataTimestamp: string;
};
