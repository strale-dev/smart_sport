"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import { useCookieConsent } from "@/hooks/useCookieConsent";
import { captureAuthSuccess } from "@/lib/posthog/auth";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";
import { createClient } from "@/lib/supabase/client";

function AuthAnalyticsInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { consent } = useCookieConsent();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const event = searchParams.get("auth_event");
    if (event !== "login" && event !== "signup") {
      return;
    }

    const key = `${pathname}?${searchParams.toString()}`;
    if (handled.current === key) {
      return;
    }
    handled.current = key;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("auth_event");
    const query = nextParams.toString();
    const next = query ? `${pathname}?${query}` : pathname;
    router.replace(next, { scroll: false });

    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      await captureAuthSuccess({
        event:
          event === "signup"
            ? POSTHOG_EVENTS.signupCompleted
            : POSTHOG_EVENTS.loginCompleted,
        userId: user.id,
        consent,
      });
    })();
  }, [consent, pathname, router, searchParams]);

  return null;
}

export function AuthAnalytics() {
  return (
    <Suspense fallback={null}>
      <AuthAnalyticsInner />
    </Suspense>
  );
}
