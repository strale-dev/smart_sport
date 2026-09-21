import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FixturesDiscoveryFilters } from "@/components/fixtures/FixturesDiscoveryFilters";
import { FixturesLeagueTabs } from "@/components/fixtures/FixturesLeagueTabs";
import { FixturesPageClient } from "@/components/fixtures/FixturesPageClient";
import { FixturesNotice } from "@/components/fixtures/FixturesNotice";
import { resolveViewerTimezone } from "@/lib/datetime/viewer-timezone.server";
import {
  getFixturesData,
  parseFixturesParams,
} from "@/lib/services/fixturesService";
import { readPreferredLeagueProviderId } from "@/lib/services/userService";
import { getCurrentUser } from "@/lib/supabase/user";

export const metadata: Metadata = {
  title: "Fixtures",
};

export default async function FixturesPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string; country?: string; q?: string }>;
}) {
  const rawParams = await searchParams;
  const user = await getCurrentUser();

  if (user && !rawParams.league && !rawParams.country && !rawParams.q) {
    const preferredProviderId = await readPreferredLeagueProviderId(user.id);
    if (preferredProviderId != null) {
      redirect(`/fixtures?league=${preferredProviderId}`);
    }
  }

  const params = parseFixturesParams(rawParams);
  const timeZone = await resolveViewerTimezone(user?.id ?? null);
  const data = await getFixturesData(params, timeZone);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <FixturesNotice />

      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Fixtures
        </h1>
        <p className="text-muted-foreground text-sm">
          Past week and next 7 days across your synced leagues.
        </p>
      </header>

      <FixturesLeagueTabs
        league={params.league}
        liveLeagueIds={data.liveLeagueIds}
        activeLeagueIds={data.activeLeagueIds}
      />

      <FixturesDiscoveryFilters params={params} />

      <FixturesPageClient
        params={params}
        timeZone={timeZone}
        initialData={data}
      />
    </div>
  );
}
