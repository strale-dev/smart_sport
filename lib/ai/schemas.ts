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

/** OpenAI strict schema — no tuples, no optional fields. */
export const AIInsightOpenAiSchema = z.object({
  summary: z.string().min(10).max(200),
  advantage: z.enum(["HOME", "DRAW", "AWAY", "EVEN"]),
  winOutcome: z.enum(["1", "X", "2"]),
  winProbabilities: winProbabilitiesSchema,
  expectedGoalsMin: z.number(),
  expectedGoalsMax: z.number(),
  weakerTeamScoringChance: z.number().min(0).max(1).nullable(),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
  keyFactors: z.array(keyFactorSchema).min(2).max(5),
  scenarios: z.object({
    likely: z.string(),
    best: z.string(),
    upset: z.string(),
  }),
  commentary: z.string().min(50).max(1200),
  dataTimestamp: z.string(),
  dataQuality: z.enum(["COMPLETE", "PARTIAL", "STALE"]),
});

export const AIInsightSchema = z
  .object({
    summary: z.string().min(10).max(200),
    advantage: z.enum(["HOME", "DRAW", "AWAY", "EVEN"]),
    winOutcome: z.enum(["1", "X", "2"]),
    winProbabilities: winProbabilitiesSchema,
    expectedGoalsRange: expectedGoalsRangeSchema,
    weakerTeamScoringChance: z.number().min(0).max(1).nullable(),
    confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
    keyFactors: z.array(keyFactorSchema).min(2).max(5),
    scenarios: z.object({
      likely: z.string(),
      best: z.string(),
      upset: z.string(),
    }),
    commentary: z.string().min(50).max(1200),
    dataTimestamp: z.string(),
    dataQuality: z.enum(["COMPLETE", "PARTIAL", "STALE"]),
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

function normalizeWinOutcome(
  winProbabilities: AIInsightPayload["winProbabilities"]
): AIInsightPayload["winOutcome"] {
  const maxProb = Math.max(
    winProbabilities.home,
    winProbabilities.draw,
    winProbabilities.away
  );

  if (winProbabilities.home === maxProb) {
    return "1";
  }
  if (winProbabilities.draw === maxProb) {
    return "X";
  }
  return "2";
}

function normalizeWinProbabilities(
  winProbabilities: AIInsightPayload["winProbabilities"]
): AIInsightPayload["winProbabilities"] {
  const sum =
    winProbabilities.home + winProbabilities.draw + winProbabilities.away;

  if (sum <= 0) {
    return { home: 0.34, draw: 0.33, away: 0.33 };
  }

  return {
    home: Number((winProbabilities.home / sum).toFixed(4)),
    draw: Number((winProbabilities.draw / sum).toFixed(4)),
    away: Number((winProbabilities.away / sum).toFixed(4)),
  };
}

export function normalizeAndValidateAIInsight(
  payload: z.infer<typeof AIInsightOpenAiSchema>
): AIInsightPayload {
  const normalizedProbabilities = normalizeWinProbabilities(
    payload.winProbabilities
  );
  const minGoals = Math.min(payload.expectedGoalsMin, payload.expectedGoalsMax);
  const maxGoals = Math.max(payload.expectedGoalsMin, payload.expectedGoalsMax);

  return AIInsightSchema.parse({
    summary: payload.summary,
    advantage: payload.advantage,
    winOutcome: normalizeWinOutcome(normalizedProbabilities),
    winProbabilities: normalizedProbabilities,
    expectedGoalsRange: [minGoals, maxGoals],
    weakerTeamScoringChance: payload.weakerTeamScoringChance,
    confidence: payload.confidence,
    keyFactors: payload.keyFactors,
    scenarios: payload.scenarios,
    commentary: payload.commentary,
    dataTimestamp: payload.dataTimestamp,
    dataQuality: payload.dataQuality,
  });
}

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
};

export type PrematchInsightMode = "prematch" | "historical" | "live";

export type LiveInsightResponse =
  | {
      status: "OK";
      insight: StoredAIInsight;
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
      cached: boolean;
      insightMode: PrematchInsightMode;
    }
  | {
      status: "MISS";
      fixtureExternalId: number;
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
