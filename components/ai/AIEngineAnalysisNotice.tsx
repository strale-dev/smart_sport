"use client";

import { SparklesIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import type { PrematchDisplayExperience } from "@/lib/ai/prematch-availability";

type AIEngineAnalysisNoticeProps = {
  experience: PrematchDisplayExperience;
  className?: string;
};

export function AIEngineAnalysisNotice({
  experience,
  className,
}: AIEngineAnalysisNoticeProps) {
  if (!experience.headline || !experience.description) {
    return null;
  }

  return (
    <EmptyState
      icon={SparklesIcon}
      title={experience.headline}
      description={experience.description}
      className={className}
    />
  );
}
