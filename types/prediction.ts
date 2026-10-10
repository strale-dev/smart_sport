import type { Database } from "@/types/supabase";

export type AiConfidence = Database["public"]["Enums"]["ai_confidence"];
export type PredictionType = Database["public"]["Enums"]["prediction_type"];
export type PredictionDataQuality = "COMPLETE" | "PARTIAL";

export type WinProbabilities = {
  home: number;
  draw: number;
  away: number;
};

export type LogisticCoefficients = {
  intercept: { home: number; draw: number; away: number };
  weights: {
    eloDiffNorm: number;
    form5PpgDiff: number;
    form10PpgDiff: number;
    h2hHomeWinRate: number;
    leaguePositionDiffNorm: number;
    restDaysDiffNorm: number;
    goalsForAvgDiff: number;
    xgForAvgDiff: number;
    homeAdvantage: number;
  };
  temperature: number;
};

export type PoissonCoefficients = {
  baseHomeGoals: number;
  baseAwayGoals: number;
  eloScale: number;
  formScale: number;
  homeAdvantageGoals: number;
};

export type EloCoefficients = {
  defaultRating: number;
  homeAdvantageRating: number;
  kFactorTopTier: number;
  kFactorDefault: number;
  topTierLeagueProviderIds: number[];
};

export type ModelCoefficients = {
  logistic: LogisticCoefficients;
  poisson: PoissonCoefficients;
  elo: EloCoefficients;
};

export type LineupsFeatureState = "MISSING" | "PREDICTED" | "CONFIRMED";

export type PrematchFeatureVector = {
  fixtureExternalId: number;
  asOf: string;
  homeTeamProviderId: number;
  awayTeamProviderId: number;
  leagueProviderId: number;
  eloHome: number;
  eloAway: number;
  eloDiff: number;
  form5HomePpg: number | null;
  form5AwayPpg: number | null;
  form5HomeVenuePpg: number | null;
  form5AwayVenuePpg: number | null;
  form10HomePpg: number | null;
  form10AwayPpg: number | null;
  h2hHomeWinRate: number | null;
  h2hGoalAvg: number | null;
  homeLeagueRank: number | null;
  awayLeagueRank: number | null;
  leaguePositionDiff: number | null;
  homeStandingPoints: number | null;
  awayStandingPoints: number | null;
  standingPointsDiff: number | null;
  homeRestDays: number | null;
  awayRestDays: number | null;
  homeGoalsForAvg: number | null;
  awayGoalsForAvg: number | null;
  homeGoalsAgainstAvg: number | null;
  awayGoalsAgainstAvg: number | null;
  homeXgForAvg: number | null;
  awayXgForAvg: number | null;
  homeXgAgainstAvg: number | null;
  awayXgAgainstAvg: number | null;
  homeInjuryImpact: number | null;
  awayInjuryImpact: number | null;
  homeTopScorersSidelined: number;
  awayTopScorersSidelined: number;
  lineupsState: LineupsFeatureState;
  hasXg: boolean;
  dataQuality: PredictionDataQuality;
};

export type PrematchModelOutput = {
  winProbabilities: WinProbabilities;
  expectedGoalsHome: number;
  expectedGoalsAway: number;
  expectedGoalsTotal: number;
  expectedGoalsTotalMin: number;
  expectedGoalsTotalMax: number;
  bttsProb: number;
  weakerTeamScoringProb: number;
  over2Prob: number;
  over3Prob: number;
  under2Prob: number;
  confidence: AiConfidence;
  predictedOutcome: "1" | "X" | "2";
};

/** Subset sent to clients for post-match accuracy checks. */
export type PrematchPredictionSnapshot = PrematchModelOutput;

export type PrematchPredictionResult = PrematchModelOutput & {
  fixtureId: string;
  fixtureExternalId: number;
  modelVersionId: string;
  modelVersion: string;
  predictionId: string;
  type: "PREMATCH";
  inputSnapshot: PrematchFeatureVector;
  createdAt: string;
  fromCache: boolean;
};

export type PrematchPredictionRow = {
  id: string;
  fixture_id: string;
  model_version_id: string;
  home_win_prob: number;
  draw_prob: number;
  away_win_prob: number;
  expected_goals_home: number | null;
  expected_goals_away: number | null;
  expected_goals_total: number | null;
  expected_goals_total_min: number | null;
  expected_goals_total_max: number | null;
  over2_prob: number | null;
  over3_prob: number | null;
  btts_prob: number | null;
  weaker_team_scoring_prob: number | null;
  confidence: AiConfidence;
  input_snapshot: PrematchFeatureVector;
  created_at: string;
};

export type LiveFeatureVector = {
  fixtureExternalId: number;
  asOf: string;
  minute: number | null;
  scoreHome: number;
  scoreAway: number;
  redCardsHome: number;
  redCardsAway: number;
  shotsOnTargetHome: number | null;
  shotsOnTargetAway: number | null;
  xgHome: number | null;
  xgAway: number | null;
  possessionHome: number | null;
  possessionAway: number | null;
  cornersHome: number | null;
  cornersAway: number | null;
  /** Official pre-kickoff win probabilities — fixed anchor for live scoring (RC-12). */
  anchorWinProbabilities: WinProbabilities;
  /** @deprecated Same as anchor; kept for older snapshots/readers. */
  priorWinProbabilities: WinProbabilities;
  dataQuality: PredictionDataQuality;
};

export type LivePredictionResult = PrematchModelOutput & {
  fixtureId: string;
  fixtureExternalId: number;
  modelVersionId: string;
  modelVersion: string;
  predictionId: string;
  type: "LIVE";
  minute: number | null;
  inputSnapshot: LiveFeatureVector;
  createdAt: string;
  fromCache: boolean;
};

export type LivePredictionRow = {
  id: string;
  fixture_id: string;
  model_version_id: string;
  minute: number | null;
  home_win_prob: number;
  draw_prob: number;
  away_win_prob: number;
  expected_goals_home: number | null;
  expected_goals_away: number | null;
  expected_goals_total: number | null;
  expected_goals_total_min: number | null;
  expected_goals_total_max: number | null;
  over2_prob: number | null;
  over3_prob: number | null;
  btts_prob: number | null;
  weaker_team_scoring_prob: number | null;
  confidence: AiConfidence;
  input_snapshot: LiveFeatureVector;
  created_at: string;
};
