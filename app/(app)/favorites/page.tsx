import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GroupedFixturesList } from "@/components/fixtures/GroupedFixturesList";
import { getFavoritesData } from "@/lib/services/favoritesService";
import { getCurrentUser } from "@/lib/supabase/user";

export const metadata: Metadata = {
  title: "Favorites",
};

export default async function FavoritesPage() {
  const user = await getCurrentUser();

  if (user == null) {
    redirect("/login?returnTo=/favorites");
  }

  const data = await getFavoritesData(user.id);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Favorites
        </h1>
        <p className="text-muted-foreground text-sm">
          Matches from your followed teams for the last 30 days and next year.
        </p>
      </header>

      <GroupedFixturesList
        data={{
          dayGroups: data.dayGroups,
          nowAnchorFixtureId: data.nowAnchorFixtureId,
          todayDateKey: data.todayDateKey,
          followedTeamProviderIds: data.followedTeamProviderIds,
          isEmpty: data.isEmpty,
          emptyReason: data.emptyReason,
        }}
      />
    </div>
  );
}
