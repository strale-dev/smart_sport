import {
  mapFixture,
  mapFixtureLiveClockFromRaw,
  mapLeague,
} from "@/lib/api-football/adapter";
import type { RawApiFootballFixture } from "@/lib/api-football/types";
import {
  countryRefToInsert,
  fixtureToInsert,
  leagueToInsert,
  seasonToInsert,
  standingRowToInsert,
  teamRefToInsert,
  venueRefToInsert,
} from "@/lib/api-football/to-db";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CountryRef,
  Fixture,
  League,
  LeagueRef,
  Season,
  StandingRow,
  TeamRef,
  VenueRef,
} from "@/types/domain";
import type { FixtureInsert } from "@/types/domain-db";
import type { Json } from "@/types/supabase";

type AdminClient = ReturnType<typeof createAdminClient>;

export class IngestionUpsertError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestionUpsertError";
  }
}

function throwIfError(
  error: { message: string } | null,
  context: string
): void {
  if (error) {
    throw new IngestionUpsertError(`${context}: ${error.message}`);
  }
}

function assertRow<T>(data: T | null, context: string): T {
  if (!data) {
    throw new IngestionUpsertError(`${context}: no row returned`);
  }

  return data;
}

function asDbJson(value: unknown): Json {
  return value as Json;
}

export async function upsertCountry(
  client: AdminClient,
  country: CountryRef
): Promise<string> {
  const row = countryRefToInsert(country);

  const { data, error } = await client
    .from("countries")
    .upsert(row, { onConflict: "provider_id" })
    .select("id")
    .single();

  throwIfError(error, "Failed to upsert country");

  return assertRow(data, "Failed to upsert country").id;
}

export async function upsertCountryByName(
  client: AdminClient,
  name: string,
  flagUrl: string | null = null
): Promise<string> {
  return upsertCountry(client, {
    externalId: name,
    code: null,
    name,
    flagUrl,
  });
}

export async function upsertLeague(
  client: AdminClient,
  league: League,
  countryId: string | null
): Promise<string> {
  const row = leagueToInsert(league);

  const { data, error } = await client
    .from("leagues")
    .upsert(
      {
        provider_id: row.provider_id,
        name: row.name,
        type: row.type,
        country_id: countryId,
        country_name: row.country_name,
        logo_url: row.logo_url,
        is_active: row.is_active,
      },
      { onConflict: "provider_id" }
    )
    .select("id")
    .single();

  throwIfError(error, "Failed to upsert league");

  return assertRow(data, "Failed to upsert league").id;
}

export async function upsertSeason(
  client: AdminClient,
  leagueId: string,
  season: Season,
  rawPayload: unknown = null
): Promise<string> {
  const row = seasonToInsert(season, rawPayload);

  const { data, error } = await client
    .from("seasons")
    .upsert(
      {
        league_id: leagueId,
        year: row.year,
        start_date: row.start_date,
        end_date: row.end_date,
        is_current: row.is_current,
        provider_payload: asDbJson(row.provider_payload),
      },
      { onConflict: "league_id,year" }
    )
    .select("id")
    .single();

  throwIfError(error, "Failed to upsert season");

  return assertRow(data, "Failed to upsert season").id;
}

function isKnownVenueProviderId(
  providerId: number | null
): providerId is number {
  return providerId != null && providerId > 0;
}

