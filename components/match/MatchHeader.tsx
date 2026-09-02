import Link from "next/link";
import { MapPinIcon, UserIcon } from "lucide-react";

import { LiveDot } from "@/components/common/LiveDot";
import { TeamLogo } from "@/components/match/TeamLogo";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatFixtureKickoffDateTime,
  formatFixtureMinute,
  formatFixtureScore,
  isFinishedFixtureStatus,
} from "@/lib/fixtures/display";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import type { Fixture } from "@/types/domain";

type MatchHeaderProps = {
  fixture: Fixture;
};

function matchStatusLabel(fixture: Fixture): string {
  if (isLiveFixtureStatus(fixture.status)) {
    return formatFixtureMinute(fixture) ?? "Live";
  }

  if (isFinishedFixtureStatus(fixture.status)) {
    return "Full time";
  }

  return formatFixtureKickoffDateTime(fixture.kickoffAt);
}

function formatVenue(fixture: Fixture): string | null {
  if (!fixture.venue?.name) {
    return null;
  }

  if (fixture.venue.city) {
    return `${fixture.venue.name}, ${fixture.venue.city}`;
  }

  return fixture.venue.name;
}

export function MatchHeader({ fixture }: MatchHeaderProps) {
  const isLive = isLiveFixtureStatus(fixture.status);
  const isFinished = isFinishedFixtureStatus(fixture.status);
  const showScore = isLive || isFinished;
  const venueLabel = formatVenue(fixture);
  const statusLabel = matchStatusLabel(fixture);

  return (
    <Card className="w-full">
      <CardHeader className="gap-3 pb-3">
        <CardDescription className="flex flex-wrap items-center gap-2">
          {fixture.league.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fixture.league.logoUrl}
              alt=""
              className="size-4 object-contain"
              loading="lazy"
            />
          ) : null}
          <span>
            {fixture.league.name}
            {fixture.round ? ` · ${fixture.round}` : ""}
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5">
            {isLive ? <LiveDot /> : null}
            {statusLabel}
          </span>
        </CardDescription>
        <CardTitle className="font-heading text-xl sm:text-2xl">
          {fixture.homeTeam.name} vs {fixture.awayTeam.name}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
          <Link
            href={`/teams/${fixture.homeTeam.externalId}`}
            className="hover:bg-muted/40 focus-visible:ring-ring/50 flex flex-col items-center gap-2 rounded-xl p-2 text-center transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <TeamLogo
              name={fixture.homeTeam.name}
              logoUrl={fixture.homeTeam.logoUrl}
              className="size-14"
            />
            <span className="text-sm font-medium">{fixture.homeTeam.name}</span>
          </Link>

          <div className="text-center">
            {showScore ? (
              <div className="space-y-1">
                <p
                  className={`font-mono text-4xl font-semibold tabular-nums ${isLive ? "text-live" : ""}`}
                >
                  {formatFixtureScore(fixture)}
                </p>
                {isLive && formatFixtureMinute(fixture) ? (
                  <Badge variant="live" className="font-mono tabular-nums">
                    {formatFixtureMinute(fixture)}
                  </Badge>
                ) : null}
              </div>
            ) : (
              <p className="font-mono text-2xl font-semibold tabular-nums">
                {formatFixtureScore(fixture)}
              </p>
            )}
          </div>

          <Link
            href={`/teams/${fixture.awayTeam.externalId}`}
            className="hover:bg-muted/40 focus-visible:ring-ring/50 flex flex-col items-center gap-2 rounded-xl p-2 text-center transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <TeamLogo
              name={fixture.awayTeam.name}
              logoUrl={fixture.awayTeam.logoUrl}
              className="size-14"
            />
            <span className="text-sm font-medium">{fixture.awayTeam.name}</span>
          </Link>
        </div>

        {venueLabel || fixture.referee ? (
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {venueLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
                {venueLabel}
              </span>
            ) : null}
            {fixture.referee ? (
              <span className="inline-flex items-center gap-1.5">
                <UserIcon aria-hidden="true" className="size-3.5 shrink-0" />
                {fixture.referee}
              </span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
