import { UserIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";

export default function PlayerNotFound() {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center">
      <EmptyState
        icon={UserIcon}
        title="Player not found"
        description="This player is not in our database yet, or the link is invalid."
      />
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href="/fixtures" />}
      >
        Browse fixtures
      </Button>
    </div>
  );
}
