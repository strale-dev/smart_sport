import "server-only";

import {
  fetchWikipediaSummary,
  searchWikipediaTitle,
} from "@/lib/wikipedia/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/supabase";

export type PlayerBiographyView = {
  excerpt: string | null;
  pageTitle: string | null;
  pageUrl: string | null;
  licenseNote: string;
  fetchedAt: string | null;
  fetchStatus: Database["public"]["Enums"]["player_bio_fetch_status"];
};

const LICENSE_NOTE =
  "Content from Wikipedia, licensed under CC BY-SA 4.0. See the article for authors and source.";

export async function resolvePlayerUuidByProviderId(
  providerId: number
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("players")
    .select("id")
    .eq("provider_id", providerId)
    .maybeSingle();

  if (error) {
    throw new Error(`player_uuid_lookup_failed: ${error.message}`);
  }

  return data?.id ?? null;
}

function trimExcerpt(text: string, maxChars = 480): string {
  if (text.length <= maxChars) {
    return text;
  }
  const slice = text.slice(0, maxChars);
  const lastPeriod = slice.lastIndexOf(".");
  if (lastPeriod > 120) {
    return `${slice.slice(0, lastPeriod + 1)}`;
  }
  return `${slice.trim()}…`;
}

export async function getPlayerBiographyByPlayerUuid(
  playerUuid: string
): Promise<PlayerBiographyView | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("player_biographies")
    .select(
      "excerpt, page_title, page_url, license_note, fetched_at, fetch_status"
    )
    .eq("player_id", playerUuid)
    .maybeSingle();

  if (error) {
    throw new Error(`player_bio_read_failed: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    excerpt: data.excerpt,
    pageTitle: data.page_title,
    pageUrl: data.page_url,
    licenseNote: data.license_note,
    fetchedAt: data.fetched_at,
    fetchStatus: data.fetch_status,
  };
}

export async function ensurePlayerBiography(input: {
  playerUuid: string;
  fullName: string;
  nationality?: string | null;
}): Promise<PlayerBiographyView> {
  const existing = await getPlayerBiographyByPlayerUuid(input.playerUuid);
  const staleMs = 7 * 24 * 3_600 * 1_000;
  if (
    existing &&
    existing.fetchStatus === "OK" &&
    existing.fetchedAt &&
    Date.now() - new Date(existing.fetchedAt).getTime() < staleMs
  ) {
    return existing;
  }

  if (
    existing &&
    existing.fetchStatus !== "OK" &&
    existing.fetchedAt &&
    Date.now() - new Date(existing.fetchedAt).getTime() < staleMs
  ) {
    return existing;
  }

  const searchQuery = input.nationality
    ? `${input.fullName} ${input.nationality} footballer`
    : `${input.fullName} footballer`;

  let fetchStatus: Database["public"]["Enums"]["player_bio_fetch_status"] =
    "ERROR";
  let pageTitle: string | null = null;
  let pageUrl: string | null = null;
  let excerpt: string | null = null;

  try {
    const resolvedTitle = await searchWikipediaTitle(searchQuery);
    if (resolvedTitle === "__AMBIGUOUS__") {
      fetchStatus = "AMBIGUOUS";
    } else if (!resolvedTitle) {
      fetchStatus = "NOT_FOUND";
    } else {
      const summary = await fetchWikipediaSummary(resolvedTitle);
      if (!summary) {
        fetchStatus = "NOT_FOUND";
      } else {
        fetchStatus = "OK";
        pageTitle = summary.title;
        pageUrl = summary.pageUrl;
        excerpt = trimExcerpt(summary.excerpt);
      }
    }
  } catch {
    fetchStatus = "ERROR";
  }

  const admin = createAdminClient();
  const row: Database["public"]["Tables"]["player_biographies"]["Insert"] = {
    player_id: input.playerUuid,
    source: "WIKIPEDIA",
    page_title: pageTitle,
    page_url: pageUrl,
    excerpt,
    license_note: LICENSE_NOTE,
    fetch_status: fetchStatus,
    fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await admin.from("player_biographies").upsert(row);

  return {
    excerpt,
    pageTitle,
    pageUrl,
    licenseNote: LICENSE_NOTE,
    fetchedAt: row.fetched_at ?? new Date().toISOString(),
    fetchStatus,
  };
}
