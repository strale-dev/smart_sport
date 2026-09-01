import type { Fixture, FixtureStatus } from "@/types/domain";
import { isLiveFixtureStatus } from "@/lib/redis/keys";

export function formatFixtureKickoffTime(kickoffAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(kickoffAt));
}

export function formatFixtureScore(fixture: Fixture): string {
  if (
    isLiveFixtureStatus(fixture.status) ||
    isFinishedFixtureStatus(fixture.status)
  ) {
    const home = fixture.score.home ?? "–";
    const away = fixture.score.away ?? "–";
    return `${home} – ${away}`;
  }

  return formatFixtureKickoffTime(fixture.kickoffAt);
}

export function formatFixtureStatusLabel(
  status: FixtureStatus,
  minute: number | null
): string {
  if (isLiveFixtureStatus(status)) {
    if (status === "HT") {
      return "HT";
    }

    if (minute != null) {
      return `${minute}'`;
    }

    return "Live";
  }

  if (status === "NS" || status === "TBD") {
    return "Scheduled";
  }

  if (isFinishedFixtureStatus(status)) {
    return "FT";
  }

  return status;
}

export function isFinishedFixtureStatus(status: FixtureStatus): boolean {
  return ["FT", "AET", "PEN", "AWD", "WO"].includes(status);
}

export function formatFixtureMinute(fixture: Fixture): string | null {
  if (!isLiveFixtureStatus(fixture.status)) {
    return null;
  }

  if (fixture.status === "HT") {
    return "HT";
  }

  if (fixture.minute != null) {
    return `${fixture.minute}'`;
  }

  return "Live";
}
