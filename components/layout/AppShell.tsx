import type { ReactNode } from "react";
import { HomeIcon, RadioIcon, TrophyIcon } from "lucide-react";

import { Wordmark } from "@/components/brand/Wordmark";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  className?: string;
};

const navPlaceholders = [
  { label: "Dashboard", icon: HomeIcon },
  { label: "Live", icon: RadioIcon },
  { label: "Matches", icon: TrophyIcon },
] as const;

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className={cn("flex min-h-full flex-col", className)}>
      <header className="border-border bg-background/95 sticky top-0 z-40 border-b backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
          <Wordmark size="nav" />
          <nav
            aria-label="Primary"
            className="hidden items-center gap-6 md:flex"
          >
            {navPlaceholders.map((item) => (
              <span
                key={item.label}
                className="text-muted-foreground text-sm"
                aria-disabled="true"
              >
                {item.label}
              </span>
            ))}
          </nav>
          <div
            className="bg-muted text-muted-foreground hidden h-8 w-8 items-center justify-center text-xs md:flex"
            aria-hidden="true"
          >
            U
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>

      <nav
        aria-label="Mobile"
        className="border-border bg-background/95 sticky bottom-0 z-40 border-t backdrop-blur-sm md:hidden"
      >
        <div className="mx-auto flex h-14 max-w-6xl items-stretch justify-around">
          {navPlaceholders.map((item) => {
            const Icon = item.icon;
            return (
              <span
                key={item.label}
                className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-1 text-[10px]"
                aria-disabled="true"
              >
                <Icon aria-hidden="true" className="size-4" />
                {item.label}
              </span>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
