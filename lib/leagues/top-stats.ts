import type {
  LeaguePlayerLeaderboardRow,
  LeagueStatLeaderboard,
} from "@/types/domain";

export type LeaguePlayerStats = Omit<LeaguePlayerLeaderboardRow, "rank">;

type StatCategory = {
  id: string;
  label: string;
  getValue: (row: LeaguePlayerStats) => number | null;
  format?: (value: number) => string;
};

export const LEAGUE_STAT_CATEGORIES: StatCategory[] = [
  { id: "goals", label: "Goals", getValue: (row) => row.goals },
  { id: "assists", label: "Assists", getValue: (row) => row.assists },
  { id: "rating", label: "Rating", getValue: (row) => row.rating },
  { id: "shots", label: "Shots", getValue: (row) => row.shotsTotal },
  {
    id: "shots-on-target",
    label: "Shots on target",
    getValue: (row) => row.shotsOnTarget,
  },
  { id: "key-passes", label: "Key passes", getValue: (row) => row.keyPasses },
  { id: "passes", label: "Passes", getValue: (row) => row.passesTotal },
  { id: "tackles", label: "Tackles", getValue: (row) => row.tacklesTotal },
  {
    id: "interceptions",
    label: "Interceptions",
    getValue: (row) => row.interceptions,
  },
  {
    id: "dribbles",
    label: "Dribbles",
    getValue: (row) => row.dribblesSuccess,
  },
  { id: "saves", label: "Saves", getValue: (row) => row.saves },
  {
    id: "yellow-cards",
    label: "Yellow cards",
    getValue: (row) => row.yellowCards,
  },
  { id: "red-cards", label: "Red cards", getValue: (row) => row.redCards },
  { id: "minutes", label: "Minutes", getValue: (row) => row.minutes },
  {
    id: "appearances",
    label: "Appearances",
    getValue: (row) => row.appearances,
  },
  { id: "fouls", label: "Fouls", getValue: (row) => row.foulsCommitted },
];

type BuildLeagueStatLeaderboardsInput = {
  topScorers: LeaguePlayerLeaderboardRow[];
  topAssists: LeaguePlayerLeaderboardRow[];
  topYellowCards: LeaguePlayerLeaderboardRow[];
  topRedCards: LeaguePlayerLeaderboardRow[];
};

function pickHigher(left: number | null, right: number | null): number | null {
  if (left == null) {
    return right;
  }

  if (right == null) {
    return left;
  }

  return Math.max(left, right);
}

function mergePlayerStats(
  existing: LeaguePlayerStats,
  incoming: LeaguePlayerStats
): LeaguePlayerStats {
  return {
    player: existing.player,
    team: existing.team,
    goals: pickHigher(existing.goals, incoming.goals),
    assists: pickHigher(existing.assists, incoming.assists),
    appearances: pickHigher(existing.appearances, incoming.appearances),
    minutes: pickHigher(existing.minutes, incoming.minutes),
    rating: pickHigher(existing.rating, incoming.rating),
    shotsTotal: pickHigher(existing.shotsTotal, incoming.shotsTotal),
    shotsOnTarget: pickHigher(existing.shotsOnTarget, incoming.shotsOnTarget),
    keyPasses: pickHigher(existing.keyPasses, incoming.keyPasses),
    passesTotal: pickHigher(existing.passesTotal, incoming.passesTotal),
    tacklesTotal: pickHigher(existing.tacklesTotal, incoming.tacklesTotal),
    interceptions: pickHigher(existing.interceptions, incoming.interceptions),
    dribblesSuccess: pickHigher(
      existing.dribblesSuccess,
      incoming.dribblesSuccess
    ),
    yellowCards: pickHigher(existing.yellowCards, incoming.yellowCards),
    redCards: pickHigher(existing.redCards, incoming.redCards),
    saves: pickHigher(existing.saves, incoming.saves),
    foulsCommitted: pickHigher(
      existing.foulsCommitted,
      incoming.foulsCommitted
    ),
  };
}

function stripRank(row: LeaguePlayerLeaderboardRow): LeaguePlayerStats {
  const { rank: _rank, ...stats } = row;
  return stats;
}

function buildPool(lists: LeaguePlayerLeaderboardRow[][]): LeaguePlayerStats[] {
  const pool = new Map<number, LeaguePlayerStats>();

  for (const list of lists) {
    for (const row of list) {
      const stats = stripRank(row);
      const existing = pool.get(stats.player.externalId);

      pool.set(
        stats.player.externalId,
        existing ? mergePlayerStats(existing, stats) : stats
      );
    }
  }

  return [...pool.values()];
}

function rankFromApiList(
  list: LeaguePlayerLeaderboardRow[]
): LeaguePlayerLeaderboardRow[] {
  return list.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}

function rankFromPool(
  pool: LeaguePlayerStats[],
  getValue: (row: LeaguePlayerStats) => number | null,
  limit = 20
): LeaguePlayerLeaderboardRow[] {
  return pool
    .map((row) => ({ row, value: getValue(row) }))
    .filter(
      (entry): entry is { row: LeaguePlayerStats; value: number } =>
        entry.value != null && entry.value > 0
    )
    .sort((left, right) => right.value - left.value)
    .slice(0, limit)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry.row,
    }));
}

const API_AUTHORITATIVE: Record<
  string,
  keyof BuildLeagueStatLeaderboardsInput
> = {
  goals: "topScorers",
  assists: "topAssists",
  "yellow-cards": "topYellowCards",
  "red-cards": "topRedCards",
};

export function buildLeagueStatLeaderboards(
  input: BuildLeagueStatLeaderboardsInput
): LeagueStatLeaderboard[] {
  const pool = buildPool([
    input.topScorers,
    input.topAssists,
    input.topYellowCards,
    input.topRedCards,
  ]);

  return LEAGUE_STAT_CATEGORIES.flatMap((category) => {
    const apiKey = API_AUTHORITATIVE[category.id];

    if (apiKey) {
      const apiRows = rankFromApiList(input[apiKey]);

      if (apiRows.length > 0) {
        return [{ id: category.id, label: category.label, rows: apiRows }];
      }
    }

    const rows = rankFromPool(pool, category.getValue);

    if (rows.length === 0) {
      return [];
    }

    return [{ id: category.id, label: category.label, rows }];
  });
}

export function getLeaderboardStatValue(
  row: LeaguePlayerLeaderboardRow,
  categoryId: string
): number | string | null {
  const category = LEAGUE_STAT_CATEGORIES.find(
    (item) => item.id === categoryId
  );

  if (!category) {
    return null;
  }

  const value = category.getValue(row);

  if (value == null) {
    return null;
  }

  if (category.id === "rating") {
    return value.toFixed(2);
  }

  return value;
}
