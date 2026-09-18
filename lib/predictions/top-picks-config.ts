import type { AiConfidence } from "@/types/prediction";
import type { PredictionDataQuality } from "@/types/prediction";

export type TopPicksConfig = {
  minModelProbability: number;
  minConfidence: AiConfidence;
  minDataQuality: PredictionDataQuality;
  limit: number;
};

const CONFIDENCE_ORDER: Record<AiConfidence, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
};

export function confidenceMeetsMinimum(
  value: AiConfidence,
  minimum: AiConfidence
): boolean {
  return CONFIDENCE_ORDER[value] >= CONFIDENCE_ORDER[minimum];
}

export function resolveTopPicksConfig(
  source: Record<string, string | undefined> = process.env
): TopPicksConfig {
  const minModelProbability = parseFloatOr(
    source.TOP_PICKS_MIN_MODEL_PROBABILITY,
    0.55
  );
  const minConfidence = parseConfidenceOr(
    source.TOP_PICKS_MIN_CONFIDENCE,
    "MEDIUM"
  );
  const minDataQuality = parseDataQualityOr(
    source.TOP_PICKS_MIN_DATA_QUALITY,
    "PARTIAL"
  );
  const limit = parseIntOr(source.TOP_PICKS_LIMIT, 10);

  return {
    minModelProbability,
    minConfidence,
    minDataQuality,
    limit: Math.min(Math.max(limit, 1), 25),
  };
}

function parseFloatOr(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseIntOr(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseConfidenceOr(
  value: string | undefined,
  fallback: AiConfidence
): AiConfidence {
  if (value === "LOW" || value === "MEDIUM" || value === "HIGH") {
    return value;
  }
  return fallback;
}

function parseDataQualityOr(
  value: string | undefined,
  fallback: PredictionDataQuality
): PredictionDataQuality {
  if (value === "COMPLETE" || value === "PARTIAL") {
    return value;
  }
  return fallback;
}
