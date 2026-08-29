import type { Metadata } from "next";

import { PrivacyContent } from "@/lib/legal/privacy-content";
import { legalMeta } from "@/lib/marketing/copy";

export const metadata: Metadata = {
  title: legalMeta.privacy.title,
  description: legalMeta.privacy.description,
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
