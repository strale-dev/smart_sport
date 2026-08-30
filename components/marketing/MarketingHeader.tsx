import Link from "next/link";

import { Wordmark } from "@/components/brand/Wordmark";
import { cn } from "@/lib/utils";

export function MarketingHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "border-border/60 bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md",
        className
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="Scorence home">
          <Wordmark size="nav" />
        </Link>
        <nav aria-label="Marketing" className="flex items-center gap-6 text-sm">
          <a
            href="#features"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </a>
          <a
            href="#waitlist"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Waitlist
          </a>
        </nav>
      </div>
    </header>
  );
}
