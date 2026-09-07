import type { Metadata } from "next";

import { MethodologyContent } from "@/lib/marketing/methodology-content";
import { BRAND } from "@/lib/marketing/copy";

export const metadata: Metadata = {
  title: "How our model works",
  description: `${BRAND.name} prediction methodology — Elo, logistic regression, Poisson goals, and AI explanations.`,
};

export default function MethodologyPage() {
  return <MethodologyContent />;
}
