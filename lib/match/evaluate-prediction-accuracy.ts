import { predictedOutcomeFromProbabilities } from "@/lib/models/confidence";
import type { Fixture, ScoreSnapshot } from "@/types/domain";
import type { PrematchPredictionSnapshot } from "@/types/prediction";

export type PredictionAccuracyRow = {
  id: string;
  label: string;
  predicted: string;
  actual: string;
  hit: boolean;
};

const BTTS_THRESHOLD = 0.5;
const WEAKER_SCORE_THRESHOLD = 0.5;
const OVER_GOALS_THRESHOLD = 0.5;

function resolveFinalGoals(
  score: ScoreSnapshot
): { home: number; away: number } | null {
  const home = score.fulltimeHome ?? score.home;
  const away = score.fulltimeAway ?? score.away;

  if (home == null || away == null) {
    return null;
  }

  return { home, away };
}

function actualOutcomeFromGoals(home: number, away: number): "1" | "X" | "2" {
  if (home > away) {
    return "1";
  }
  if (home < away) {
    return "2";
  }
  return "X";
}

function outcomeLabel(outcome: "1" | "X" | "2"): string {
  if (outcome === "1") {
    return "Home win";
  }
  if (outcome === "2") {
    return "Away win";
  }
  return "Draw";
}

function weakerTeamSide(
  fixture: Fixture,
  prediction: PrematchPredictionSnapshot
): "home" | "away" {
  const { home, away } = prediction.winProbabilities;
  return home <= away ? "home" : "away";
}

export function evaluatePrematchPredictionAccuracy(
  fixture: Fixture,
  prediction: PrematchPredictionSnapshot
): PredictionAccuracyRow[] {
  const goals = resolveFinalGoals(fixture.score);
  if (!goals) {
    return [];
  }

  const actualOutcome = actualOutcomeFromGoals(goals.home, goals.away);
  const predictedOutcome =
    prediction.predictedOutcome ??
    predictedOutcomeFromProbabilities(prediction.winProbabilities);

  const actualBtts = goals.home > 0 && goals.away > 0;
  const predictedBtts = prediction.bttsProb >= BTTS_THRESHOLD;

  const totalGoals = goals.home + goals.away;
  const inGoalsRange =
    totalGoals >= prediction.expectedGoalsTotalMin &&
    totalGoals <= prediction.expectedGoalsTotalMax;

  const weakerSide = weakerTeamSide(fixture, prediction);
  const weakerScored = weakerSide === "home" ? goals.home > 0 : goals.away > 0;
  const predictedWeakerScores =
    prediction.weakerTeamScoringProb >= WEAKER_SCORE_THRESHOLD;

  const actualOver2 = totalGoals > 2;
  const actualOver3 = totalGoals > 3;
  const predictedOver2 = (prediction.over2Prob ?? 0) >= OVER_GOALS_THRESHOLD;
  const predictedOver3 = (prediction.over3Prob ?? 0) >= OVER_GOALS_THRESHOLD;

  return [
    {
      id: "1x2",
      label: "Match result (1/X/2)",
      predicted: outcomeLabel(predictedOutcome),
      actual: outcomeLabel(actualOutcome),
      hit: predictedOutcome === actualOutcome,
    },
    {
      id: "btts",
      label: "Both teams to score",
      predicted: predictedBtts ? "Yes" : "No",
      actual: actualBtts ? "Yes" : "No",
      hit: predictedBtts === actualBtts,
    },
    {
      id: "total_goals",
      label: "Total goals in range",
      predicted: `${prediction.expectedGoalsTotalMin.toFixed(1)}–${prediction.expectedGoalsTotalMax.toFixed(1)}`,
      actual: String(totalGoals),
      hit: inGoalsRange,
    },
    {
      id: "weaker_scores",
      label: "Weaker team scores",
      predicted: predictedWeakerScores ? "Yes" : "No",
      actual: weakerScored ? "Yes" : "No",
      hit: predictedWeakerScores === weakerScored,
    },
    {
      id: "over2",
      label: "Over 2.5 goals",
      predicted: predictedOver2 ? "Yes" : "No",
      actual: actualOver2 ? "Yes" : "No",
      hit: predictedOver2 === actualOver2,
    },
    {
      id: "over3",
      label: "Over 3.5 goals",
      predicted: predictedOver3 ? "Yes" : "No",
      actual: actualOver3 ? "Yes" : "No",
      hit: predictedOver3 === actualOver3,
    },
  ];
}
