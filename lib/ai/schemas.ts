import { z } from "zod";

const winProbabilitiesSchema = z.object({
  home: z.number().min(0).max(1),
  draw: z.number().min(0).max(1),
  away: z.number().min(0).max(1),
});

const keyFactorSchema = z.object({
  label: z.string(),
  weight: z.number(),
  evidence: z.string(),
});

const expectedGoalsRangeSchema = z.tuple([z.number(), z.number()]);

const scenariosSchema = z.object({
  likely: z.string(),
  best: z.string(),
  upset: z.string(),
});

function keyFactorsWithNumericEvidence(
  factors: z.infer<typeof keyFactorSchema>[],
  ctx: z.RefinementCtx
) {
  factors.forEach((factor, index) => {
    if (!/\d/.test(factor.evidence)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Evidence must include at least one number from the context",
        path: ["keyFactors", index, "evidence"],
      });
    }
  });
}

export const prematchAnalysisSchema = z.object({
  matchSummary: z.string().min(40).max(700),
  homeTeamAnalysis: z.string().min(40).max(1_000),
  awayTeamAnalysis: z.string().min(40).max(1_000),
  headToHeadAnalysis: z.string().min(20).max(600).nullable(),
  lineupsAndAbsences: z.string().min(20).max(700).nullable(),
  goalsOutlook: z.string().min(40).max(700),
  predictionRationale: z.string().min(60).max(800),
  risks: z.array(z.string().min(20).max(320)).min(2).max(4),
  watchFor: z.array(z.string().min(15).max(240)).min(1).max(3),
});

export type PrematchAnalysisSections = z.infer<typeof prematchAnalysisSchema>;

const liveNarrativeFields = {
  summary: z.string().min(20).max(320),
  advantage: z.enum(["HOME", "DRAW", "AWAY", "EVEN"]),
  keyFactors: z.array(keyFactorSchema).min(4).max(6),
  scenarios: scenariosSchema,
  dataUsed: z.array(z.string()).min(1).max(20),
  dataTimestamp: z.string(),
  analysis: prematchAnalysisSchema,
};

const prematchNarrativeFields = {
  summary: z.string().min(20).max(320),
  advantage: z.enum(["HOME", "DRAW", "AWAY", "EVEN"]),
  keyFactors: z.array(keyFactorSchema).min(4).max(6),
  scenarios: scenariosSchema,
  dataUsed: z.array(z.string()).min(1).max(20),
  dataTimestamp: z.string(),
  analysis: prematchAnalysisSchema,
};

/** Live LLM output — structured sections; probabilities come from the prediction engine. */
export const AIInsightLiveNarrativeOpenAiSchema = z
  .object(liveNarrativeFields)
  .superRefine((value, ctx) => {
    keyFactorsWithNumericEvidence(value.keyFactors, ctx);
  });

/** OpenAI structured output schema for live (no superRefine — validated server-side). */
export const AIInsightLiveOpenAiResponseSchema = z.object(liveNarrativeFields);

/** Pre-match LLM output — structured sections; no model probabilities in the schema. */
export const AIInsightPrematchNarrativeOpenAiSchema = z
  .object(prematchNarrativeFields)
  .superRefine((value, ctx) => {
    keyFactorsWithNumericEvidence(value.keyFactors, ctx);
  });

/** OpenAI structured output schema (no superRefine — repaired server-side before strict validate). */
export const AIInsightPrematchOpenAiResponseSchema = z.object(
  prematchNarrativeFields
);

export type AIInsightLiveNarrativePayload = z.infer<
  typeof AIInsightLiveNarrativeOpenAiSchema
>;

export type AIInsightPrematchNarrativePayload = z.infer<
  typeof AIInsightPrematchNarrativeOpenAiSchema
>;

/** @deprecated Use AIInsightLiveNarrativeOpenAiSchema for live insights. */
export const AIInsightNarrativeOpenAiSchema =
  AIInsightLiveNarrativeOpenAiSchema;

export type AIInsightNarrativePayload = AIInsightLiveNarrativePayload & {
  commentary: string;
  dataQuality: "COMPLETE" | "PARTIAL" | "STALE";
};

const mergedInsightFields = {
  summary: z.string().min(10).max(320),
  advantage: z.enum(["HOME", "DRAW", "AWAY", "EVEN"]),
  keyFactors: z.array(keyFactorSchema).min(2).max(6),
  scenarios: scenariosSchema,
  commentary: z.string().min(50).max(12_000),
  dataUsed: z.array(z.string()).min(1).max(20),
  dataTimestamp: z.string(),
  dataQuality: z.enum(["COMPLETE", "PARTIAL", "STALE"]),
};

