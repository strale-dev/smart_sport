const DIACRITICS = /[\u0300-\u036f]/g;

/** Collapse whitespace and lowercase for search matching. */
export function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

/** ASCII-friendly diacritic fold (mirrors DB unaccent for common Latin scripts). */
export function foldDiacritics(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS, "");
}

export function normalizeSearchField(value: string | null | undefined): string {
  if (!value?.trim()) {
    return "";
  }
  return foldDiacritics(normalizeSearchQuery(value));
}

export function tokenizeSearchQuery(query: string): string[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) {
    return [];
  }
  return normalized.split(" ").filter(Boolean);
}

export const MIN_SEARCH_QUERY_LENGTH = 2;
export const MAX_SEARCH_QUERY_LENGTH = 100;
