"use client";

import { useCaptureLandingView } from "@/hooks/useCaptureLandingView";

export function LandingAnalytics() {
  useCaptureLandingView();
  return null;
}
