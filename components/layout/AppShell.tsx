import type { ReactNode } from "react";

import { AppFooter } from "@/components/layout/AppFooter";
import { CookieConsentShell } from "@/components/marketing/CookieConsentShell";
import { MobileNav } from "@/components/layout/MobileNav";
import { TopNav } from "@/components/layout/TopNav";
import { NotificationBellContainer } from "@/components/notifications/NotificationBellContainer";
import { SoundPreferencesProvider } from "@/components/sound/SoundPreferencesProvider";
import { ViewerTimezoneProvider } from "@/components/providers/ViewerTimezoneProvider";
import type { SoundPreferences } from "@/lib/preferences/sound.server";
import type { AuthUserView } from "@/lib/supabase/user";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  className?: string;
  user: AuthUserView | null;
  viewerTimeZone: string;
  initialSoundPreferences: SoundPreferences | null;
};

export function AppShell({
  children,
  className,
  user,
  viewerTimeZone,
  initialSoundPreferences,
}: AppShellProps) {
  return (
    <ViewerTimezoneProvider initialTimeZone={viewerTimeZone}>
      <SoundPreferencesProvider
        userId={user?.id ?? null}
        initialServerPrefs={initialSoundPreferences}
      >
        <div className={cn("bg-background flex min-h-dvh flex-col", className)}>
          <TopNav
            user={user}
            notificationBell={
              user ? <NotificationBellContainer userId={user.id} /> : undefined
            }
          />

          <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col px-4 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-6">
            <div className="flex flex-1 flex-col items-center py-4 md:py-6">
              {children}
            </div>
          </main>

          <AppFooter />
          <MobileNav user={user} />
          <CookieConsentShell />
        </div>
      </SoundPreferencesProvider>
    </ViewerTimezoneProvider>
  );
}
