"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { toast } from "@/components/ui/toast";

const NOTICE_MESSAGES: Record<string, { title: string; description: string }> =
  {
    match_not_found: {
      title: "Match not found",
      description:
        "That fixture is not in our database. Browse upcoming matches below.",
    },
  };

function FixturesNoticeInner() {
  const searchParams = useSearchParams();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) {
      return;
    }

    const notice = searchParams.get("notice");
    const message = notice ? NOTICE_MESSAGES[notice] : undefined;

    if (!message) {
      return;
    }

    shown.current = true;
    toast.add({
      type: "info",
      title: message.title,
      description: message.description,
    });
  }, [searchParams]);

  return null;
}

export function FixturesNotice() {
  return (
    <Suspense fallback={null}>
      <FixturesNoticeInner />
    </Suspense>
  );
}
