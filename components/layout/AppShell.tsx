import type { ReactNode } from "react";

import { MobileNav } from "@/components/layout/MobileNav";
import { TopNav } from "@/components/layout/TopNav";
import { ViewerTimezoneProvider } from "@/components/providers/ViewerTimezoneProvider";
import type { AuthUserView } from "@/lib/supabase/user";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  className?: string;
  user: AuthUserView | null;
  viewerTimeZone: string;
};

export function AppShell({
  children,
  className,
  user,
  viewerTimeZone,
}: AppShellProps) {
  return (
    <ViewerTimezoneProvider initialTimeZone={viewerTimeZone}>
      <div className={cn("bg-background flex min-h-dvh flex-col", className)}>
        <TopNav user={user} />

        <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col px-4 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-6">
          <div className="flex flex-1 flex-col items-center py-4 md:py-6">
            {children}
          </div>
        </main>

        <MobileNav user={user} />
      </div>
    </ViewerTimezoneProvider>
  );
}
