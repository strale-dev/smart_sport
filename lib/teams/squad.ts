import type { PlayerPosition, SquadPlayer } from "@/types/domain";

export const SQUAD_POSITION_ORDER: PlayerPosition[] = ["GK", "DF", "MF", "FW"];

export const SQUAD_POSITION_LABELS: Record<PlayerPosition, string> = {
  GK: "Goalkeepers",
  DF: "Defenders",
  MF: "Midfielders",
  FW: "Forwards",
};

export type SquadPositionGroupKey = PlayerPosition | "OTHER";

export function groupSquadByPosition(
  players: SquadPlayer[]
): Map<SquadPositionGroupKey, SquadPlayer[]> {
  const groups = new Map<SquadPositionGroupKey, SquadPlayer[]>();

  for (const player of players) {
    const key: SquadPositionGroupKey = player.position ?? "OTHER";
    const list = groups.get(key) ?? [];
    list.push(player);
    groups.set(key, list);
  }

  for (const list of groups.values()) {
    list.sort((left, right) => {
      const leftNumber = left.shirtNumber ?? Number.MAX_SAFE_INTEGER;
      const rightNumber = right.shirtNumber ?? Number.MAX_SAFE_INTEGER;
      return leftNumber - rightNumber || left.name.localeCompare(right.name);
    });
  }

  return groups;
}

export function orderedSquadPositionKeys(
  groups: Map<SquadPositionGroupKey, SquadPlayer[]>
): SquadPositionGroupKey[] {
  return [
    ...SQUAD_POSITION_ORDER.filter((position) => groups.has(position)),
    ...(groups.has("OTHER") ? (["OTHER"] as const) : []),
  ];
}
