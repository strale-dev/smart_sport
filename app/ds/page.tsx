import type { Metadata } from "next";

import { DesignSystemPlayground } from "@/components/ds/design-system-playground";
import { AppShell } from "@/components/layout/AppShell";
import { resolveViewerTimezone } from "@/lib/datetime/viewer-timezone.server";
import { getAuthUserViewForSession, getCurrentUser } from "@/lib/supabase/user";

export const metadata: Metadata = {
  title: "Design System — Scorence",
  description: "Internal design system playground.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DesignSystemPage() {
  const [authUser, sessionUser] = await Promise.all([
    getAuthUserViewForSession(),
    getCurrentUser(),
  ]);
  const viewerTimeZone = await resolveViewerTimezone(sessionUser?.id ?? null);

  return (
    <AppShell
      user={authUser}
      viewerTimeZone={viewerTimeZone}
      initialSoundPreferences={null}
    >
      <DesignSystemPlayground />
    </AppShell>
  );
}
