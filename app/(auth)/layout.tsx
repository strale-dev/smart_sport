import Link from "next/link";

import { Wordmark } from "@/components/brand/Wordmark";
import { CookieConsentShell } from "@/components/marketing/CookieConsentShell";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <header className="border-border/60 bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <Link href="/" aria-label="Scorence home">
            <Wordmark size="nav" />
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </main>
      <CookieConsentShell />
    </div>
  );
}
