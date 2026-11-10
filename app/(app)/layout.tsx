import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { BRAND } from "@/lib/marketing/copy";
import { resolveViewerTimezone } from "@/lib/datetime/viewer-timezone.server";
import { getSoundPreferences } from "@/lib/preferences/sound.server";
import { getAuthUserViewForSession } from "@/lib/supabase/user";

/** Session shell uses cookies — must not statically bake guest UI at build time. */
export const dynamic = "force-dynamic";

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
  const authUser = await getAuthUserViewForSession();
  const sessionUserId = authUser?.id ?? null;
  const [viewerTimeZone, initialSoundPreferences] = await Promise.all([
    resolveViewerTimezone(sessionUserId),
    sessionUserId ? getSoundPreferences(sessionUserId) : Promise.resolve(null),
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
