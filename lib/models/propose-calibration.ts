import type { ProductionEvalSampleWithFeatures } from "@/lib/analytics/production-eval";
import { loadProductionEvalSamplesWithFeatures } from "@/lib/analytics/production-eval";
import {
  averageLogLossForSamples,
  fitTemperatureScaling,
  type LabeledProbabilitySample,
} from "@/lib/models/calibration";
import { DEFAULT_MODEL_COEFFICIENTS } from "@/lib/models/coefficients";
import { scorePrematchFromFeatures } from "@/lib/models/features";
import { getActiveModelVersion } from "@/lib/predictions/db";
import type { ModelCoefficients } from "@/types/prediction";

const MIN_SAMPLES_FOR_WEIGHT_GRID = 150;
const WEIGHT_GRID_FACTORS = [0.85, 1, 1.15];
export type CalibrationProposal = {
  proposedVersion: string;
  baselineVersion: string;
  sampleCounts: { total: number; train: number; holdout: number };
  metrics: {
    baselineHoldoutLogLoss: number;
    proposedHoldoutLogLoss: number;
    trainLogLossAfterTemperature: number;
  };
  coefficients: ModelCoefficients;
  temperature: number;
  weightGridApplied: boolean;
};

function splitTrainHoldout(
  samples: ProductionEvalSampleWithFeatures[],
  holdoutDays: number
): {
  train: ProductionEvalSampleWithFeatures[];
  holdout: ProductionEvalSampleWithFeatures[];
} {
  const holdoutSince = new Date();
  holdoutSince.setUTCDate(holdoutSince.getUTCDate() - holdoutDays);
  const holdoutSinceIso = holdoutSince.toISOString();

  const train: ProductionEvalSampleWithFeatures[] = [];
  const holdout: ProductionEvalSampleWithFeatures[] = [];

  for (const sample of samples) {
    if (sample.evaluatedAt >= holdoutSinceIso) {
      holdout.push(sample);
    } else {
      train.push(sample);
    }
  }

  return { train, holdout };
}

function toLabeledFromFeatures(
  samples: ProductionEvalSampleWithFeatures[],
  coefficients: ModelCoefficients
): LabeledProbabilitySample[] {
  return samples.map((sample) => ({
    actual: sample.actual,
    probabilities: scorePrematchFromFeatures(sample.inputSnapshot, coefficients)
      .winProbabilities,
  }));
}

function toLabeledFromStored(
  samples: ProductionEvalSampleWithFeatures[]
): LabeledProbabilitySample[] {
  return samples.map((sample) => ({
    actual: sample.actual,
    probabilities: sample.probabilities,
  }));
}

function cloneCoefficients(base: ModelCoefficients): ModelCoefficients {
  return structuredClone(base);
}

function applyWeightGridSearch(
  train: ProductionEvalSampleWithFeatures[],
  base: ModelCoefficients,
  temperature: number
): ModelCoefficients {
  let best = cloneCoefficients(base);
  best.logistic.temperature = temperature;
  let bestLoss = averageLogLossForSamples(toLabeledFromFeatures(train, best));

  for (const eloFactor of WEIGHT_GRID_FACTORS) {
    for (const formFactor of WEIGHT_GRID_FACTORS) {
      for (const homeFactor of WEIGHT_GRID_FACTORS) {
        const candidate = cloneCoefficients(base);
        candidate.logistic.temperature = temperature;
        candidate.logistic.weights.eloDiffNorm *= eloFactor;
        candidate.logistic.weights.form5PpgDiff *= formFactor;
        candidate.logistic.weights.homeAdvantage *= homeFactor;

        const loss = averageLogLossForSamples(
          toLabeledFromFeatures(train, candidate)
        );
        if (loss < bestLoss) {
          bestLoss = loss;
          best = candidate;
        }
      }
    }
  }

  return best;
}

export async function proposeModelCalibration(input?: {
  periodDays?: number;
  holdoutDays?: number;
  proposedVersion?: string;
}): Promise<CalibrationProposal> {
  const periodDays = input?.periodDays ?? 21;
  const holdoutDays = input?.holdoutDays ?? 7;
  const proposedVersion = input?.proposedVersion ?? "1.1.0";

  const active = await getActiveModelVersion();
  const samples = await loadProductionEvalSamplesWithFeatures(periodDays);
  const { train, holdout } = splitTrainHoldout(samples, holdoutDays);

  const baselineHoldoutLogLoss = averageLogLossForSamples(
    toLabeledFromStored(holdout)
  );

  const trainLabeled = toLabeledFromFeatures(
    train,
    active.coefficients ?? DEFAULT_MODEL_COEFFICIENTS
  );
  const { temperature, logLoss: trainLogLossAfterTemperature } =
    fitTemperatureScaling(trainLabeled);

  let proposed = cloneCoefficients(
    active.coefficients ?? DEFAULT_MODEL_COEFFICIENTS
  );
  proposed.logistic.temperature = temperature;

  let weightGridApplied = false;
  if (train.length >= MIN_SAMPLES_FOR_WEIGHT_GRID) {
    const gridded = applyWeightGridSearch(train, proposed, temperature);
    const griddedLoss = averageLogLossForSamples(
      toLabeledFromFeatures(train, gridded)
    );
    if (griddedLoss <= trainLogLossAfterTemperature) {
      proposed = gridded;
      weightGridApplied = true;
    }
  }

  const proposedHoldoutLogLoss = averageLogLossForSamples(
    toLabeledFromFeatures(holdout, proposed)
  );

  return {
    proposedVersion,
    baselineVersion: active.version,
    sampleCounts: {
      total: samples.length,
      train: train.length,
      holdout: holdout.length,
    },
    metrics: {
      baselineHoldoutLogLoss,
      proposedHoldoutLogLoss,
      trainLogLossAfterTemperature,
    },
    coefficients: proposed,
    temperature,
    weightGridApplied,
  };
}
