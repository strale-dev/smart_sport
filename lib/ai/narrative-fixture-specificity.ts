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

function numericTokenCount(text: string): number {
  return text.match(/\d+(?:[.,]\d+)?/g)?.length ?? 0;
}

/**
 * Reject commentary that does not contrast this fixture's two sides.
 * Generic baseline output is rejected the same way.
 */
export function assertFixtureSpecificNarrative(input: {
  summary: string;
  commentary: string;
  homeTeamAnalysis?: string;
  awayTeamAnalysis?: string;
  homeTeamName: string;
  awayTeamName: string;
  modelTier: string;
}): void {
  void input.modelTier;

  const summary = input.summary.toLowerCase();
  const homeSection = (
    input.homeTeamAnalysis ?? input.commentary
  ).toLowerCase();
  const awaySection = (
    input.awayTeamAnalysis ?? input.commentary
  ).toLowerCase();

  const summaryNamesBoth =
    tokenMatches(summary, input.homeTeamName) &&
    tokenMatches(summary, input.awayTeamName);
  const sectionsNameTeams =
    tokenMatches(homeSection, input.homeTeamName) &&
    tokenMatches(awaySection, input.awayTeamName);

  if (
    !summaryNamesBoth ||
    !sectionsNameTeams ||
    numericTokenCount(input.summary) < 2
  ) {
    throw new NarrativeNotFixtureSpecificError();
  }
}