export const AIInsightSchema = z
  .object({
    ...mergedInsightFields,
    winOutcome: z.enum(["1", "X", "2"]),
    winProbabilities: winProbabilitiesSchema,
    expectedGoalsRange: expectedGoalsRangeSchema,
    weakerTeamScoringChance: z.number().min(0).max(1).nullable(),
    confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
  })
  .superRefine((value, ctx) => {
    const sum =
      value.winProbabilities.home +
      value.winProbabilities.draw +
      value.winProbabilities.away;

    if (Math.abs(sum - 1) > 0.02) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Win probabilities must sum to 1 within tolerance",
        path: ["winProbabilities"],
      });
    }

    const minProb = 0.01;
    if (
      value.winProbabilities.home < minProb ||
      value.winProbabilities.draw < minProb ||
      value.winProbabilities.away < minProb
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each win probability must be at least 1%",
        path: ["winProbabilities"],
      });
    }

    const maxProb = Math.max(
      value.winProbabilities.home,
      value.winProbabilities.draw,
      value.winProbabilities.away
    );
    const outcomeProb =
      value.winOutcome === "1"
        ? value.winProbabilities.home
        : value.winOutcome === "X"
          ? value.winProbabilities.draw
          : value.winProbabilities.away;

    if (Math.abs(outcomeProb - maxProb) > 0.05) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "winOutcome must align with the highest probability",
        path: ["winOutcome"],
      });
    }

    const [minGoals, maxGoals] = value.expectedGoalsRange;
    if (minGoals > maxGoals) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "expectedGoalsRange min must be <= max",
        path: ["expectedGoalsRange"],
      });
    }
  });

export type AIInsightPayload = z.infer<typeof AIInsightSchema>;

/** @deprecated OpenAI schema name kept for imports migrating off LLM-generated numbers. */
export const AIInsightOpenAiSchema = AIInsightNarrativeOpenAiSchema;

export function validateAIInsightLiveNarrative(
  payload: AIInsightLiveNarrativePayload
): AIInsightLiveNarrativePayload {
  return AIInsightLiveNarrativeOpenAiSchema.parse(payload);
}

export function validateAIInsightPrematchNarrative(
  payload: AIInsightPrematchNarrativePayload
): AIInsightPrematchNarrativePayload {
  return AIInsightPrematchNarrativeOpenAiSchema.parse(payload);
}

/** @deprecated Use validateAIInsightLiveNarrative for live generation. */
export function validateAIInsightNarrative(
  payload: AIInsightLiveNarrativePayload
): AIInsightLiveNarrativePayload {
  return validateAIInsightLiveNarrative(payload);
}

export function validateAIInsightPayload(
  payload: AIInsightPayload
): AIInsightPayload {
  return AIInsightSchema.parse(payload);
}

export type InsightDataCoverage = {
  dataAvailable: string[];
  dataMissing: string[];
};

export type StoredAIInsight = AIInsightPayload & {
  id: string;
  fixtureExternalId: number;
  fixtureId: string;
  predictionId: string | null;
  contextHash: string;
  openaiModel: string;
  promptVersion: string;
  createdAt: string;
  cached: boolean;
  dataCoverage: InsightDataCoverage | null;
  analysis: PrematchAnalysisSections | null;
};

export type PrematchInsightMode = "prematch" | "historical" | "live";

export type LiveInsightResponse =
  | {
      status: "OK";
      insight: StoredAIInsight;
      prediction: import("@/types/prediction").LivePredictionResult | null;
      cached: boolean;
      insightMode: "live";
    }
  | {
      status: "MISS";
      fixtureExternalId: number;
    }
  | {
      status: "UNAVAILABLE";
      fixtureExternalId: number;
      reason?: "NOT_LIVE" | "FIXTURE_NOT_ANALYZABLE";
    };

export type PrematchInsightResponse =
  | {
      status: "OK";
      insight: StoredAIInsight;
      prediction: import("@/types/prediction").PrematchPredictionResult;
      cached: boolean;
      insightMode: PrematchInsightMode;
    }
  | {
      status: "MISS";
      fixtureExternalId: number;
      prediction?: import("@/types/prediction").PrematchPredictionResult;
    }
  | {
      status: "UNAVAILABLE";
      fixtureExternalId: number;
      reason?: "NO_STORED_INSIGHT" | "FIXTURE_NOT_ANALYZABLE";
    }
  | {
      status: "FALLBACK";
      fixtureExternalId: number;
      prediction: import("@/types/prediction").PrematchPredictionResult;
      message: string;
    }
  | {
      status: "AI_LIMIT_REACHED";
      limit: number;
      used: number;
    }
  | {
      status: "GUEST_FORBIDDEN";
    };

export function isAiLimitReachedResponse(
  response: PrematchInsightResponse
): response is Extract<
  PrematchInsightResponse,
  { status: "AI_LIMIT_REACHED" }
> {
  return response.status === "AI_LIMIT_REACHED";
}
