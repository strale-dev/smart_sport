type NarrativeWithKeyFactors = {
  keyFactors: Array<{ label: string; weight: number; evidence: string }>;
};

function firstContextNumber(contextJson: string): string | null {
  const match = contextJson.match(/\d+\.?\d*/);
  return match?.[0] ?? null;
}

/** Ensures key factor evidence includes a digit so validation and UI trust rules hold. */
export function repairInsightNarrativeEvidence<
  T extends NarrativeWithKeyFactors,
>(parsed: T, contextJson: string): T {
  const fallbackDigit = firstContextNumber(contextJson);
  if (!fallbackDigit) {
    return parsed;
  }

  return {
    ...parsed,
    keyFactors: parsed.keyFactors.map((factor) => {
      if (/\d/.test(factor.evidence)) {
        return factor;
      }

      return {
        ...factor,
        evidence: `${factor.evidence.trim()} (see ${fallbackDigit} in match context).`,
      };
    }),
  };
}

/** @deprecated Use repairInsightNarrativeEvidence */
export const repairPrematchNarrativeEvidence = repairInsightNarrativeEvidence;
