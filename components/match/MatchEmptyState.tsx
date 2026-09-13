import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import {
  buildMatchEmptyContext,
  getMatchEmptyState,
  type MatchEmptyContext,
  type MatchEmptyStateId,
} from "@/lib/match/empty-states";
type MatchEmptyStateProps = {
  id: MatchEmptyStateId;
  context: MatchEmptyContext;
  icon?: LucideIcon;
  className?: string;
};

export function MatchEmptyState({
  id,
  context,
  icon,
  className,
}: MatchEmptyStateProps) {
  const { title, description, actions } = getMatchEmptyState(id, context);

  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      actions={actions}
      className={className}
    />
  );
}

type MatchEmptyFixtureInput = Parameters<typeof buildMatchEmptyContext>[0];

type MatchEmptyStateFromFixtureProps = Omit<MatchEmptyStateProps, "context"> & {
  fixture: MatchEmptyFixtureInput;
  teamName?: string;
  teamExternalId?: number;
};

export function MatchEmptyStateFromFixture({
  fixture,
  teamName,
  teamExternalId,
  ...rest
}: MatchEmptyStateFromFixtureProps) {
  const context = buildMatchEmptyContext(fixture, {
    teamName,
    teamExternalId,
  });

  return <MatchEmptyState context={context} {...rest} />;
}
