import { LEGACY_CORE_PROVIDER_IDS } from "@/lib/competitions/legacy";
import type {
  CompetitionCategory,
  CompetitionTier,
  RawRegistryLeagueEntry,
} from "@/lib/competitions/types";

export type SeedMatch = {
  tier: CompetitionTier;
  category: CompetitionCategory;
  match: (entry: RawRegistryLeagueEntry) => boolean;
};

function countryLeague(country: string, name: string) {
  return (entry: RawRegistryLeagueEntry) =>
    entry.country.name === country && entry.league.name === name;
}

function worldLeague(name: string) {
  return countryLeague("World", name);
}

function worldNameIncludes(substr: string) {
  const needle = substr.toLowerCase();
  return (entry: RawRegistryLeagueEntry) =>
    entry.country.name === "World" &&
    entry.league.name.toLowerCase().includes(needle);
}

function countryNameIncludes(country: string, substr: string) {
  const needle = substr.toLowerCase();
  return (entry: RawRegistryLeagueEntry) =>
    entry.country.name === country &&
    entry.league.name.toLowerCase().includes(needle);
}

/** First matching seed wins (order matters). */
export const COMPETITION_SEED_MATCHES: SeedMatch[] = [
  // --- Tier 1 domestic / continental (explicit) ---
  ...LEGACY_CORE_PROVIDER_IDS.filter((id) => id !== 286).map(
    (providerId): SeedMatch => ({
      tier: 1,
      category:
        providerId === 2 || providerId === 3 || providerId === 848
          ? "continental_club"
          : "domestic_league",
      match: (entry) => entry.league.id === providerId,
    })
  ),
  { tier: 2, category: "domestic_league", match: (e) => e.league.id === 286 },

  {
    tier: 1,
    category: "domestic_league",
    match: countryLeague("Brazil", "Serie A"),
  },
  {
    tier: 1,
    category: "domestic_league",
    match: countryLeague("Argentina", "Liga Profesional Argentina"),
  },
  {
    tier: 1,
    category: "domestic_league",
    match: countryLeague("USA", "Major League Soccer"),
  },
  {
    tier: 1,
    category: "domestic_league",
    match: countryLeague("Mexico", "Liga MX"),
  },

  {
    tier: 1,
    category: "continental_club",
    match: worldLeague("CONMEBOL Libertadores"),
  },
  {
    tier: 1,
    category: "continental_club",
    match: worldLeague("CONMEBOL Sudamericana"),
  },
  {
    tier: 1,
    category: "continental_club",
    match: worldLeague("CONCACAF Champions League"),
  },
  {
    tier: 1,
    category: "continental_club",
    match: worldLeague("AFC Champions League Elite"),
  },
  {
    tier: 1,
    category: "continental_club",
    match: worldLeague("CAF Champions League"),
  },
  {
    tier: 1,
    category: "continental_club",
    match: worldLeague("FIFA Club World Cup"),
  },

  // National teams & major internationals
  { tier: 1, category: "national_team", match: worldLeague("Friendlies") },
  {
    tier: 1,
    category: "national_team",
    match: worldLeague("UEFA Nations League"),
  },
  {
    tier: 1,
    category: "national_team",
    match: worldLeague("Euro Championship"),
  },
  {
    tier: 1,
    category: "national_team",
    match: worldLeague("Euro Championship - Qualification"),
  },
  { tier: 1, category: "national_team", match: worldLeague("World Cup") },
  {
    tier: 1,
    category: "national_team",
    match: worldLeague("World Cup - Qualification Europe"),
  },
  {
    tier: 1,
    category: "national_team",
    match: worldLeague("World Cup - Qualification South America"),
  },
  {
    tier: 1,
    category: "national_team",
    match: worldLeague("World Cup - Qualification Africa"),
  },
  {
    tier: 1,
    category: "national_team",
    match: worldLeague("World Cup - Qualification Asia"),
  },
  {
    tier: 1,
    category: "national_team",
    match: worldLeague("World Cup - Qualification CONCACAF"),
  },
  {
    tier: 1,
    category: "national_team",
    match: worldLeague("World Cup - Qualification Oceania"),
  },
  { tier: 1, category: "national_team", match: worldLeague("Copa America") },
  {
    tier: 1,
    category: "national_team",
    match: worldLeague("CONCACAF Gold Cup"),
  },
  {
    tier: 1,
    category: "national_team",
    match: worldLeague("CONCACAF Nations League"),
  },
  { tier: 1, category: "national_team", match: worldLeague("Asian Cup") },
  {
    tier: 1,
    category: "national_team",
    match: worldLeague("Africa Cup of Nations"),
  },
  {
    tier: 2,
    category: "national_team",
    match: worldLeague("Asian Cup - Qualification"),
  },
  {
    tier: 2,
    category: "national_team",
    match: worldLeague("Africa Cup of Nations - Qualification"),
  },
  { tier: 2, category: "national_team", match: worldLeague("OFC Nations Cup") },

  // Tier 2 Europe expansion (name-exact where possible)
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Portugal", "Segunda Liga"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Portugal", "Taça de Portugal"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Netherlands", "Eerste Divisie"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Netherlands", "KNVB Beker"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Belgium", "Jupiler Pro League"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Belgium", "Challenger Pro League"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Turkey", "Süper Lig"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Turkey", "1. Lig"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Greece", "Super League 1"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Scotland", "Premiership"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Austria", "Bundesliga"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Switzerland", "Super League"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Denmark", "Superliga"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Sweden", "Allsvenskan"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Norway", "Eliteserien"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Poland", "Ekstraklasa"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Czech-Republic", "Czech Liga"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Croatia", "HNL"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Romania", "Liga I"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Ukraine", "Premier League"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Russia", "Premier League"),
  },

  // Americas / Asia / Africa tier 2+
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Brazil", "Serie B"),
  },
  {
    tier: 2,
    category: "domestic_cup",
    match: countryLeague("Brazil", "Copa Do Brasil"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Argentina", "Primera Nacional"),
  },
  {
    tier: 2,
    category: "domestic_cup",
    match: countryLeague("Argentina", "Copa Argentina"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Colombia", "Primera A"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Chile", "Primera División"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Uruguay", "Primera División"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Ecuador", "Liga Pro"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Paraguay", "Division Profesional - Apertura"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Peru", "Primera División"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Saudi-Arabia", "Pro League"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Japan", "J1 League"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("South-Korea", "K League 1"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("China", "Super League"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("United-Arab-Emirates", "Pro League"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Qatar", "Stars League"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Iran", "Persian Gulf Pro League"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Australia", "A-League"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Egypt", "Premier League"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("South-Africa", "Premier Soccer League"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Morocco", "Botola Pro"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Algeria", "Ligue 1"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Tunisia", "Ligue 1"),
  },
  {
    tier: 2,
    category: "continental_club",
    match: worldLeague("CAF Confederation Cup"),
  },
  {
    tier: 2,
    category: "continental_club",
    match: worldLeague("AFC Champions League Two"),
  },
];

/** Metadata pass: strong domestic leagues in any country with current season. */
export function inferTier2Domestic(entry: RawRegistryLeagueEntry): boolean {
  if (entry.country.name === "World") {
    return false;
  }
  if (entry.league.type !== "League") {
    return false;
  }
  const name = entry.league.name.toLowerCase();
  if (EXCLUDE_NAME_PATTERN.test(name)) {
    return false;
  }
  if (entry.country.name === "Brazil" && BRAZIL_STATE_PATTERN.test(name)) {
    return false;
  }
  return hasActiveSeason(entry);
}

export const EXCLUDE_NAME_PATTERN =
  /women|feminine|femenin|u17|u19|u20|u21|u23|youth|junior|girls|amateur|play-offs|playoffs|promotion round|relegation round|reserve league/i;

const BRAZIL_STATE_PATTERN =
  /paulista|carioca|mineiro|gaúcho|gaucho|baiano|pernambucano|paranaense|catarinense|goiano|cearense|potiguar|sergipano|amazonense|acreano|matogrossense|paraibano|piauiense|capixaba|maranhense|paraense|brasiliense|rondoniense/i;

export function hasActiveSeason(
  entry: RawRegistryLeagueEntry,
  graceDays = 90
): boolean {
  const cutoff = Date.now() - graceDays * 86_400_000;
  for (const season of entry.seasons) {
    if (season.current) {
      return true;
    }
    if (season.end) {
      const endMs = new Date(season.end).getTime();
      if (!Number.isNaN(endMs) && endMs >= cutoff) {
        return true;
      }
    }
  }
  return false;
}

export function matchSeed(entry: RawRegistryLeagueEntry): SeedMatch | null {
  for (const seed of COMPETITION_SEED_MATCHES) {
    if (seed.match(entry)) {
      return seed;
    }
  }
  return null;
}
