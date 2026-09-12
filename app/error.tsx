"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/common/ErrorState";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4 py-16">
      <ErrorState
        title="This page failed to load"
        description="A server error stopped this view. You can retry without leaving Scorence."
        onRetry={retry}
      />
    </div>
  );
}
