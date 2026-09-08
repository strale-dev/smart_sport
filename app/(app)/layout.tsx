import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { BRAND } from "@/lib/marketing/copy";
import { resolveViewerTimezone } from "@/lib/datetime/viewer-timezone.server";
import { getCurrentUser, toAuthUserView } from "@/lib/supabase/user";

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
  const user = await getCurrentUser();
  const viewerTimeZone = await resolveViewerTimezone(user?.id ?? null);

  return (
    <AppShell
      user={user ? toAuthUserView(user) : null}
      viewerTimeZone={viewerTimeZone}
    >
      {children}
    </AppShell>
  );
}
