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

export function gridToSvgPercent(
  position: GridPosition,
  maxRow = 5,
  maxCol = 5
): { x: number; y: number } {
  const x = ((position.col - 0.5) / maxCol) * 100;
  const y = ((position.row - 0.5) / maxRow) * 100;
  return { x, y };
}
