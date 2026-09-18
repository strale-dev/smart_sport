import type { FixtureStatus } from "@/types/domain";

const KNOWN_STATUSES = new Set<FixtureStatus>([
  "TBD",
  "NS",
  "1H",
  "HT",
  "2H",
  "ET",
  "BT",
  "P",
  "FT",
  "AET",
  "PEN",
  "SUSP",
  "INT",
  "PST",
  "CANC",
  "ABD",
  "AWD",
  "WO",
  "LIVE",
]);

export function mapFixtureStatus(
  shortStatus: string | null | undefined
): FixtureStatus {
  if (!shortStatus) {
    return "NS";
  }

  const normalized = shortStatus.toUpperCase() as FixtureStatus;
  if (KNOWN_STATUSES.has(normalized)) {
    return normalized;
  }

  return "NS";
}

export function parseNullableInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseNullableFloat(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parsePercent(value: unknown): number | null {
  if (typeof value === "string" && value.endsWith("%")) {
    return parseNullableInt(value.replace("%", ""));
  }

  return parseNullableInt(value);
}

export function parseHeightCm(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const match = value.match(/(\d+)/);
  return match ? parseNullableInt(match[1]) : null;
}

export function parseWeightKg(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const match = value.match(/(\d+)/);
  return match ? parseNullableInt(match[1]) : null;
}

export function buildExternalEventId(
  fixtureExternalId: number,
  minute: number,
  extraMinute: number | null,
  type: string,
  teamExternalId: number | null,
  playerExternalId: number | null
): string {
  return [
    fixtureExternalId,
    minute,
    extraMinute ?? 0,
    type,
    teamExternalId ?? 0,
    playerExternalId ?? 0,
  ].join(":");
}
