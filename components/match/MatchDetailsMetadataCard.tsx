"use client";

import { InfoIcon } from "lucide-react";

import { useViewerTimezone } from "@/components/providers/ViewerTimezoneProvider";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";
import { formatFixtureKickoffDateTime } from "@/lib/fixtures/display";
import type { Fixture } from "@/types/domain";

type MatchDetailsMetadataCardProps = {
  fixture: Fixture;
};

function formatVenue(fixture: Fixture): string | null {
  if (!fixture.venue?.name) {
    return null;
  }

  if (fixture.venue.city) {
    return `${fixture.venue.name}, ${fixture.venue.city}`;
  }

  return fixture.venue.name;
}

function scoreLine(
  label: string,
  home: number | null,
  away: number | null
): string | null {
  if (home == null || away == null) {
    return null;
  }

  return `${label}: ${home}–${away}`;
}

export function MatchDetailsMetadataCard({
  fixture,
}: MatchDetailsMetadataCardProps) {
  const timeZone = useViewerTimezone();
  const venue = formatVenue(fixture);
  const kickoff = formatFixtureKickoffDateTime(fixture.kickoffAt, timeZone);

  const lines = [
    { label: "Competition", value: fixture.league.name },
    fixture.round ? { label: "Round", value: fixture.round } : null,
    { label: "Kickoff", value: kickoff },
    venue ? { label: "Venue", value: venue } : null,
    fixture.referee ? { label: "Referee", value: fixture.referee } : null,
    fixture.score.halftimeHome != null && fixture.score.halftimeAway != null
      ? {
          label: "Half-time",
          value: `${fixture.score.halftimeHome}–${fixture.score.halftimeAway}`,
        }
      : null,
    scoreLine(
      "Full-time",
      fixture.score.fulltimeHome ?? fixture.score.home,
      fixture.score.fulltimeAway ?? fixture.score.away
    )
      ? {
          label: "Full-time",
          value: `${fixture.score.fulltimeHome ?? fixture.score.home}–${fixture.score.fulltimeAway ?? fixture.score.away}`,
        }
      : null,
    scoreLine(
      "Extra time",
      fixture.score.extratimeHome,
      fixture.score.extratimeAway
    )
      ? {
          label: "Extra time",
          value: `${fixture.score.extratimeHome}–${fixture.score.extratimeAway}`,
        }
      : null,
    scoreLine("Penalties", fixture.score.penaltyHome, fixture.score.penaltyAway)
      ? {
          label: "Penalties",
          value: `${fixture.score.penaltyHome}–${fixture.score.penaltyAway}`,
        }
      : null,
  ].filter((row): row is { label: string; value: string } => row != null);

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader className="gap-2">
        <MatchCardTitle className="flex items-center gap-2">
          <InfoIcon aria-hidden className="size-4" />
          Match details
        </MatchCardTitle>
      </MatchCardHeader>
      <MatchCardContent>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {lines.map((row) => (
            <div key={row.label} className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground text-xs">{row.label}</dt>
              <dd className="font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
