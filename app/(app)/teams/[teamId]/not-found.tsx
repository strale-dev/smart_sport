import { ShieldIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";

export default function TeamNotFound() {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center">
      <EmptyState
        icon={ShieldIcon}
        title="Team not found"
        description="This club is not in our database yet, or the link is invalid."
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
