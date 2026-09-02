import type { Metadata } from "next";

import { LiveCenterFilters } from "@/components/live/LiveCenterFilters";
import { LiveCenterList } from "@/components/live/LiveCenterList";
import { LiveCenterPagination } from "@/components/live/LiveCenterPagination";
import {
  getLiveCenterData,
  parseLiveCenterParams,
} from "@/lib/services/liveService";

export const metadata: Metadata = {
  title: "Live Center",
};

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string; status?: string; page?: string }>;
}) {
  const rawParams = await searchParams;
  const params = parseLiveCenterParams(rawParams);
  const data = await getLiveCenterData(params);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Live Center
        </h1>
        <p className="text-muted-foreground text-sm">
          Follow live scores and jump into match details.
        </p>
      </header>

      <LiveCenterFilters
        league={params.league}
        status={params.status}
        page={data.page}
      />

      <LiveCenterList
        key={[
          params.league ?? "all",
          params.status ?? "all",
          params.page ?? 1,
        ].join("-")}
        initialData={data}
        params={params}
      />

      <LiveCenterPagination
        page={data.page}
        totalPages={data.totalPages}
        league={params.league}
        status={params.status}
      />
    </div>
  );
}
