import { formatWinProbability } from "@/lib/ai/format";
import type { AIInsightPayload } from "@/lib/ai/schemas";
import type { TeamRef } from "@/types/domain";

import { cn } from "@/lib/utils";

type WinProbabilitiesBarProps = {
  probabilities: AIInsightPayload["winProbabilities"];
  winOutcome: AIInsightPayload["winOutcome"];
  homeTeam: Pick<TeamRef, "name" | "code">;
  awayTeam: Pick<TeamRef, "name" | "code">;
  className?: string;
};

function segmentClass(isHighlighted: boolean): string {
  return cn(
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-3 text-center transition-colors",
    isHighlighted ? "bg-primary/15 ring-primary/30 ring-1" : "bg-muted/40"
  );
}

export function WinProbabilitiesBar({
  probabilities,
  winOutcome,
  homeTeam,
  awayTeam,
  className,
}: WinProbabilitiesBarProps) {
  const segments = [
    {
      key: "1" as const,
      label: homeTeam.code ?? "Home",
      value: probabilities.home,
    },
    {
      key: "X" as const,
      label: "Draw",
      value: probabilities.draw,
    },
    {
      key: "2" as const,
      label: awayTeam.code ?? "Away",
      value: probabilities.away,
    },
  ];

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {segments.map((segment) => (
        <div
          key={segment.key}
          className={segmentClass(winOutcome === segment.key)}
        >
          <span className="text-muted-foreground truncate text-xs">
            {segment.label}
          </span>
          <span className="font-heading text-lg font-semibold tabular-nums">
            {formatWinProbability(segment.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
