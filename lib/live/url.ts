import type { LiveStatusFilter } from "@/lib/live/constants";

export type LiveCenterSearchParams = {
  league?: number;
  status?: LiveStatusFilter;
  page?: number;
};

export function buildLiveCenterHref(
  params: LiveCenterSearchParams,
  overrides: Partial<LiveCenterSearchParams> = {}
): string {
  const merged = { ...params, ...overrides };
  const searchParams = new URLSearchParams();

  if (merged.league != null) {
    searchParams.set("league", String(merged.league));
  }

  if (merged.status != null) {
    searchParams.set("status", merged.status);
  }

  if (merged.page != null && merged.page > 1) {
    searchParams.set("page", String(merged.page));
  }

  const query = searchParams.toString();
  return query ? `/live?${query}` : "/live";
}

export function buildLiveCenterApiHref(params: LiveCenterSearchParams): string {
  const searchParams = new URLSearchParams();

  if (params.league != null) {
    searchParams.set("league", String(params.league));
  }

  if (params.status != null) {
    searchParams.set("status", params.status);
  }

  if (params.page != null && params.page > 1) {
    searchParams.set("page", String(params.page));
  }

  const query = searchParams.toString();
  return query ? `/api/live?${query}` : "/api/live";
}
