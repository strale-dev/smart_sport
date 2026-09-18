"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center px-4">
        <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
          <Wordmark className="h-8" />
          <div className="space-y-2">
            <p className="text-primary font-mono text-sm tabular-nums">500</p>
            <h1 className="font-heading text-xl font-semibold">
              Something went wrong
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              An unexpected error occurred. Our team has been notified. Try
              refreshing or return home.
            </p>
            {error.digest ? (
              <p className="text-muted-foreground font-mono text-xs">
                Reference: {error.digest}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={() => window.location.reload()}>
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href="/" />}
            >
              Back to home
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
