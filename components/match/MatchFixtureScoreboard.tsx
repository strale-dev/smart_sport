"use client";

import Link from "next/link";

import { AnimatedScore } from "@/components/match/AnimatedScore";
import { TeamLogo } from "@/components/match/TeamLogo";
import { useViewerTimezone } from "@/components/providers/ViewerTimezoneProvider";
import { Badge } from "@/components/ui/badge";
import {
  formatFixtureRowCenterLabel,
  isFinishedFixtureStatus,
  shouldShowFixtureScore,
} from "@/lib/fixtures/display";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import { cn } from "@/lib/utils";
import type { Fixture } from "@/types/domain";

type MatchFixtureScoreboardProps = {
  fixture: Fixture;
  scoreClassName?: string;
  logoClassName?: string;
  linkTeams?: boolean;
  showHalftimeLine?: boolean;
  animateScore?: boolean;
  scheduledCenterVariant?: "badge" | "text";
  teamNameClassName?: string;
  teamLinkClassName?: string;
  scheduledKickoffClassName?: string;
  centerColumnClassName?: string;
  truncateTeamNames?: boolean;
  className?: string;
  logoPriority?: boolean;
  logoSizes?: string;
  /** When set, scheduled rows show date+time for kickoffs after this viewer day. */
  todayDateKey?: string;
};

const defaultTeamLinkClassName =
  "hover:bg-muted/40 focus-visible:ring-ring/50 flex min-w-0 items-center gap-2 rounded-xl p-1 transition-colors focus-visible:ring-[3px] focus-visible:outline-none";

export function MatchFixtureScoreboard({
  fixture,
  scoreClassName = "text-lg",
  logoClassName,
  linkTeams = true,
  showHalftimeLine = false,
  animateScore = false,
  scheduledCenterVariant = "badge",
  teamNameClassName = "text-sm font-medium",
  teamLinkClassName = defaultTeamLinkClassName,
  scheduledKickoffClassName,
  centerColumnClassName,
  truncateTeamNames = true,
  className,
  logoPriority = false,
  logoSizes,
  todayDateKey,
}: MatchFixtureScoreboardProps) {
  const timeZone = useViewerTimezone();
  const isLive = isLiveFixtureStatus(fixture.status);
  const isFinished = isFinishedFixtureStatus(fixture.status);
  const showScore = shouldShowFixtureScore(fixture);
  const scoreText = formatFixtureRowCenterLabel(
    fixture,
    timeZone,
    todayDateKey
  );

  const homeCell = (
    <>
      <TeamLogo
        name={fixture.homeTeam.name}
        logoUrl={fixture.homeTeam.logoUrl}
        className={logoClassName}
        priority={logoPriority}
        sizes={logoSizes}
      />
      <span
        title={fixture.homeTeam.name}
        className={cn(
          teamNameClassName,
          "min-w-0 flex-1 text-left",
          truncateTeamNames
            ? "truncate"
            : "max-sm:truncate sm:leading-snug sm:break-words sm:whitespace-normal"
        )}
      >
        {fixture.homeTeam.name}
      </span>
    </>
  );

  const awayCell = (
    <>
      <span
        title={fixture.awayTeam.name}
        className={cn(
          teamNameClassName,
          "min-w-0 flex-1 text-right",
          truncateTeamNames
            ? "truncate"
            : "max-sm:truncate sm:leading-snug sm:break-words sm:whitespace-normal"
        )}
      >
        {fixture.awayTeam.name}
      </span>
      <TeamLogo
        name={fixture.awayTeam.name}
        logoUrl={fixture.awayTeam.logoUrl}
        className={logoClassName}
        priority={logoPriority}
        sizes={logoSizes}
      />
    </>
  );

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3",
        className
      )}
    >
      {linkTeams ? (
        <Link
          href={`/teams/${fixture.homeTeam.externalId}`}
          className={cn(teamLinkClassName, "justify-start")}
        >
          {homeCell}
        </Link>
      ) : (
        <div className="flex min-w-0 items-center gap-2">{homeCell}</div>
      )}

      <div className={cn("shrink-0 px-2 text-center", centerColumnClassName)}>
        {showScore ? (
          <div className="space-y-0.5">
            <AnimatedScore
              score={scoreText}
              isLive={isLive}
              className={scoreClassName}
              animate={animateScore || isLive}
            />
            {showHalftimeLine &&
            isFinished &&
            fixture.score.halftimeHome != null &&
            fixture.score.halftimeAway != null ? (
              <p className="text-muted-foreground font-mono text-xs tabular-nums">
                HT {fixture.score.halftimeHome} – {fixture.score.halftimeAway}
              </p>
            ) : null}
          </div>
        ) : scheduledCenterVariant === "badge" ? (
          <Badge
            variant="outline"
            className={cn(
              "h-auto max-w-[10.5rem] font-mono text-xs font-semibold tabular-nums sm:max-w-none sm:text-sm",
              scoreText.includes(",") && "leading-snug whitespace-normal",
              scheduledKickoffClassName
            )}
          >
            {scoreText}
          </Badge>
        ) : (
          <p
            className={cn(
              "font-mono font-semibold tabular-nums",
              scoreClassName
            )}
          >
            {scoreText}
          </p>
        )}
      </div>

      {linkTeams ? (
        <Link
          href={`/teams/${fixture.awayTeam.externalId}`}
          className={cn(teamLinkClassName, "justify-end")}
        >
          {awayCell}
        </Link>
      ) : (
        <div className="flex min-w-0 items-center justify-end gap-2">
          {awayCell}
        </div>
      )}
    </div>
  );
}
