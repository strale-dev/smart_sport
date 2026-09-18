import Link from "next/link";

import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RouteNotFoundProps = {
  title: string;
  description: string;
  className?: string;
};

export function RouteNotFound({
  title,
  description,
  className,
}: RouteNotFoundProps) {
  return (
    <div
      className={cn(
        "flex w-full max-w-md flex-col items-center gap-6 px-4 py-10 text-center",
        className
      )}
    >
      <Link href="/" className="inline-flex" aria-label="Scorence home">
        <Wordmark className="h-8" />
      </Link>
      <div className="space-y-2">
        <p className="text-primary font-mono text-sm tabular-nums">404</p>
        <h1 className="font-heading text-xl font-semibold">{title}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" nativeButton={false} render={<Link href="/" />}>
          Home
        </Button>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href="/fixtures" />}
        >
          Fixtures
        </Button>
        <Button
          size="sm"
          variant="ghost"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          Log in
        </Button>
      </div>
    </div>
  );
}
