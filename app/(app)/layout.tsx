import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { BRAND } from "@/lib/marketing/copy";
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

  return (
    <AppShell user={user ? toAuthUserView(user) : null}>{children}</AppShell>
  );
}
