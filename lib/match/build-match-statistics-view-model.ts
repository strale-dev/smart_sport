import type {
  Fixture,
  FixturePlayerPerformance,
  FixtureTeamStatistics,
} from "@/types/domain";

export type PlayerDerivedTeamStats = {
  tacklesTotal: number | null;
  duelsTotal: number | null;
  averageRating: number | null;
};

export type MatchStatisticsTeamDerived = {
  home: PlayerDerivedTeamStats;
  away: PlayerDerivedTeamStats;
};

export type MatchStatDisplayRow = {
  id: string;
  label: string;
  homeDisplay: string;
  awayDisplay: string;
  homeNumeric: number | null;
  awayNumeric: number | null;
  preferLower: boolean;
  homeBarPercent: number;
};

export type MatchStatSection = {
  title: string;
  rows: MatchStatDisplayRow[];
};

type StatValuePair = {
  home: number | null;
  away: number | null;
};

type StatRowDef = {
  id: string;
  label: string;
  values: StatValuePair;
  format: "integer" | "percent" | "decimal" | "distance";
  preferLower?: boolean;
};

function findTeamStats(
  stats: FixtureTeamStatistics[],
  teamExternalId: number
): FixtureTeamStatistics | undefined {
  return stats.find((entry) => entry.teamExternalId === teamExternalId);
}

function sumNullable(values: Array<number | null | undefined>): number | null {
  let total = 0;
  let hasValue = false;

  for (const value of values) {
    if (value == null) {
      continue;
    }

    total += value;
    hasValue = true;
  }

  return hasValue ? total : null;
}

function meanNullable(values: Array<number | null | undefined>): number | null {
  let total = 0;
  let count = 0;

  for (const value of values) {
    if (value == null) {
      continue;
    }

    total += value;
    count += 1;
  }

  return count > 0 ? total / count : null;
}

export function aggregatePlayerDerivedStats(
  performances: FixturePlayerPerformance[],
  homeTeamId: number,
  awayTeamId: number
): MatchStatisticsTeamDerived {
  const homePlayers = performances.filter(
    (p) => p.teamExternalId === homeTeamId
  );
  const awayPlayers = performances.filter(
    (p) => p.teamExternalId === awayTeamId
  );

  return {
    home: {
      tacklesTotal: sumNullable(homePlayers.map((p) => p.tacklesTotal)),
      duelsTotal: sumNullable(homePlayers.map((p) => p.duelsTotal)),
      averageRating: meanNullable(homePlayers.map((p) => p.rating)),
    },
    away: {
      tacklesTotal: sumNullable(awayPlayers.map((p) => p.tacklesTotal)),
      duelsTotal: sumNullable(awayPlayers.map((p) => p.duelsTotal)),
      averageRating: meanNullable(awayPlayers.map((p) => p.rating)),
    },
  };
}

function formatDisplayValue(
  value: number | null,
  format: StatRowDef["format"]
): string {
  if (value == null) {
    return "–";
  }

  switch (format) {
    case "percent":
      return `${Math.round(value)}%`;
    case "decimal":
      return value.toFixed(1);
    case "distance":
      return `${value.toFixed(1)} km`;
    default:
      return String(Math.round(value));
  }
}

export function computeHomeBarPercent(
  home: number | null,
  away: number | null
): number {
  const homeVal = home ?? 0;
  const awayVal = away ?? 0;
  const total = homeVal + awayVal;

  if (total <= 0) {
    return 50;
  }

  return (homeVal / total) * 100;
}

function rowIsVisible(values: StatValuePair): boolean {
  return values.home != null || values.away != null;
}

function buildRow(def: StatRowDef): MatchStatDisplayRow | null {
  if (!rowIsVisible(def.values)) {
    return null;
  }

  return {
    id: def.id,
    label: def.label,
    homeDisplay: formatDisplayValue(def.values.home, def.format),
    awayDisplay: formatDisplayValue(def.values.away, def.format),
    homeNumeric: def.values.home,
    awayNumeric: def.values.away,
    preferLower: def.preferLower ?? false,
    homeBarPercent: computeHomeBarPercent(def.values.home, def.values.away),
  };
}

