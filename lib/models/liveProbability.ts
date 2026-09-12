import {
  bucketConfidence,
  predictedOutcomeFromProbabilities,
} from "@/lib/models/confidence";
import type {
  LiveFeatureVector,
  PrematchModelOutput,
  WinProbabilities,
} from "@/types/prediction";

function softmax3(home: number, draw: number, away: number): WinProbabilities {
  const maxLogit = Math.max(home, draw, away);
  const expHome = Math.exp(home - maxLogit);
  const expDraw = Math.exp(draw - maxLogit);
  const expAway = Math.exp(away - maxLogit);
  const total = expHome + expDraw + expAway;

  return {
    home: expHome / total,
    draw: expDraw / total,
    away: expAway / total,
  };
}

function logProb(value: number): number {
  return Math.log(Math.max(value, 1e-6));
}

function priorLogits(prior: WinProbabilities): WinProbabilities {
  return {
    home: logProb(prior.home),
    draw: logProb(prior.draw),
    away: logProb(prior.away),
  };
}

function clampMinute(minute: number | null): number {
  if (minute == null || !Number.isFinite(minute)) {
    return 45;
  }
  return Math.min(120, Math.max(1, minute));
}

/**
 * Combines pre-match (or last live) priors with in-match evidence.
 * Keeps adjustments modest so probabilities do not swing without real state change.
 */
export function scoreLiveFromFeatures(
  features: LiveFeatureVector
): PrematchModelOutput {
  const prior = features.priorWinProbabilities;
  const logits = priorLogits(prior);

  const minute = clampMinute(features.minute);
  const timeWeight = minute / 90;
  const goalDiff = features.scoreHome - features.scoreAway;

  if (goalDiff > 0) {
    logits.home += goalDiff * 0.42 * timeWeight;
    logits.draw -= goalDiff * 0.18 * timeWeight;
    logits.away -= goalDiff * 0.28 * timeWeight;
  } else if (goalDiff < 0) {
    const awayLead = Math.abs(goalDiff);
    logits.away += awayLead * 0.42 * timeWeight;
    logits.draw -= awayLead * 0.18 * timeWeight;
    logits.home -= awayLead * 0.28 * timeWeight;
  }

  const redDiff = features.redCardsHome - features.redCardsAway;
  logits.home -= redDiff * 0.14;
  logits.away += redDiff * 0.14;

  const xgHome = features.xgHome ?? 0;
  const xgAway = features.xgAway ?? 0;
  const xgDiff = xgHome - xgAway;
  logits.home += xgDiff * 0.1;
  logits.away -= xgDiff * 0.1;

  const winProbabilities = softmax3(logits.home, logits.draw, logits.away);

  const remainingFraction = Math.max(0.05, (90 - Math.min(minute, 90)) / 90);
  const expectedGoalsHome =
    features.scoreHome +
    Math.max(0.15, xgHome - features.scoreHome) * remainingFraction;
  const expectedGoalsAway =
    features.scoreAway +
    Math.max(0.15, xgAway - features.scoreAway) * remainingFraction;
  const totalExpected = expectedGoalsHome + expectedGoalsAway;

  const confidence = bucketConfidence(winProbabilities);

  return {
    winProbabilities,
    expectedGoalsHome: Number(expectedGoalsHome.toFixed(2)),
    expectedGoalsAway: Number(expectedGoalsAway.toFixed(2)),
    expectedGoalsTotalMin: Number(Math.max(totalExpected - 0.75, 0).toFixed(2)),
    expectedGoalsTotalMax: Number((totalExpected + 0.75).toFixed(2)),
    bttsProb: Number(
      Math.min(
        0.95,
        Math.max(0.05, 1 - Math.exp(-totalExpected * 0.65))
      ).toFixed(4)
    ),
    weakerTeamScoringProb: Number(
      (goalDiff >= 0
        ? Math.min(0.9, 0.25 + xgAway * 0.35)
        : Math.min(0.9, 0.25 + xgHome * 0.35)
      ).toFixed(4)
    ),
    confidence,
    predictedOutcome: predictedOutcomeFromProbabilities(winProbabilities),
  };
}