function normalizeVenueCity(city: string | null | undefined): string | null {
  if (!city) {
    return null;
  }

  const trimmed = city.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

function citiesMatch(
  left: string | null | undefined,
  right: string | null | undefined
): boolean {
  const a = normalizeVenueCity(left);
  const b = normalizeVenueCity(right);

  if (!a || !b) {
    return false;
  }

  return a === b || a.startsWith(b) || b.startsWith(a);
}

type VenueLookupRow = {
  id: string;
  provider_id: number | null;
  city: string | null;
};

function pickBestVenueMatch(
  rows: VenueLookupRow[],
  city: string | null
): VenueLookupRow | null {
  if (rows.length === 0) {
    return null;
  }

  const withProviderId = rows.filter((row) =>
    isKnownVenueProviderId(row.provider_id)
  );
  const pool = withProviderId.length > 0 ? withProviderId : rows;

  if (city) {
    const cityMatch = pool.find((row) => citiesMatch(row.city, city));
    if (cityMatch) {
      return cityMatch;
    }
  }

  return pool[0] ?? null;
}

async function findExistingVenueId(
  client: AdminClient,
  name: string,
  city: string | null
): Promise<string | null> {
  const { data, error } = await client
    .from("venues")
    .select("id, provider_id, city")
    .eq("name", name)
    .order("provider_id", { ascending: false, nullsFirst: true })
    .limit(10);

  throwIfError(error, "Failed to lookup venue");

  const match = pickBestVenueMatch((data ?? []) as VenueLookupRow[], city);
  return match?.id ?? null;
}

async function consolidateVenueDuplicatesByName(
  client: AdminClient,
  name: string,
  keepId: string
): Promise<void> {
  const { data: duplicates, error: selectError } = await client
    .from("venues")
    .select("id")
    .eq("name", name)
    .neq("id", keepId);

  throwIfError(selectError, "Failed to list duplicate venues");

  const dropIds = (duplicates ?? []).map((row) => row.id);
  if (dropIds.length === 0) {
    return;
  }

  for (const dropId of dropIds) {
    const { error: fixtureError } = await client
      .from("fixtures")
      .update({ venue_id: keepId })
      .eq("venue_id", dropId);

    throwIfError(fixtureError, "Failed to rewire fixture venue");

    const { error: teamError } = await client
      .from("teams")
      .update({ venue_id: keepId })
      .eq("venue_id", dropId);

    throwIfError(teamError, "Failed to rewire team venue");

    const { error: deleteError } = await client
      .from("venues")
      .delete()
      .eq("id", dropId);

    throwIfError(deleteError, "Failed to delete duplicate venue");
  }
}

export async function upsertVenue(
  client: AdminClient,
  venue: VenueRef | null
): Promise<string | null> {
  if (!venue?.name) {
    return null;
  }

  const row = venueRefToInsert(venue);

  if (isKnownVenueProviderId(row.provider_id)) {
    const { data, error } = await client
      .from("venues")
      .upsert(row, { onConflict: "provider_id" })
      .select("id")
      .single();

    throwIfError(error, "Failed to upsert venue");
    const keepId = assertRow(data, "Failed to upsert venue").id;
    await consolidateVenueDuplicatesByName(client, row.name, keepId);
    return keepId;
  }

  const existingId = await findExistingVenueId(client, row.name, row.city);
  if (existingId) {
    return existingId;
  }

  const { data, error } = await client
    .from("venues")
    .insert({ ...row, provider_id: null })
    .select("id")
    .single();

  throwIfError(error, "Failed to insert venue");
  return assertRow(data, "Failed to insert venue").id;
}

export async function upsertTeamRef(
  client: AdminClient,
  team: TeamRef,
  countryId: string | null = null
): Promise<string> {
  const row = teamRefToInsert(team);

  const { data, error } = await client
    .from("teams")
    .upsert(
      {
        provider_id: row.provider_id,
        name: row.name,
        code: row.code,
        founded: row.founded,
        is_national: row.is_national,
        logo_url: row.logo_url,
        country_id: countryId,
      },
      { onConflict: "provider_id" }
    )
    .select("id")
    .single();

  throwIfError(error, "Failed to upsert team");

  return assertRow(data, "Failed to upsert team").id;
}

export async function upsertFixtureRow(
  client: AdminClient,
  row: FixtureInsert
): Promise<string> {
  const { data, error } = await client
    .from("fixtures")
    .upsert(
      {
        ...row,
        provider_payload: asDbJson(row.provider_payload),
      },
      { onConflict: "provider_id" }
    )
    .select("id")
    .single();

  throwIfError(error, "Failed to upsert fixture");

  return assertRow(data, "Failed to upsert fixture").id;
}

export async function upsertStandingRow(
  client: AdminClient,
  leagueId: string,
  seasonId: string,
  teamId: string,
  row: StandingRow,
  rawPayload: unknown = null
): Promise<void> {
  const insert = standingRowToInsert(
    row,
    { leagueId, seasonId, teamId },
    rawPayload
  );

  const { error } = await client.from("standings").upsert(
    {
      ...insert,
      provider_payload: asDbJson(insert.provider_payload),
    },
    {
      onConflict: "league_id,season_id,team_id,group_name",
    }
  );

  throwIfError(error, "Failed to upsert standing row");
}

export async function resolveLeagueRefFromFixture(
  client: AdminClient,
  leagueRef: LeagueRef,
  countryName: string | null,
  countryFlag: string | null
): Promise<string> {
  const countryId = countryName
    ? await upsertCountryByName(client, countryName, countryFlag)
    : null;

  const league = mapLeague({
    id: leagueRef.externalId,
    name: leagueRef.name,
    type: leagueRef.type ?? "League",
    logo: leagueRef.logoUrl,
    country: leagueRef.country
      ? {
          name: leagueRef.country.name,
          code: leagueRef.country.code,
          flag: leagueRef.country.flagUrl,
        }
      : {
          name: countryName ?? "Unknown",
          code: null,
          flag: countryFlag,
        },
  });

  return upsertLeague(client, league, countryId);
}

export async function ingestFixtureFromRaw(
  client: AdminClient,
  raw: RawApiFootballFixture,
  syncedAt = new Date().toISOString()
): Promise<{ fixtureId: string; domain: Fixture }> {
  const domain: Fixture = {
    ...mapFixture(raw),
    liveClock: mapFixtureLiveClockFromRaw(raw, syncedAt),
  };

  const leagueId = await resolveLeagueRefFromFixture(
    client,
    domain.league,
    typeof raw.league.country === "string" ? raw.league.country : null,
    raw.league.flag
  );

  let seasonId: string | null = null;
  if (domain.seasonYear !== null) {
    seasonId = await upsertSeason(client, leagueId, {
      leagueExternalId: domain.league.externalId,
      year: domain.seasonYear,
      startDate: null,
      endDate: null,
      isCurrent: true,
    });
  }

  const venueId = await upsertVenue(client, domain.venue);
  const homeTeamId = await upsertTeamRef(client, domain.homeTeam);
  const awayTeamId = await upsertTeamRef(client, domain.awayTeam);

  const fixtureRow = fixtureToInsert(
    domain,
    {
      leagueId,
      seasonId,
      homeTeamId,
      awayTeamId,
      venueId,
    },
    raw,
    syncedAt
  );

  const fixtureId = await upsertFixtureRow(client, fixtureRow);

  return { fixtureId, domain };
}

export async function getLeagueUuidByProviderId(
  client: AdminClient,
  providerId: number
): Promise<string | null> {
  const { data, error } = await client
    .from("leagues")
    .select("id")
    .eq("provider_id", providerId)
    .maybeSingle();

  throwIfError(error, "Failed to resolve league id");
  return data?.id ?? null;
}

export async function getCurrentSeasonForLeague(
  client: AdminClient,
  leagueId: string
): Promise<{ id: string; year: number } | null> {
  const { data, error } = await client
    .from("seasons")
    .select("id, year")
    .eq("league_id", leagueId)
    .eq("is_current", true)
    .maybeSingle();

  throwIfError(error, "Failed to resolve current season");

  if (data) {
    return data;
  }

  const { data: latest, error: latestError } = await client
    .from("seasons")
    .select("id, year")
    .eq("league_id", leagueId)
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(latestError, "Failed to resolve latest season");
  return latest ?? null;
}

export async function countAllowlistFixturesForUtcDate(
  client: AdminClient,
  date: string,
  leagueProviderIds: readonly number[]
): Promise<{
  total: number;
  terminal: number;
  syncedToday: number;
}> {
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = new Date(`${date}T00:00:00.000Z`);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const dayEndIso = dayEnd.toISOString();

  const { data: leagues, error: leaguesError } = await client
    .from("leagues")
    .select("id")
    .in("provider_id", [...leagueProviderIds]);

  throwIfError(leaguesError, "Failed to load allowlist leagues");

  if (!leagues?.length) {
    return { total: 0, terminal: 0, syncedToday: 0 };
  }

  const leagueIds = leagues.map((league) => league.id);
  const todayStart = new Date().toISOString().slice(0, 10);

  const { data: fixtures, error } = await client
    .from("fixtures")
    .select("status, last_provider_sync_at")
    .in("league_id", leagueIds)
    .gte("kickoff_at", dayStart)
    .lt("kickoff_at", dayEndIso);

  throwIfError(error, "Failed to count fixtures for date");

  const rows = fixtures ?? [];
  const terminalStatuses = new Set([
    "FT",
    "AET",
    "PEN",
    "CANC",
    "ABD",
    "PST",
    "WO",
    "AWD",
  ]);

  return {
    total: rows.length,
    terminal: rows.filter((row) => terminalStatuses.has(row.status)).length,
    syncedToday: rows.filter(
      (row) => row.last_provider_sync_at?.slice(0, 10) === todayStart
    ).length,
  };
}

export type StandingsScheduleFixtureCounts = {
  upcomingFixtureCount: number;
  liveOrTodayFixtureCount: number;
};

const STANDINGS_SCHEDULE_UPCOMING_STATUSES = new Set(["NS", "TBD"]);
const STANDINGS_SCHEDULE_LIVE_STATUSES = new Set([
  "1H",
  "HT",
  "2H",
  "ET",
  "BT",
  "P",
  "LIVE",
  "SUSP",
  "INT",
]);

function utcDayStartIso(anchor = new Date()): string {
  return `${anchor.toISOString().slice(0, 10)}T00:00:00.000Z`;
}

function utcDayEndIso(anchor = new Date()): string {
  const end = new Date(utcDayStartIso(anchor));
  end.setUTCDate(end.getUTCDate() + 1);
  return end.toISOString();
}

export async function readStandingsScheduleFixtureCountsByLeagueIds(
  client: AdminClient,
  leagueIds: string[],
  anchor = new Date()
): Promise<Map<string, StandingsScheduleFixtureCounts>> {
  const countsByLeague = new Map<string, StandingsScheduleFixtureCounts>();
  if (leagueIds.length === 0) {
    return countsByLeague;
  }

  for (const leagueId of leagueIds) {
    countsByLeague.set(leagueId, {
      upcomingFixtureCount: 0,
      liveOrTodayFixtureCount: 0,
    });
  }

  const todayStart = utcDayStartIso(anchor);
  const todayEnd = utcDayEndIso(anchor);
  const nowIso = anchor.toISOString();

  const { data, error } = await client
    .from("fixtures")
    .select("league_id, status, kickoff_at, is_live")
    .in("league_id", leagueIds)
    .or(`is_live.eq.true,kickoff_at.gte.${todayStart}`);

  if (error) {
    throw new Error(
      `Failed to read standings schedule fixture counts: ${error.message}`
    );
  }

  for (const row of data ?? []) {
    const bucket = countsByLeague.get(row.league_id);
    if (!bucket) {
      continue;
    }

    const isUpcoming =
      STANDINGS_SCHEDULE_UPCOMING_STATUSES.has(row.status) &&
      row.kickoff_at >= nowIso;
    if (isUpcoming) {
      bucket.upcomingFixtureCount += 1;
    }

    const isLiveOrToday =
      row.is_live === true ||
      STANDINGS_SCHEDULE_LIVE_STATUSES.has(row.status) ||
      (row.kickoff_at >= todayStart && row.kickoff_at < todayEnd);
    if (isLiveOrToday) {
      bucket.liveOrTodayFixtureCount += 1;
    }
  }

  return countsByLeague;
}

export async function isStandingsFreshForLeague(
  client: AdminClient,
  leagueId: string,
  freshnessHours: number
): Promise<boolean> {
  const cutoff = new Date(
    Date.now() - freshnessHours * 3_600_000
  ).toISOString();

  const { data, error } = await client
    .from("standings")
    .select("updated_at")
    .eq("league_id", leagueId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error, "Failed to check standings freshness");

  if (!data?.updated_at) {
    return false;
  }

  return data.updated_at >= cutoff;
}

export async function bootstrapLeaguesAlreadyPresent(
  client: AdminClient,
  leagueProviderIds: readonly number[]
): Promise<boolean> {
  const { data: leagues, error: leaguesError } = await client
    .from("leagues")
    .select("id, provider_id")
    .in("provider_id", [...leagueProviderIds]);

  throwIfError(leaguesError, "Failed to check bootstrap leagues");

  if ((leagues?.length ?? 0) < leagueProviderIds.length) {
    return false;
  }

  for (const league of leagues ?? []) {
    const season = await getCurrentSeasonForLeague(client, league.id);
    if (!season) {
      return false;
    }
  }

  return true;
}
