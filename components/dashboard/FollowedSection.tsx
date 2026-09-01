import { UsersIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";

export function FollowedSection() {
  return (
    <EmptyState
      icon={UsersIcon}
      title="No followed teams yet"
      description="Follow clubs and players to see personalized updates here. Following arrives in a later release."
    />
  );
}
