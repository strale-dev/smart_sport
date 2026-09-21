import type {
  AIInsightLiveNarrativePayload,
  AIInsightNarrativePayload,
  AIInsightPrematchNarrativePayload,
  PrematchAnalysisSections,
} from "@/lib/ai/schemas";

export function prematchLlmToNarrativePayload(
  parsed: AIInsightPrematchNarrativePayload
): AIInsightNarrativePayload {
  return {
    summary: parsed.summary,
    advantage: parsed.advantage,
    keyFactors: parsed.keyFactors,
    scenarios: parsed.scenarios,
    commentary: composePrematchCommentary(parsed.analysis),
    dataUsed: parsed.dataUsed,
    dataTimestamp: parsed.dataTimestamp,
    dataQuality: "PARTIAL",
  };
}

export function liveLlmToNarrativePayload(
  parsed: AIInsightLiveNarrativePayload
): AIInsightNarrativePayload {
  return {
    summary: parsed.summary,
    advantage: parsed.advantage,
    keyFactors: parsed.keyFactors,
    scenarios: parsed.scenarios,
    commentary: composePrematchCommentary(parsed.analysis),
    dataUsed: parsed.dataUsed,
    dataTimestamp: parsed.dataTimestamp,
    dataQuality: "PARTIAL",
  };
}

export function composePrematchCommentary(
  analysis: PrematchAnalysisSections
): string {
  const blocks = [
    analysis.matchSummary,
    `Prediction rationale: ${analysis.predictionRationale}`,
    analysis.homeTeamAnalysis,
    analysis.awayTeamAnalysis,
    analysis.headToHeadAnalysis,
    analysis.lineupsAndAbsences,
    analysis.goalsOutlook,
    analysis.risks.length > 0 ? `Key risks: ${analysis.risks.join(" ")}` : null,
    analysis.watchFor.length > 0
      ? `Watch for: ${analysis.watchFor.join(" ")}`
      : null,
  ].filter((block): block is string => Boolean(block && block.trim()));

  return blocks.join("\n\n").slice(0, 12_000);
}
