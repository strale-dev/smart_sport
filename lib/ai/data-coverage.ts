import type { LineupsContextState } from "@/types/ai";

export const ANALYSIS_DATA_LABELS = {
  modelPrediction: "Model prediction",
  teamForm: "Team form",
  homeAwayPerformance: "Home/Away performance",
  leagueStandings: "League standings",
  headToHead: "Head-to-head",
  confirmedLineups: "Confirmed lineups",
  predictedLineups: "Predicted lineups",
  injuries: "Injuries and suspensions",
} as const;

export type AnalysisDataCoverage = {
  dataAvailable: string[];
  dataMissing: string[];
};

export function resolveDisplayDataQuality(input: {
  dataMissing: string[];
  predictionDataQuality: "COMPLETE" | "PARTIAL";
}): "COMPLETE" | "PARTIAL" {
  if (
    input.dataMissing.length > 0 ||
    input.predictionDataQuality === "PARTIAL"
  ) {
    return "PARTIAL";
  }

  return "COMPLETE";
}

/** Deterministic coverage for AI analysis UI (analytical inputs only). */
export function buildDataCoverage(input: {
  supportsStandings: boolean;
  hasStandings: boolean;
  hasFormAll: boolean;
  hasFormHomeAway: boolean;
  hasH2h: boolean;
  lineupsState: LineupsContextState;
  hasSidelined: boolean;
}): AnalysisDataCoverage {
  const dataAvailable: string[] = [ANALYSIS_DATA_LABELS.modelPrediction];
  const dataMissing: string[] = [];

  if (input.hasFormAll) {
    dataAvailable.push(ANALYSIS_DATA_LABELS.teamForm);
  } else {
    dataMissing.push(ANALYSIS_DATA_LABELS.teamForm);
  }

  if (input.hasFormHomeAway) {
    dataAvailable.push(ANALYSIS_DATA_LABELS.homeAwayPerformance);
  } else {
    dataMissing.push(ANALYSIS_DATA_LABELS.homeAwayPerformance);
  }

  if (input.supportsStandings) {
    if (input.hasStandings) {
      dataAvailable.push(ANALYSIS_DATA_LABELS.leagueStandings);
    } else {
      dataMissing.push(ANALYSIS_DATA_LABELS.leagueStandings);
    }
  }

  if (input.hasH2h) {
    dataAvailable.push(ANALYSIS_DATA_LABELS.headToHead);
  } else {
    dataMissing.push(ANALYSIS_DATA_LABELS.headToHead);
  }

  if (input.lineupsState === "CONFIRMED") {
    dataAvailable.push(ANALYSIS_DATA_LABELS.confirmedLineups);
  } else if (input.lineupsState === "PREDICTED") {
    dataAvailable.push(ANALYSIS_DATA_LABELS.predictedLineups);
    dataMissing.push(ANALYSIS_DATA_LABELS.confirmedLineups);
  } else {
    dataMissing.push(ANALYSIS_DATA_LABELS.confirmedLineups);
    dataMissing.push(ANALYSIS_DATA_LABELS.predictedLineups);
  }

  if (input.hasSidelined) {
    dataAvailable.push(ANALYSIS_DATA_LABELS.injuries);
  } else {
    dataMissing.push(ANALYSIS_DATA_LABELS.injuries);
  }

  return { dataAvailable, dataMissing };
}
