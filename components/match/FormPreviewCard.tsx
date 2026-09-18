import Link from "next/link";

import { FormCompactSummary } from "@/components/match/form-display";
import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import { Button } from "@/components/ui/button";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardDescription,
  MatchCardFooter,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";
import { buildMatchHref } from "@/lib/fixtures/match-url";
import type { Fixture, FormSnapshot } from "@/types/domain";
import { TrendingUpIcon } from "lucide-react";
type FormPreviewCardProps = {
  fixture: Pick<
    Fixture,
    "externalId" | "status" | "homeTeam" | "awayTeam" | "league"
  >;
  homeForm5: FormSnapshot;
  awayForm5: FormSnapshot;
  windowSize?: number;
};

function TeamFormPreviewSection({
  fixture,
  teamName,
  teamExternalId,
  form,
}: {
  fixture: FormPreviewCardProps["fixture"];
  teamName: string;
  teamExternalId: number;
  form: FormSnapshot;
}) {
  if (form.results.length === 0) {
    return (
      <MatchEmptyStateFromFixture
        id="formTeam"
        fixture={fixture}
        teamName={teamName}
        teamExternalId={teamExternalId}
        icon={TrendingUpIcon}
        className="py-4"
      />
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{teamName}</h3>
      <FormCompactSummary form={form} />
    </div>
  );
}

export function FormPreviewCard({
  fixture,
  homeForm5,
  awayForm5,
  windowSize = 5,
}: FormPreviewCardProps) {
  const matchesHref = buildMatchHref(fixture.externalId, "matches");
  const bothEmpty =
    homeForm5.results.length === 0 && awayForm5.results.length === 0;
  const hasAnyForm = !bothEmpty;

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader className="gap-2">
        <MatchCardTitle>Recent form</MatchCardTitle>
        <MatchCardDescription>
          Last {windowSize} · All competitions
        </MatchCardDescription>
      </MatchCardHeader>
      <MatchCardContent className="space-y-4">
        <TeamFormPreviewSection
          fixture={fixture}
          teamName={fixture.homeTeam.name}
          teamExternalId={fixture.homeTeam.externalId}
          form={homeForm5}
        />
        <TeamFormPreviewSection
          fixture={fixture}
          teamName={fixture.awayTeam.name}
          teamExternalId={fixture.awayTeam.externalId}
          form={awayForm5}
        />
      </MatchCardContent>
      {hasAnyForm ? (
        <MatchCardFooter className="border-border/70 border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={matchesHref} />}
          >
            See full form on Matches
          </Button>
        </MatchCardFooter>
      ) : null}
    </MatchAnalyticsCard>
  );
}
