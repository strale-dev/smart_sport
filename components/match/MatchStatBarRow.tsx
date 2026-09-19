import { cn } from "@/lib/utils";
import type { MatchStatDisplayRow } from "@/lib/match/build-match-statistics-view-model";

type MatchStatBarRowProps = {
  row: MatchStatDisplayRow;
  homeTeamName: string;
  awayTeamName: string;
};

function leads(
  home: number | null,
  away: number | null,
  preferLower: boolean
): { homeLeads: boolean; awayLeads: boolean } {
  if (home == null || away == null) {
    return { homeLeads: false, awayLeads: false };
  }

  if (home === away) {
    return { homeLeads: false, awayLeads: false };
  }

  if (preferLower) {
    return {
      homeLeads: home < away,
      awayLeads: away < home,
    };
  }

  return {
    homeLeads: home > away,
    awayLeads: away > home,
  };
}

export function MatchStatBarRow({
  row,
  homeTeamName,
  awayTeamName,
}: MatchStatBarRowProps) {
  const { homeLeads, awayLeads } = leads(
    row.homeNumeric,
    row.awayNumeric,
    row.preferLower
  );

  const ariaLabel = `${row.label}: ${homeTeamName} ${row.homeDisplay}, ${awayTeamName} ${row.awayDisplay}`;

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-sm sm:gap-3">
        <span
          className={cn(
            "min-w-0 truncate font-mono tabular-nums",
            homeLeads && "text-foreground font-semibold"
          )}
        >
          {row.homeDisplay}
        </span>
        <span className="text-muted-foreground max-w-[8rem] text-center text-xs leading-tight sm:max-w-none">
          {row.label}
        </span>
        <span
          className={cn(
            "min-w-0 truncate text-right font-mono tabular-nums",
            awayLeads && "text-foreground font-semibold"
          )}
        >
          {row.awayDisplay}
        </span>
      </div>
      <div
        className="bg-muted flex h-1.5 overflow-hidden rounded-full"
        aria-hidden="true"
      >
        <div
          className="bg-primary h-full transition-[width]"
          style={{ width: `${row.homeBarPercent}%` }}
        />
        <div
          className="bg-muted-foreground/40 h-full transition-[width]"
          style={{ width: `${100 - row.homeBarPercent}%` }}
        />
      </div>
    </div>
  );
}
