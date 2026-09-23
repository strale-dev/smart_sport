import {
  normalizeSearchField,
  normalizeSearchQuery,
  tokenizeSearchQuery,
} from "@/lib/search/normalize";

export type TextMatchInput = {
  query: string;
  fields: Array<string | null | undefined>;
  dbSimilarity?: number;
};

const WEIGHT_EXACT = 100;
const WEIGHT_STARTS_WITH = 80;
const WEIGHT_WORD_STARTS = 60;
const WEIGHT_SUBSTRING = 40;
const WEIGHT_FUZZY = 20;

function scoreFieldAgainstQuery(
  fieldNorm: string,
  queryNorm: string,
  tokens: string[]
): number {
  if (!fieldNorm) {
    return 0;
  }

  if (fieldNorm === queryNorm) {
    return WEIGHT_EXACT;
  }

  if (fieldNorm.startsWith(queryNorm)) {
    return WEIGHT_STARTS_WITH;
  }

  const words = fieldNorm.split(/\s+/).filter(Boolean);
  if (tokens.every((token) => words.some((word) => word.startsWith(token)))) {
    return WEIGHT_WORD_STARTS;
  }

  if (tokens.every((token) => fieldNorm.includes(token))) {
    return WEIGHT_SUBSTRING;
  }

  if (fieldNorm.includes(queryNorm)) {
    return WEIGHT_SUBSTRING;
  }

  return 0;
}

/** Rank text fields; optional pg_trgm similarity adds a fuzzy floor. */
export function scoreTextMatch(input: TextMatchInput): number {
  const queryNorm = normalizeSearchQuery(input.query);
  if (!queryNorm) {
    return 0;
  }

  const tokens = tokenizeSearchQuery(input.query);
  let best = 0;

  for (const field of input.fields) {
    const fieldNorm = normalizeSearchField(field);
    best = Math.max(best, scoreFieldAgainstQuery(fieldNorm, queryNorm, tokens));
  }

  if (best > 0) {
    return best;
  }

  const sim = input.dbSimilarity ?? 0;
  if (sim >= 0.25) {
    return WEIGHT_FUZZY + Math.round(sim * 10);
  }

  return 0;
}

export function compareByScoreThenTieBreak<T extends { score: number }>(
  left: T,
  right: T,
  tieBreak: (item: T) => number
): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }
  return tieBreak(right) - tieBreak(left);
}
