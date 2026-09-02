import { FIXTURES_WINDOW_DAYS } from "@/lib/fixtures/constants";

export function utcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** Inclusive start (UTC midnight today) and exclusive end (UTC midnight today + window + 1). */
export function buildFixturesWindow(now = new Date()): {
  fromDate: string;
  toDateExclusive: string;
} {
  const fromDate = utcDateString(now);
  const toDateExclusive = addUtcDays(fromDate, FIXTURES_WINDOW_DAYS + 1);

  return { fromDate, toDateExclusive };
}
