"use client";

import Link from "next/link";

import { PlayerPhoto } from "@/components/player/PlayerPhoto";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRating } from "@/lib/lineups/rating-badge";
import { lineupPlayerShortName } from "@/lib/lineups/player-name";
import type { PitchPoint } from "@/lib/lineups/pitch-coordinates";
import type { LineupDisplayPlayer } from "@/lib/lineups/types";
import { cn } from "@/lib/utils";

type LineupPitchPlayerProps = {
  player: LineupDisplayPlayer;
  point: PitchPoint;
  side: "home" | "away";
  compact?: boolean;
  showMatchBadges?: boolean;
};

function PlayerTooltipBody({ player }: { player: LineupDisplayPlayer }) {
  const rating = formatRating(player.rating);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium">{player.name}</span>
      <span className="text-background/80">
        {[
          player.shirtNumber != null ? `#${player.shirtNumber}` : null,
          player.position,
          rating ? `Rating ${rating}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </div>
  );
}

export function LineupPitchPlayer({
  player,
  point,
  side,
  compact = false,
  showMatchBadges = true,
}: LineupPitchPlayerProps) {
  const shortName = lineupPlayerShortName(player.name);
  const numberLabel =
    player.shirtNumber != null ? String(player.shirtNumber) : "–";
  const discSize = compact ? "size-7 text-[11px]" : "size-8 text-xs";

  const marker = (
    <div
      className={cn(
        "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5",
        compact ? "max-w-[3.25rem]" : "max-w-[3.75rem]"
      )}
      style={{ left: `${point.x}%`, top: `${point.y}%` }}
    >
      <div className="relative flex flex-col items-center">
        {player.photoUrl ? (
          <PlayerPhoto
            name={player.name}
            photoUrl={player.photoUrl}
            className={cn(
              compact ? "size-7" : "size-8",
              "border-background border-2 shadow-sm"
            )}
          />
        ) : (
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full border-2 font-bold tabular-nums shadow-sm",
              discSize,
              side === "home"
                ? "bg-foreground text-background border-background"
                : "bg-primary text-primary-foreground border-primary/30"
            )}
          >
            {numberLabel}
          </span>
        )}
        {player.photoUrl ? (
          <span
            className={cn(
              "absolute -bottom-1 left-1/2 -translate-x-1/2 rounded px-1 py-px font-mono text-[9px] font-bold tabular-nums",
              side === "home"
                ? "bg-foreground text-background"
                : "bg-primary text-primary-foreground"
            )}
          >
            {numberLabel}
          </span>
        ) : null}
        {player.isCaptain ? (
          <span className="bg-background text-foreground absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full border text-[8px] font-bold">
            C
          </span>
        ) : null}
        {showMatchBadges && player.matchBadges.goals > 0 ? (
          <span className="absolute -bottom-1 -left-1 flex size-3.5 items-center justify-center rounded-full bg-emerald-600 text-[8px] font-bold text-white">
            {player.matchBadges.goals}
          </span>
        ) : null}
        {showMatchBadges && player.matchBadges.assists > 0 ? (
          <span className="absolute -top-1 -left-1 flex size-3.5 items-center justify-center rounded-full bg-sky-600 text-[8px] font-bold text-white">
            A
          </span>
        ) : null}
      </div>
      <span
        className={cn(
          "bg-background/90 text-foreground w-full truncate rounded px-0.5 text-center leading-tight font-medium",
          compact ? "text-[10px]" : "text-[11px]"
        )}
      >
        {shortName}
      </span>
    </div>
  );

  const triggerClassName =
    "focus-visible:ring-ring/50 inline-flex cursor-default border-0 bg-transparent p-0 outline-none focus-visible:ring-[3px]";

  return (
    <Tooltip>
      {player.playerExternalId ? (
        <TooltipTrigger
          render={
            <Link
              href={`/players/${player.playerExternalId}`}
              className={triggerClassName}
            />
          }
        >
          {marker}
        </TooltipTrigger>
      ) : (
        <TooltipTrigger
          render={<button type="button" className={triggerClassName} />}
        >
          {marker}
        </TooltipTrigger>
      )}
      <TooltipContent side="top">
        <PlayerTooltipBody player={player} />
      </TooltipContent>
    </Tooltip>
  );
}
