const DEFAULT_TIMEZONE = "UTC";

export function sanitizeTimezone(timeZone: string | null | undefined): string {
  if (!timeZone?.trim()) {
    return DEFAULT_TIMEZONE;
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return timeZone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function formatDateKeyInTimezone(
  iso: string | Date,
  timeZone: string
): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: sanitizeTimezone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));

  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, "0"),
    String(next.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function startOfDayUtcForTimezone(
  dateKey: string,
  timeZone: string
): string {
  const safeTimeZone = sanitizeTimezone(timeZone);
  const [year, month, day] = dateKey.split("-").map(Number);

  let low = Date.UTC(year, month - 1, day - 1, 0, 0, 0);
  let high = Date.UTC(year, month - 1, day + 1, 0, 0, 0);

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const midKey = formatDateKeyInTimezone(new Date(mid), safeTimeZone);

    if (midKey < dateKey) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return new Date(low).toISOString();
}

export function formatDayLabelInTimezone(
  dateKey: string,
  now: Date,
  timeZone: string
): string {
  const safeTimeZone = sanitizeTimezone(timeZone);
  const today = formatDateKeyInTimezone(now, safeTimeZone);
  const tomorrow = addDaysToDateKey(today, 1);

  if (dateKey === today) {
    return "Today";
  }

  if (dateKey === tomorrow) {
    return "Tomorrow";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: safeTimeZone,
  }).format(new Date(`${dateKey}T12:00:00.000Z`));
}

export type TimezoneWindow = {
  fromUtc: string;
  toUtcExclusive: string;
  todayDateKey: string;
};

export function buildTimezoneWindow(
  now: Date,
  timeZone: string,
  pastDays: number,
  futureDays: number
): TimezoneWindow {
  const safeTimeZone = sanitizeTimezone(timeZone);
  const todayDateKey = formatDateKeyInTimezone(now, safeTimeZone);
  const fromDateKey = addDaysToDateKey(todayDateKey, -pastDays);
  const toDateKeyExclusive = addDaysToDateKey(todayDateKey, futureDays + 1);

  return {
    fromUtc: startOfDayUtcForTimezone(fromDateKey, safeTimeZone),
    toUtcExclusive: startOfDayUtcForTimezone(toDateKeyExclusive, safeTimeZone),
    todayDateKey,
  };
}
