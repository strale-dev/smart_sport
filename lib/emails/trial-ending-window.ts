const MS_PER_DAY = 86_400_000;

/** UTC midnight for the calendar date of `date` in UTC. */
export function utcStartOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

/** Inclusive start, exclusive end — trials ending on calendar day (now + 3 days) UTC. */
export function trialEndingReminderWindowUtc(reference: Date = new Date()): {
  windowStart: Date;
  windowEnd: Date;
} {
  const todayStart = utcStartOfDay(reference);
  const windowStart = new Date(todayStart.getTime() + 3 * MS_PER_DAY);
  const windowEnd = new Date(windowStart.getTime() + MS_PER_DAY);
  return { windowStart, windowEnd };
}

export function isTrialEndingOnReminderDayUtc(
  trialEndsAtIso: string,
  reference: Date = new Date()
): boolean {
  const trialEnds = new Date(trialEndsAtIso);
  if (!Number.isFinite(trialEnds.getTime())) {
    return false;
  }

  const { windowStart, windowEnd } = trialEndingReminderWindowUtc(reference);
  return trialEnds >= windowStart && trialEnds < windowEnd;
}
