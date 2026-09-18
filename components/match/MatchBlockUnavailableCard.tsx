import { RefreshCwIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";

type MatchBlockUnavailableCardProps = {
  title: string;
  retryHref: string;
};

export function MatchBlockUnavailableCard({
  title,
  retryHref,
}: MatchBlockUnavailableCardProps) {
  return (
    <MatchAnalyticsCard>
      <MatchCardHeader>
        <MatchCardTitle>{title}</MatchCardTitle>
      </MatchCardHeader>
      <MatchCardContent>
        <EmptyState
          icon={RefreshCwIcon}
          title="Temporarily unavailable"
          description="We could not reach the data provider for this section. It should recover on its own shortly."
          actions={[
            { label: "Try again", href: retryHref, variant: "outline" },
          ]}
        />
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
