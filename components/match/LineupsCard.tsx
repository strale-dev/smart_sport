import { UsersIcon } from "lucide-react";

import { LineupAvailabilityOnly } from "@/components/match/lineups/LineupAvailabilityOnly";
import { LineupFieldView } from "@/components/match/lineups/LineupFieldView";
import { Badge } from "@/components/ui/badge";
import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";
import {
  buildLineupViewModel,
  lineupViewModelHasContent,
  lineupViewModelHasPitchContent,
} from "@/lib/lineups/build-lineup-view-model";
import type { BuildLineupViewModelInput } from "@/lib/lineups/types";
import type { Fixture } from "@/types/domain";

type LineupsCardProps = BuildLineupViewModelInput & {
  fixture: Fixture;
};

export function LineupsCard(props: LineupsCardProps) {
  const { fixture, ...input } = props;
  const model = buildLineupViewModel({ fixture, ...input });
  const hasPitch = lineupViewModelHasPitchContent(model);
  const hasAnyContent = lineupViewModelHasContent(model, input.sidelined);

  if (!hasAnyContent) {
    return (
      <MatchAnalyticsCard>
        <MatchCardHeader>
          <MatchCardTitle>Lineups</MatchCardTitle>
        </MatchCardHeader>
        <MatchCardContent>
          <MatchEmptyStateFromFixture
            id="lineups"
            fixture={fixture}
            icon={UsersIcon}
          />
        </MatchCardContent>
      </MatchAnalyticsCard>
    );
  }

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader>
        <MatchCardTitle>Lineups</MatchCardTitle>
      </MatchCardHeader>
      <MatchCardContent className="space-y-4">
        {hasPitch ? (
          <LineupFieldView model={model} variant="full" />
        ) : (
          <>
            <Badge variant="outline">{model.statusLabel}</Badge>
            <LineupAvailabilityOnly
              fixture={fixture}
              sidelined={input.sidelined}
            />
          </>
        )}
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
