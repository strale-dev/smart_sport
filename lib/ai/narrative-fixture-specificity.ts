export class NarrativeNotFixtureSpecificError extends Error {
  readonly code = "NARRATIVE_NOT_FIXTURE_SPECIFIC" as const;

  constructor() {
    super("AI narrative lacks fixture-specific team references.");
    this.name = "NarrativeNotFixtureSpecificError";
  }
}

function tokenMatches(text: string, teamName: string): boolean {
  const normalized = teamName.trim().toLowerCase();
  if (normalized.length < 3) {
    return false;
  }
  if (text.includes(normalized)) {
    return true;
  }
  const firstWord = normalized.split(/\s+/)[0];
  return firstWord != null && firstWord.length >= 4 && text.includes(firstWord);
}

/**
 * Reject generic commentary that does not reference either team when the model is fixture-specific.
 */
export function assertFixtureSpecificNarrative(input: {
  summary: string;
  commentary: string;
  homeTeamName: string;
  awayTeamName: string;
  modelTier: string;
}): void {
  if (input.modelTier === "GENERIC_BASELINE") {
    return;
  }

  const text = `${input.summary}\n${input.commentary}`.toLowerCase();
  const matchesHome = tokenMatches(text, input.homeTeamName);
  const matchesAway = tokenMatches(text, input.awayTeamName);

  if (!matchesHome && !matchesAway) {
    throw new NarrativeNotFixtureSpecificError();
  }
}
