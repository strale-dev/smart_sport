"use client";

import { LineupPitchPlayer } from "@/components/match/lineups/LineupPitchPlayer";
import { PitchMarkings } from "@/components/match/lineups/PitchMarkings";
import {
  resolveTeamPitchPositions,
  type PitchLayout,
} from "@/lib/lineups/pitch-coordinates";
import type { LineupTeamViewModel } from "@/lib/lineups/types";
import { cn } from "@/lib/utils";

type LineupPitchProps = {
  home: LineupTeamViewModel | null;
  away: LineupTeamViewModel | null;
  layout: "split" | "full";
  fullSide?: "home" | "away";
  compact?: boolean;
  showMatchBadges?: boolean;
};

function placedForTeam(
  team: LineupTeamViewModel | null,
  pitchLayout: PitchLayout
) {
  if (!team) {
    return [];
  }
  return resolveTeamPitchPositions(team.starters, team.formation, pitchLayout);
}

export function LineupPitch({
  home,
  away,
  layout,
  fullSide = "home",
  compact = false,
  showMatchBadges = true,
}: LineupPitchProps) {
  const isSplit = layout === "split";

  const homePlaced = isSplit
    ? placedForTeam(home, "homeHalf")
    : fullSide === "home"
      ? placedForTeam(home, "fullAttackingUp")
      : [];
  const awayPlaced = isSplit
    ? placedForTeam(away, "awayHalf")
    : fullSide === "away"
      ? placedForTeam(away, "fullAttackingUp")
      : [];

  return (
    <div
      className={cn(
        "border-border/80 relative w-full max-w-full overflow-hidden rounded-xl border",
        "bg-[oklch(0.22_0.04_155)] shadow-inner",
        compact ? "aspect-[68/90]" : "aspect-[68/105]"
      )}
    >
      <PitchMarkings className="absolute inset-0 h-full w-full text-emerald-100/35" />
      <div className="absolute inset-0">
        {homePlaced.map(({ player, point }, index) => (
          <LineupPitchPlayer
            key={`home-${player.playerExternalId ?? player.name}-${index}`}
            player={player}
            point={point}
            side="home"
            compact={compact}
            showMatchBadges={showMatchBadges}
          />
        ))}
        {awayPlaced.map(({ player, point }, index) => (
          <LineupPitchPlayer
            key={`away-${player.playerExternalId ?? player.name}-${index}`}
            player={player}
            point={point}
            side="away"
            compact={compact}
            showMatchBadges={showMatchBadges}
          />
        ))}
      </div>
    </div>
  );
}