function buildSection(
  title: string,
  defs: StatRowDef[]
): MatchStatSection | null {
  const rows = defs
    .map((def) => buildRow(def))
    .filter((row): row is MatchStatDisplayRow => row != null);

  if (rows.length === 0) {
    return null;
  }

  return { title, rows };
}

export function buildMatchStatisticsViewModel(
  fixture: Fixture,
  stats: FixtureTeamStatistics[],
  playerDerived: MatchStatisticsTeamDerived
): MatchStatSection[] {
  const homeId = fixture.homeTeam.externalId;
  const awayId = fixture.awayTeam.externalId;
  const homeStats = findTeamStats(stats, homeId);
  const awayStats = findTeamStats(stats, awayId);

  const pair = (
    home: number | null | undefined,
    away: number | null | undefined
  ): StatValuePair => ({
    home: home ?? null,
    away: away ?? null,
  });

  const sections = [
    buildSection("Possession & physical", [
      {
        id: "ballPossession",
        label: "Ball possession",
        values: pair(homeStats?.ballPossession, awayStats?.ballPossession),
        format: "percent",
      },
      {
        id: "distanceCovered",
        label: "Distance covered",
        values: pair(homeStats?.distanceCovered, awayStats?.distanceCovered),
        format: "distance",
      },
    ]),
    buildSection("Attacking", [
      {
        id: "expectedGoals",
        label: "Expected Goals",
        values: pair(homeStats?.expectedGoals, awayStats?.expectedGoals),
        format: "decimal",
      },
      {
        id: "bigChances",
        label: "Big chances",
        values: pair(homeStats?.bigChances, awayStats?.bigChances),
        format: "integer",
      },
      {
        id: "totalShots",
        label: "Total shots",
        values: pair(homeStats?.shotsTotal, awayStats?.shotsTotal),
        format: "integer",
      },
      {
        id: "shotsOnTarget",
        label: "Shots on target",
        values: pair(homeStats?.shotsOnTarget, awayStats?.shotsOnTarget),
        format: "integer",
      },
      {
        id: "goalkeeperSaves",
        label: "Goalkeeper saves",
        values: pair(homeStats?.goalkeeperSaves, awayStats?.goalkeeperSaves),
        format: "integer",
      },
    ]),
    buildSection("Passing / set pieces", [
      {
        id: "cornerKicks",
        label: "Corner kicks",
        values: pair(homeStats?.corners, awayStats?.corners),
        format: "integer",
      },
      {
        id: "passes",
        label: "Passes",
        values: pair(homeStats?.totalPasses, awayStats?.totalPasses),
        format: "integer",
      },
      {
        id: "freeKicks",
        label: "Free kicks",
        values: pair(homeStats?.freeKicks, awayStats?.freeKicks),
        format: "integer",
      },
    ]),
    buildSection("Defensive", [
      {
        id: "tackles",
        label: "Tackles",
        values: pair(
          playerDerived.home.tacklesTotal,
          playerDerived.away.tacklesTotal
        ),
        format: "integer",
      },
      {
        id: "duels",
        label: "Duels",
        values: pair(
          playerDerived.home.duelsTotal,
          playerDerived.away.duelsTotal
        ),
        format: "integer",
      },
    ]),
    buildSection("Discipline", [
      {
        id: "fouls",
        label: "Fouls",
        values: pair(homeStats?.fouls, awayStats?.fouls),
        format: "integer",
        preferLower: true,
      },
      {
        id: "yellowCards",
        label: "Yellow cards",
        values: pair(homeStats?.yellowCards, awayStats?.yellowCards),
        format: "integer",
        preferLower: true,
      },
      {
        id: "redCards",
        label: "Red cards",
        values: pair(homeStats?.redCards, awayStats?.redCards),
        format: "integer",
        preferLower: true,
      },
    ]),
    buildSection("Rating", [
      {
        id: "averageRating",
        label: "Average rating",
        values: pair(
          playerDerived.home.averageRating,
          playerDerived.away.averageRating
        ),
        format: "decimal",
      },
    ]),
  ];

  return sections.filter(
    (section): section is MatchStatSection => section != null
  );
}
