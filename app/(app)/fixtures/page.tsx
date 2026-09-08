import type { Metadata } from "next";

import { FixturesLeagueTabs } from "@/components/fixtures/FixturesLeagueTabs";
import { FixturesList } from "@/components/fixtures/FixturesList";
import { FixturesNotice } from "@/components/fixtures/FixturesNotice";
import { resolveViewerTimezone } from "@/lib/datetime/viewer-timezone.server";
import {
  getFixturesData,
  parseFixturesParams,
} from "@/lib/services/fixturesService";
import { getCurrentUser } from "@/lib/supabase/user";

export const metadata: Metadata = {
  title: "Fixtures",
};

export default async function FixturesPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  const rawParams = await searchParams;
  const params = parseFixturesParams(rawParams);
  const user = await getCurrentUser();
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
          Upcoming matches across your leagues for the next 7 days.
        </p>
      </header>

      <FixturesLeagueTabs
        league={params.league}
        liveLeagueIds={data.liveLeagueIds}
        activeLeagueIds={data.activeLeagueIds}
      />

      <FixturesList data={data} />
    </div>
  );
}
