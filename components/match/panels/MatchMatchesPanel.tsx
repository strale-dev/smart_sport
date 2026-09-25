import { FormCard } from "@/components/match/FormCard";
import { H2HCard } from "@/components/match/H2HCard";
import { MatchTeamsFixturesList } from "@/components/match/MatchTeamsFixturesList";
import { hydrateMatchOverviewFromProvider } from "@/lib/ingestion/ensure-match-overview";
import { mergeTeamFixtures } from "@/lib/match/merge-team-fixtures";
import { computeH2H, computeRecentForm } from "@/lib/services/analyticsService";
import { getFixturesForTeam } from "@/lib/services/footballService";
import type { Fixture } from "@/types/domain";

type MatchMatchesPanelProps = {
  fixture: Fixture;
  premiumAnalytics: boolean;
};

export async function MatchMatchesPanel({
  fixture,
  premiumAnalytics,
}: MatchMatchesPanelProps) {
  await hydrateMatchOverviewFromProvider(fixture);

  const [
    homeForm5,
    awayForm5,
    h2hAll,
    { data: homeTeamFixtures },
    { data: awayTeamFixtures },
  ] = await Promise.all([
    computeRecentForm(fixture.homeTeam.externalId, {
      matches: 5,
      scope: "ALL",
    }),
    computeRecentForm(fixture.awayTeam.externalId, {
      matches: 5,
      scope: "ALL",
    }),
    computeH2H(fixture.homeTeam.externalId, fixture.awayTeam.externalId, {
      windowSize: 10,
      scope: "ALL",
    }),
    getFixturesForTeam(fixture.homeTeam.externalId),
    getFixturesForTeam(fixture.awayTeam.externalId),
  ]);

  const [homeForm10, awayForm10, h2hSameComp] = await Promise.all([
    premiumAnalytics
      ? computeRecentForm(fixture.homeTeam.externalId, {
          matches: 10,
          scope: "ALL",
        })
      : Promise.resolve(homeForm5),
    premiumAnalytics
      ? computeRecentForm(fixture.awayTeam.externalId, {
          matches: 10,
          scope: "ALL",
        })
      : Promise.resolve(awayForm5),
    premiumAnalytics
      ? computeH2H(fixture.homeTeam.externalId, fixture.awayTeam.externalId, {
          windowSize: 10,
          scope: "SAME_COMP",
          leagueProviderId: fixture.league.externalId,
        })
      : Promise.resolve(h2hAll),
  ]);

  const relatedFixtures = mergeTeamFixtures(
    homeTeamFixtures,
    awayTeamFixtures,
    {
      excludeFixtureId: fixture.externalId,
    }
  );

  return (
    <>
      <FormCard
        fixture={fixture}
        homeForm5={homeForm5}
        homeForm10={homeForm10}
        awayForm5={awayForm5}
        awayForm10={awayForm10}
        premiumAnalytics={premiumAnalytics}
      />
      <H2HCard
        fixture={fixture}
        h2hAll={h2hAll}
        h2hSameComp={h2hSameComp}
        premiumAnalytics={premiumAnalytics}
      />
      <MatchTeamsFixturesList fixture={fixture} fixtures={relatedFixtures} />
    </>
  );
}
