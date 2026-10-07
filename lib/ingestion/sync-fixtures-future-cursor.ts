import { addUtcDays } from "@/lib/fixtures/window";

export type SyncFixturesFutureDateScanCursor = {
  phase: "date_scan";
  nextUtcDate: string;
  anchorUtcDate: string;
  horizonDays: number;
};

export type SyncFixturesFutureLeagueSeasonCursor = {
  phase: "league_season";
  leagueProviderIds: number[];
  nextIndex: number;
  anchorUtcDate: string;
  horizonDays: number;
};

export type SyncFixturesFutureCheckpoint =
  SyncFixturesFutureDateScanCursor | SyncFixturesFutureLeagueSeasonCursor;

export function parseSyncFixturesFutureCheckpoint(
  raw: Record<string, unknown> | null,
  today: string,
  horizonDays: number
): SyncFixturesFutureCheckpoint | null {
  if (!raw) {
    return null;
  }

  const anchorUtcDate = raw.anchorUtcDate;
  const storedHorizon = raw.horizonDays;
  if (
    anchorUtcDate !== today ||
    storedHorizon !== horizonDays ||
    typeof raw.phase !== "string"
  ) {
    return null;
  }

  if (raw.phase === "date_scan" && typeof raw.nextUtcDate === "string") {
    return {
      phase: "date_scan",
      nextUtcDate: raw.nextUtcDate,
      anchorUtcDate: today,
      horizonDays,
    };
  }

  if (
    raw.phase === "league_season" &&
    typeof raw.nextIndex === "number" &&
    Array.isArray(raw.leagueProviderIds) &&
    raw.leagueProviderIds.every((id) => typeof id === "number")
  ) {
    return {
      phase: "league_season",
      leagueProviderIds: raw.leagueProviderIds as number[],
      nextIndex: raw.nextIndex,
      anchorUtcDate: today,
      horizonDays,
    };
  }

  return null;
}

export function dateScanEndExclusive(
  anchorUtcDate: string,
  horizonDays: number
): string {
  return addUtcDays(anchorUtcDate, horizonDays + 1);
}

export function initialDateScanCursor(
  today: string,
  horizonDays: number
): SyncFixturesFutureDateScanCursor {
  return {
    phase: "date_scan",
    nextUtcDate: today,
    anchorUtcDate: today,
    horizonDays,
  };
}

export function leagueSeasonCursor(
  today: string,
  horizonDays: number,
  leagueProviderIds: readonly number[]
): SyncFixturesFutureLeagueSeasonCursor {
  return {
    phase: "league_season",
    leagueProviderIds: [...leagueProviderIds],
    nextIndex: 0,
    anchorUtcDate: today,
    horizonDays,
  };
}

/** Next UTC date to scan, or null if date_scan phase is complete. */
export function resolveDateScanStart(
  checkpoint: SyncFixturesFutureCheckpoint | null,
  today: string,
  horizonDays: number
): {
  phase: "date_scan" | "league_season";
  startUtcDate: string | null;
  leagueSeasonIndex: number;
  leagueProviderIds: number[];
} {
  const endExclusive = dateScanEndExclusive(today, horizonDays);

  if (!checkpoint) {
    return {
      phase: "date_scan",
      startUtcDate: today,
      leagueSeasonIndex: 0,
      leagueProviderIds: [],
    };
  }

  if (checkpoint.phase === "league_season") {
    return {
      phase: "league_season",
      startUtcDate: null,
      leagueSeasonIndex: checkpoint.nextIndex,
      leagueProviderIds: checkpoint.leagueProviderIds,
    };
  }

  if (checkpoint.nextUtcDate >= endExclusive) {
    return {
      phase: "league_season",
      startUtcDate: null,
      leagueSeasonIndex: 0,
      leagueProviderIds: [],
    };
  }

  const start =
    checkpoint.nextUtcDate >= today && checkpoint.nextUtcDate < endExclusive
      ? checkpoint.nextUtcDate
      : today;

  return {
    phase: "date_scan",
    startUtcDate: start,
    leagueSeasonIndex: 0,
    leagueProviderIds: [],
  };
}

export function isUtcDateBeforeEnd(
  utcDate: string,
  endExclusive: string
): boolean {
  return utcDate < endExclusive;
}
