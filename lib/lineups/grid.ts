export type GridPosition = {
  row: number;
  col: number;
};

export function parseLineupGrid(grid: string | null): GridPosition | null {
  if (!grid) {
    return null;
  }

  const [rowRaw, colRaw] = grid.split(":");
  const row = Number.parseInt(rowRaw ?? "", 10);
  const col = Number.parseInt(colRaw ?? "", 10);

  if (!Number.isFinite(row) || !Number.isFinite(col)) {
    return null;
  }

  return { row, col };
}
