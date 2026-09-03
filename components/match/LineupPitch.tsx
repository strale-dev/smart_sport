import Link from "next/link";

import { gridToSvgPercent, parseLineupGrid } from "@/lib/lineups/grid";
import { cn } from "@/lib/utils";
import type { LineupPlayer } from "@/types/domain";

type LineupPitchProps = {
  players: LineupPlayer[];
  teamName: string;
  side: "home" | "away";
};

function PlayerNode({
  player,
  side,
}: {
  player: LineupPlayer;
  side: "home" | "away";
}) {
  const position = parseLineupGrid(player.grid);
  const fallback = {
    x: side === "home" ? 50 : 50,
    y: 50,
  };
  const coords = position ? gridToSvgPercent(position) : fallback;

  const content = (
    <div
      className={cn(
        "absolute flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 text-center",
        side === "away" && "rotate-180"
      )}
      style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
    >
      <span className="bg-background/90 border-border/70 flex size-7 items-center justify-center rounded-full border text-[10px] font-semibold">
        {player.shirtNumber ?? "?"}
      </span>
      <span
        className={cn(
          "bg-background/80 max-w-16 truncate rounded px-1 text-[9px] leading-tight",
          side === "away" && "rotate-180"
        )}
      >
        {player.name.split(" ").pop()}
      </span>
    </div>
  );

  if (player.playerExternalId) {
    return (
      <Link
        href={`/players/${player.playerExternalId}`}
        className="focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export function LineupPitch({ players, teamName, side }: LineupPitchProps) {
  const starters = players.filter((player) => player.isStarting);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{teamName}</p>
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-emerald-900/40 bg-emerald-950/40">
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <rect
            x="2"
            y="2"
            width="96"
            height="96"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.25"
          />
          <line
            x1="2"
            y1="50"
            x2="98"
            y2="50"
            stroke="currentColor"
            strokeOpacity="0.25"
          />
          <circle
            cx="50"
            cy="50"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.25"
          />
          <rect
            x="26"
            y="2"
            width="48"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.2"
          />
          <rect
            x="26"
            y="82"
            width="48"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.2"
          />
        </svg>
        <div
          className={cn("absolute inset-0", side === "away" && "rotate-180")}
        >
          {starters.map((player, index) => (
            <PlayerNode
              key={`${player.playerExternalId ?? player.name}-${index}`}
              player={player}
              side={side}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
