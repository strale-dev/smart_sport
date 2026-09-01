import type { Metadata } from "next";
import { SparklesIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";

export const metadata: Metadata = {
  title: "Predictions",
};

export default function PredictionsPage() {
  return (
    <EmptyState
      icon={SparklesIcon}
      title="Predictions Center coming soon"
      description="High-confidence AI picks and probability insights will appear here."
    />
  );
}
