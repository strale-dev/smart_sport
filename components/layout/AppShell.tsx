import type { ReactNode } from "react";

import { MobileNav } from "@/components/layout/MobileNav";
import { TopNav } from "@/components/layout/TopNav";
import type { AuthUserView } from "@/lib/supabase/user";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  className?: string;
  user: AuthUserView | null;
};

export function AppShell({ children, className, user }: AppShellProps) {
  return (
    <div className={cn("flex min-h-full flex-col", className)}>
      <TopNav user={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>

      <MobileNav user={user} />
    </div>
  );
}
