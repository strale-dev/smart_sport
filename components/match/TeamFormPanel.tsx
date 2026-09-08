"use client";

import { EmptyState } from "@/components/common/EmptyState";
import { useViewerTimezone } from "@/components/providers/ViewerTimezoneProvider";
import { Badge } from "@/components/ui/badge";
import { formatFixtureKickoffDateTime } from "@/lib/fixtures/display";
import type { FormSnapshot } from "@/types/domain";
import { TrendingUpIcon } from "lucide-react";

function resultVariant(result: "W" | "D" | "L") {
  switch (result) {
    case "W":
      return "default" as const;
    case "D":
      return "secondary" as const;
    case "L":
      return "outline" as const;
  }
}

type TeamFormPanelProps = {
  teamName: string;
  form5: FormSnapshot;
  form10: FormSnapshot;
  matchCount: 5 | 10;
};

export function TeamFormPanel({
  teamName,
  form5,
  form10,
  matchCount,
}: TeamFormPanelProps) {
  const timeZone = useViewerTimezone();
  const form = matchCount === 5 ? form5 : form10;

  if (form.results.length === 0) {
    return (
      <EmptyState
        icon={TrendingUpIcon}
        title={`No recent form for ${teamName}`}
        description="Finished matches will populate this section."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {form.results.map((entry) => (
          <Badge
            key={entry.fixtureExternalId}
            variant={resultVariant(entry.result)}
          >
            {entry.result}
          </Badge>
        ))}
      </div>
      <div className="text-muted-foreground grid grid-cols-3 gap-3 text-center text-xs">
        <div>
          <p className="text-foreground font-mono text-lg tabular-nums">
            {form.wins}
          </p>
          <p>Wins</p>
        </div>
        <div>
          <p className="text-foreground font-mono text-lg tabular-nums">
            {form.draws}
          </p>
          <p>Draws</p>
        </div>
        <div>
          <p className="text-foreground font-mono text-lg tabular-nums">
            {form.losses}
          </p>
          <p>Losses</p>
        </div>
      </div>
      <div className="space-y-2">
        {form.results.map((entry) => (
          <div
            key={`${entry.fixtureExternalId}-row`}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="min-w-0 truncate">
              {entry.isHome ? "vs" : "@"} {entry.opponentName}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs">
              {formatFixtureKickoffDateTime(entry.kickoffAt, timeZone)}
            </span>
            <span className="font-mono tabular-nums">
              {entry.goalsFor}-{entry.goalsAgainst}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
