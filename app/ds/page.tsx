import type { Metadata } from "next";

import { DesignSystemPlayground } from "@/components/ds/design-system-playground";
import { AppShell } from "@/components/layout/AppShell";
import { resolveViewerTimezone } from "@/lib/datetime/viewer-timezone.server";
import { getCurrentUser, toAuthUserView } from "@/lib/supabase/user";

export const metadata: Metadata = {
  title: "Design System — Scorence",
  description: "Internal design system playground.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DesignSystemPage() {
  const user = await getCurrentUser();
  const viewerTimeZone = await resolveViewerTimezone(user?.id ?? null);

  return (
    <AppShell
      user={user ? toAuthUserView(user) : null}
      viewerTimeZone={viewerTimeZone}
    >
      <DesignSystemPlayground />
    </AppShell>
  );
}
