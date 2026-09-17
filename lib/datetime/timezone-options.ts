import { sanitizeTimezone } from "@/lib/datetime/timezone";

let cachedTimezones: string[] | null = null;

export function listSupportedTimezones(): string[] {
  if (cachedTimezones) {
    return cachedTimezones;
  }

  if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
    cachedTimezones = Intl.supportedValuesOf("timeZone").map(sanitizeTimezone);
    return cachedTimezones;
  }

  cachedTimezones = [
    "UTC",
    "Europe/London",
    "Europe/Paris",
    "Europe/Belgrade",
    "America/New_York",
    "America/Los_Angeles",
  ];
  return cachedTimezones;
}

export function filterTimezones(query: string, limit = 80): string[] {
  const normalized = query.trim().toLowerCase();
  const all = listSupportedTimezones();

  if (!normalized) {
    return all.slice(0, limit);
  }

  return all
    .filter((zone) => zone.toLowerCase().includes(normalized))
    .slice(0, limit);
}
