import type { Metadata } from "next";
import { RadioIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";

export const metadata: Metadata = {
  title: "Live",
};

export default function LivePage() {
  return (
    <EmptyState
      icon={RadioIcon}
      title="Live Center coming soon"
      description="Follow live matches with real-time scores and updates."
    />
  );
}
