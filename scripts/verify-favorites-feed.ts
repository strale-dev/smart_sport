import { getFavoritesData } from "@/lib/services/favoritesService";

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error("Usage: tsx scripts/verify-favorites-feed.ts <userId>");
    process.exit(1);
  }

  const data = await getFavoritesData(userId);

  console.log(
    JSON.stringify(
      {
        isEmpty: data.isEmpty,
        emptyReason: data.emptyReason,
        followedTeams: data.followedTeamProviderIds,
        todayDateKey: data.todayDateKey,
        nowAnchorFixtureId: data.nowAnchorFixtureId,
        dayCount: data.dayGroups.length,
        fixtureCount: data.dayGroups.reduce((total, day) => {
          if (day.fixtures) {
            return total + day.fixtures.length;
          }

          return (
            total +
            (day.leagues?.reduce(
              (leagueTotal, league) => leagueTotal + league.fixtures.length,
              0
            ) ?? 0)
          );
        }, 0),
        days: data.dayGroups.map((day) => ({
          dateKey: day.dateKey,
          label: day.label,
          leagues: day.leagues?.map((league) => league.label) ?? [],
        })),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
