import { cached } from "@/lib/redis/cache";

const WIKIPEDIA_REST_BASE = "https://en.wikipedia.org/api/rest_v1";
const USER_AGENT = "Scorence/1.0 (https://scorence.app; hello@scorence.app)";

export type WikipediaSummary = {
  title: string;
  pageUrl: string;
  excerpt: string;
};

type WikipediaSummaryResponse = {
  title?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
};

export async function fetchWikipediaSummary(
  pageTitle: string
): Promise<WikipediaSummary | null> {
  const encoded = encodeURIComponent(pageTitle.replace(/ /g, "_"));
  const cacheKey = `wiki:summary:${encoded}`;

  const result = await cached({
    key: cacheKey,
    freshTtlSeconds: 7 * 24 * 3_600,
    staleTtlSeconds: 14 * 24 * 3_600,
    fn: async () => {
      const response = await fetch(
        `${WIKIPEDIA_REST_BASE}/page/summary/${encoded}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": USER_AGENT,
          },
          next: { revalidate: 7 * 24 * 3_600 },
        }
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`wikipedia_summary_failed:${response.status}`);
      }

      const json = (await response.json()) as WikipediaSummaryResponse;
      const excerpt = json.extract?.trim();
      const title = json.title?.trim();
      const pageUrl = json.content_urls?.desktop?.page?.trim();

      if (!excerpt || !title || !pageUrl) {
        return null;
      }

      return { title, pageUrl, excerpt };
    },
  });

  return result.value;
}

type WikipediaSearchResponse = {
  pages?: Array<{ title?: string; key?: string }>;
};

export async function searchWikipediaTitle(
  query: string
): Promise<string | null> {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  const cacheKey = `wiki:search:${trimmed.toLowerCase()}`;

  const result = await cached({
    key: cacheKey,
    freshTtlSeconds: 7 * 24 * 3_600,
    staleTtlSeconds: 14 * 24 * 3_600,
    fn: async () => {
      const url = new URL(`${WIKIPEDIA_REST_BASE}/search/page`);
      url.searchParams.set("q", trimmed);
      url.searchParams.set("limit", "3");

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
        next: { revalidate: 7 * 24 * 3_600 },
      });

      if (!response.ok) {
        throw new Error(`wikipedia_search_failed:${response.status}`);
      }

      const json = (await response.json()) as WikipediaSearchResponse;
      const pages = json.pages ?? [];
      if (pages.length !== 1) {
        return pages.length > 1 ? "__AMBIGUOUS__" : null;
      }

      return pages[0]?.title ?? null;
    },
  });

  if (result.value === "__AMBIGUOUS__") {
    return "__AMBIGUOUS__";
  }

  return result.value;
}
