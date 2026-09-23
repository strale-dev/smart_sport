import type { WinProbabilities } from "@/types/prediction";

import {
  averageMetric,
  logLoss,
  type MatchResultLabel,
} from "@/lib/models/metrics";

export type LabeledProbabilitySample = {
  probabilities: WinProbabilities;
  actual: MatchResultLabel;
};

function softmaxFromLogits(
  homeLogit: number,
  drawLogit: number,
  awayLogit: number
): WinProbabilities {
  const maxLogit = Math.max(homeLogit, drawLogit, awayLogit);
  const expHome = Math.exp(homeLogit - maxLogit);
  const expDraw = Math.exp(drawLogit - maxLogit);
  const expAway = Math.exp(awayLogit - maxLogit);
  const total = expHome + expDraw + expAway;
  return {
    home: expHome / total,
    draw: expDraw / total,
    away: expAway / total,
  };
}

function logitsFromProbabilities(probabilities: WinProbabilities): {
  home: number;
  draw: number;
  away: number;
} {
  const epsilon = 1e-9;
  return {
    home: Math.log(Math.max(probabilities.home, epsilon)),
    draw: Math.log(Math.max(probabilities.draw, epsilon)),
    away: Math.log(Math.max(probabilities.away, epsilon)),
  };
}

export function applyTemperatureScaling(
  probabilities: WinProbabilities,
  temperature: number
): WinProbabilities {
  if (temperature <= 0 || !Number.isFinite(temperature)) {
    return probabilities;
  }

  const logits = logitsFromProbabilities(probabilities);
  return softmaxFromLogits(
    logits.home / temperature,
    logits.draw / temperature,
    logits.away / temperature
  );
}

export function averageLogLossForSamples(
  samples: LabeledProbabilitySample[]
): number {
  if (samples.length === 0) {
    return 0;
  }

  return averageMetric(
    samples.map((sample) => logLoss(sample.probabilities, sample.actual))
  );
}

export function fitTemperatureScaling(
  samples: LabeledProbabilitySample[],
  options?: { min?: number; max?: number; step?: number }
): { temperature: number; logLoss: number } {
  const min = options?.min ?? 0.75;
  const max = options?.max ?? 1.75;
  const step = options?.step ?? 0.025;

  if (samples.length === 0) {
    return { temperature: 1, logLoss: 0 };
  }

  let bestTemperature = 1;
  let bestLogLoss = Number.POSITIVE_INFINITY;

  for (
    let temperature = min;
    temperature <= max + step / 2;
    temperature += step
  ) {
    const scaled = samples.map((sample) => ({
      actual: sample.actual,
      probabilities: applyTemperatureScaling(sample.probabilities, temperature),
    }));
    const loss = averageLogLossForSamples(scaled);
    if (loss < bestLogLoss) {
      bestLogLoss = loss;
      bestTemperature = Number(temperature.toFixed(3));
    }
  }

  return { temperature: bestTemperature, logLoss: bestLogLoss };
}
