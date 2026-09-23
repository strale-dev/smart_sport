import type {
  GlobalSearchMode,
  GlobalSearchResponse,
} from "@/lib/search/types";

export async function fetchGlobalSearch(
  query: string,
  mode: GlobalSearchMode = "palette"
): Promise<GlobalSearchResponse> {
  const params = new URLSearchParams({ q: query, mode });
  const response = await fetch(`/api/search?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Search request failed (${response.status})`);
  }

  return (await response.json()) as GlobalSearchResponse;
}
