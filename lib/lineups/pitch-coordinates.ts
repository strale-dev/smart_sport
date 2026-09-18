import { parseLineupGrid } from "@/lib/lineups/grid";
import type { LineupDisplayPlayer } from "@/lib/lineups/types";

export type PitchLayout = "homeHalf" | "awayHalf" | "fullAttackingUp";

export type PitchPoint = { x: number; y: number };

export type PlacedPitchPlayer = {
  player: LineupDisplayPlayer;
  point: PitchPoint;
};

const PAD_X = 12;
const PAD_Y_HALF = 6;
const PAD_Y_FULL = 8;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function spreadX(index: number, count: number): number {
  if (count <= 0) {
    return 50;
  }
  if (count === 1) {
    return 50;
  }
  return lerp(PAD_X, 100 - PAD_X, (index + 0.5) / count);
}

function rowToY(row: number, maxRow: number, layout: PitchLayout): number {
  const t = maxRow <= 1 ? 0.5 : (row - 1) / (maxRow - 1);

  if (layout === "homeHalf") {
    return lerp(PAD_Y_HALF, 50 - PAD_Y_HALF, t);
  }
  if (layout === "awayHalf") {
    return lerp(100 - PAD_Y_HALF, 50 + PAD_Y_HALF, t);
  }
  return lerp(100 - PAD_Y_FULL, PAD_Y_FULL, t);
}

function parseFormationLines(formation: string | null): number[] | null {
  if (!formation) {
    return null;
  }
  const parts = formation
    .split("-")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (parts.length === 0) {
    return null;
  }
  return parts;
}

function hasMajorityGrids(starters: LineupDisplayPlayer[]): boolean {
  if (starters.length === 0) {
    return false;
  }
  const withGrid = starters.filter(
    (p) => parseLineupGrid(p.grid) != null
  ).length;
  return withGrid >= Math.ceil(starters.length / 2);
}

type RowAssignment = {
  player: LineupDisplayPlayer;
  row: number;
  colOrder: number;
};

function assignFromGrid(starters: LineupDisplayPlayer[]): RowAssignment[] {
  const byRow = new Map<number, LineupDisplayPlayer[]>();

  for (const player of starters) {
    const grid = parseLineupGrid(player.grid);
    if (!grid) {
      continue;
    }
    const list = byRow.get(grid.row) ?? [];
    list.push(player);
    byRow.set(grid.row, list);
  }

  const assignments: RowAssignment[] = [];
  const rows = [...byRow.keys()].sort((a, b) => a - b);

  for (const row of rows) {
    const players = byRow.get(row) ?? [];
    players.sort((a, b) => {
      const ga = parseLineupGrid(a.grid);
      const gb = parseLineupGrid(b.grid);
      return (ga?.col ?? 0) - (gb?.col ?? 0);
    });
    players.forEach((player, index) => {
      assignments.push({ player, row, colOrder: index });
    });
  }

  return assignments;
}

function assignFromFormation(
  starters: LineupDisplayPlayer[],
  formation: string | null
): RowAssignment[] | null {
  const lines = parseFormationLines(formation);
  if (!lines) {
    return null;
  }

  const remaining = [...starters];
  const assignments: RowAssignment[] = [];
  let row = 1;

  const gkIndex = remaining.findIndex((p) => p.position === "G");
  if (gkIndex >= 0) {
    const [gk] = remaining.splice(gkIndex, 1);
    assignments.push({ player: gk, row, colOrder: 0 });
    row += 1;
  }

  for (const lineCount of lines) {
    const linePlayers = remaining.splice(0, lineCount);
    linePlayers.forEach((player, index) => {
      assignments.push({ player, row, colOrder: index });
    });
    row += 1;
  }

  for (const player of remaining) {
    assignments.push({ player, row: row - 1, colOrder: assignments.length });
  }

  return assignments;
}

const POSITION_BAND: Record<string, number> = {
  G: 1,
  D: 2,
  M: 3,
  F: 4,
};

function assignFromPositionBands(
  starters: LineupDisplayPlayer[]
): RowAssignment[] {
  const byBand = new Map<number, LineupDisplayPlayer[]>();

  for (const player of starters) {
    const band = POSITION_BAND[player.position ?? ""] ?? 3;
    const list = byBand.get(band) ?? [];
    list.push(player);
    byBand.set(band, list);
  }

  const assignments: RowAssignment[] = [];
  const bands = [...byBand.keys()].sort((a, b) => a - b);

  for (const band of bands) {
    const players = byBand.get(band) ?? [];
    players.forEach((player, index) => {
      assignments.push({ player, row: band, colOrder: index });
    });
  }

  return assignments;
}

function resolveRowAssignments(
  starters: LineupDisplayPlayer[],
  formation: string | null
): RowAssignment[] {
  if (hasMajorityGrids(starters)) {
    const fromGrid = assignFromGrid(starters);
    const assigned = new Set(fromGrid.map((a) => a.player));
    const missing = starters.filter((p) => !assigned.has(p));
    if (missing.length === 0) {
      return fromGrid;
    }
    const fallback =
      assignFromFormation(missing, formation) ??
      assignFromPositionBands(missing);
    const maxRow = Math.max(
      ...fromGrid.map((a) => a.row),
      ...fallback.map((a) => a.row),
      1
    );
    return [
      ...fromGrid,
      ...fallback.map((a) => ({ ...a, row: a.row + maxRow })),
    ];
  }

  return (
    assignFromFormation(starters, formation) ??
    assignFromPositionBands(starters)
  );
}

function nudgeCollisions(points: Map<LineupDisplayPlayer, PitchPoint>): void {
  const entries = [...points.entries()];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const [, a] = entries[i];
      const [, b] = entries[j];
      if (Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5) {
        b.x += 2;
        b.y += 1;
      }
    }
  }
}

export function resolveTeamPitchPositions(
  starters: LineupDisplayPlayer[],
  formation: string | null,
  layout: PitchLayout
): PlacedPitchPlayer[] {
  if (starters.length === 0) {
    return [];
  }

  const assignments = resolveRowAssignments(starters, formation);
  const maxRow = Math.max(...assignments.map((a) => a.row), 1);

  const rowGroups = new Map<number, RowAssignment[]>();
  for (const assignment of assignments) {
    const list = rowGroups.get(assignment.row) ?? [];
    list.push(assignment);
    rowGroups.set(assignment.row, list);
  }

  const pointMap = new Map<LineupDisplayPlayer, PitchPoint>();

  for (const [row, group] of rowGroups) {
    group.sort((a, b) => a.colOrder - b.colOrder);
    const count = group.length;
    group.forEach((assignment, index) => {
      pointMap.set(assignment.player, {
        x: spreadX(index, count),
        y: rowToY(row, maxRow, layout),
      });
    });
  }

  nudgeCollisions(pointMap);

  return starters
    .filter((player) => pointMap.has(player))
    .map((player) => ({
      player,
      point: pointMap.get(player)!,
    }));
}
