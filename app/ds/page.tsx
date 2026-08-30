import type { Metadata } from "next";

import { DesignSystemPlayground } from "@/components/ds/design-system-playground";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Design System — Scorence",
  description: "Internal design system playground.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignSystemPage() {
  return (
    <AppShell>
      <DesignSystemPlayground />
    </AppShell>
  );
}
