import type { ReactNode } from "react";

import { LeagueLink } from "@/components/common/LeagueLink";
import { cn } from "@/lib/utils";

type MatchMetaBarProps = {
  leagueExternalId: number;
  leagueName: string;
  leagueLogoUrl?: string | null;
  density?: "row" | "header";
  className?: string;
  leagueLinkClassName?: string;
  leagueLogoPriority?: boolean;
  trailing?: ReactNode;
};

export function MatchMetaBar({
  leagueExternalId,
  leagueName,
  leagueLogoUrl,
  density = "row",
  className,
  leagueLinkClassName,
  leagueLogoPriority = false,
  trailing,
}: MatchMetaBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2",
        className
      )}
    >
      <LeagueLink
        leagueExternalId={leagueExternalId}
        leagueName={leagueName}
        leagueLogoUrl={leagueLogoUrl}
        logoPriority={leagueLogoPriority}
        className={cn(
          "min-w-0",
          density === "row"
            ? "text-muted-foreground text-xs"
            : "text-sm sm:text-base",
          leagueLinkClassName
        )}
      />
      {trailing ? (
        <div className="flex shrink-0 items-center gap-2">{trailing}</div>
      ) : null}
    </div>
  );
}
