import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { BRAND } from "@/lib/marketing/copy";
import { resolveViewerTimezone } from "@/lib/datetime/viewer-timezone.server";
import { getSoundPreferences } from "@/lib/preferences/sound.server";
import { getAuthUserViewForSession, getCurrentUser } from "@/lib/supabase/user";

export const metadata: Metadata = {
  title: {
    template: `%s — ${BRAND.name}`,
    default: BRAND.name,
  },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authUser, sessionUser] = await Promise.all([
    getAuthUserViewForSession(),
    getCurrentUser(),
  ]);
  const [viewerTimeZone, initialSoundPreferences] = await Promise.all([
    resolveViewerTimezone(sessionUser?.id ?? null),
    sessionUser ? getSoundPreferences(sessionUser.id) : Promise.resolve(null),
  ]);

  return (
    <AppShell
      user={authUser}
      viewerTimeZone={viewerTimeZone}
      initialSoundPreferences={initialSoundPreferences}
    >
      {children}
    </AppShell>
  );
}
