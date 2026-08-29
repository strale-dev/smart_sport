import type { Metadata } from "next";

import { TermsContent } from "@/lib/legal/terms-content";
import { legalMeta } from "@/lib/marketing/copy";

export const metadata: Metadata = {
  title: legalMeta.terms.title,
  description: legalMeta.terms.description,
};

export default function TermsPage() {
  return <TermsContent />;
}
