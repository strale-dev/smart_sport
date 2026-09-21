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

  // Top 5 — second divisions & major cups
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("England", "Championship"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("England", "League One"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("England", "League Two"),
  },
  {
    tier: 2,
    category: "domestic_cup",
    match: countryLeague("England", "FA Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Spain", "Segunda División"),
  },
  {
    tier: 2,
    category: "domestic_cup",
    match: countryLeague("Spain", "Copa del Rey"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Italy", "Serie B"),
  },
  {
    tier: 2,
    category: "domestic_cup",
    match: countryLeague("Italy", "Coppa Italia"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Germany", "2. Bundesliga"),
  },
  {
    tier: 2,
    category: "domestic_cup",
    match: countryLeague("Germany", "DFB Pokal"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("France", "Ligue 2"),
  },
  {
    tier: 2,
    category: "domestic_cup",
    match: countryLeague("France", "Coupe de France"),
  },

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
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Russia", "First League"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Russia", "Cup"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Belgium", "Cup"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Turkey", "Türkiye Kupası"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Greece", "Super League 2"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Greece", "Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Scotland", "Championship"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Scotland", "FA Cup"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Austria", "2. Liga"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Austria", "Cup"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Switzerland", "Challenge League"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Switzerland", "Schweizer Cup"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Denmark", "1. Division"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Denmark", "DBU Pokalen"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Sweden", "Superettan"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Sweden", "Svenska Cupen"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Norway", "1. Division"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Norway", "NM Cupen"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Poland", "I Liga"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Poland", "Cup"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Czech-Republic", "FNL"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Czech-Republic", "Cup"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Croatia", "Cup"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Serbia", "Prva Liga"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Serbia", "Cup"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Romania", "Liga II"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Romania", "Cupa României"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Ukraine", "Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Hungary", "NB I"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Hungary", "NB II"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Hungary", "Magyar Kupa"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Bulgaria", "First League"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Bulgaria", "Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Slovakia", "Super Liga"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Slovakia", "Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Slovenia", "1. SNL"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Slovenia", "Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Israel", "Ligat Ha'al"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Israel", "State Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Ireland", "Premier Division"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Ireland", "FAI Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Finland", "Veikkausliiga"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Finland", "Ykkönen"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Finland", "Suomen Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Iceland", "Úrvalsdeild"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Bosnia", "Premijer Liga"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Bosnia", "Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Montenegro", "First League"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Montenegro", "Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Macedonia", "First League"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Albania", "Superliga"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Albania", "Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Georgia", "Erovnuli Liga"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Georgia", "Erovnuli Liga 2"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Georgia", "David Kipiani Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Armenia", "Premier League"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Armenia", "Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Azerbaijan", "Premyer Liqa"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Azerbaijan", "Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Kazakhstan", "Premier League"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Kazakhstan", "Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Latvia", "Virsliga"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Latvia", "Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Lithuania", "A Lyga"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Lithuania", "Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Estonia", "Meistriliiga"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Estonia", "Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Cyprus", "1. Division"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Cyprus", "Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Kosovo", "Superliga"),
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
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Colombia", "Primera B"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Colombia", "Copa Colombia"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Chile", "Primera División"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Chile", "Primera B"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Chile", "Copa Chile"),
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
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Ecuador", "Liga Pro Serie B"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Paraguay", "Division Profesional - Apertura"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryNameIncludes("Paraguay", "division profesional - clausura"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Peru", "Primera División"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Bolivia", "Primera División"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Venezuela", "Primera División"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("USA", "USL Championship"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("USA", "US Open Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Canada", "Canadian Premier League"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Canada", "Canadian Championship"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Mexico", "Liga de Expansión MX"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Mexico", "Copa MX"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Saudi-Arabia", "Pro League"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Saudi-Arabia", "Division 1"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Saudi-Arabia", "King's Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Japan", "J1 League"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Japan", "J2 League"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("Japan", "J3 League"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Japan", "Emperor Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("South-Korea", "K League 1"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("South-Korea", "K League 2"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("South-Korea", "FA Cup"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("China", "Super League"),
  },
  {
    tier: 3,
    category: "domestic_league",
    match: countryLeague("China", "League One"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("China", "FA Cup"),
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
    category: "domestic_league",
    match: countryLeague("Nigeria", "NPFL"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Ghana", "Premier League"),
  },
  {
    tier: 2,
    category: "domestic_league",
    match: countryLeague("Kenya", "FKF Premier League"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Egypt", "Cup"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("South-Africa", "Cup"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Morocco", "Cup"),
  },
  {
    tier: 3,
    category: "domestic_cup",
    match: countryLeague("Tunisia", "Cup"),
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
  {
    tier: 2,
    category: "continental_club",
    match: worldLeague("UEFA Super Cup"),
  },
  {
    tier: 2,
    category: "continental_club",
    match: worldLeague("CONMEBOL Recopa"),
  },
  {
    tier: 2,
    category: "continental_club",
    match: worldLeague("CAF Super Cup"),
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
