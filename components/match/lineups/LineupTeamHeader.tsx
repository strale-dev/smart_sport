import { TeamLogo } from "@/components/match/TeamLogo";
import type { LineupTeamViewModel } from "@/lib/lineups/types";

type LineupTeamHeaderProps = {
  team: LineupTeamViewModel;
  showStarterCount?: boolean;
};

export function LineupTeamHeader({
  team,
  showStarterCount = true,
}: LineupTeamHeaderProps) {
  const starterCount = team.starters.length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <TeamLogo
          name={team.teamName}
          logoUrl={team.teamLogoUrl}
          className="size-7"
        />
        <h3 className="truncate text-sm font-semibold">{team.teamName}</h3>
      </div>
      <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-sm">
        {team.formation ? (
          <span className="font-mono tabular-nums">{team.formation}</span>
        ) : null}
        {showStarterCount && starterCount > 0 ? (
          <span className="text-xs">{starterCount}/11</span>
        ) : null}
      </div>
    </div>
  );
}
