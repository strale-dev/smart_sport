"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { sanitizeTimezone } from "@/lib/datetime/timezone";
import { VIEWER_TIMEZONE_COOKIE } from "@/lib/datetime/viewer-timezone";

type ViewerTimezoneContextValue = {
  timeZone: string;
};

const ViewerTimezoneContext = createContext<ViewerTimezoneContextValue | null>(
  null
);

function readBrowserTimezone(): string {
  return sanitizeTimezone(
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC"
  );
}

function writeViewerTimezoneCookie(timeZone: string): void {
  document.cookie = `${VIEWER_TIMEZONE_COOKIE}=${encodeURIComponent(timeZone)}; path=/; max-age=31536000; SameSite=Lax`;
}

function subscribeToTimezoneChanges(): () => void {
  return () => {};
}

type ViewerTimezoneProviderProps = {
  initialTimeZone: string;
  children: ReactNode;
};

export function ViewerTimezoneProvider({
  initialTimeZone,
  children,
}: ViewerTimezoneProviderProps) {
  const router = useRouter();
  const serverTimeZone = sanitizeTimezone(initialTimeZone);

  const timeZone = useSyncExternalStore(
    subscribeToTimezoneChanges,
    readBrowserTimezone,
    () => serverTimeZone
  );

  useEffect(() => {
    const browserTimeZone = readBrowserTimezone();
    if (browserTimeZone === serverTimeZone) {
      return;
    }

    writeViewerTimezoneCookie(browserTimeZone);
    router.refresh();
  }, [router, serverTimeZone]);

  const value = useMemo(() => ({ timeZone }), [timeZone]);

  return (
    <ViewerTimezoneContext.Provider value={value}>
      {children}
    </ViewerTimezoneContext.Provider>
  );
}

export function useViewerTimezone(): string {
  const context = useContext(ViewerTimezoneContext);
  if (!context) {
    throw new Error(
      "useViewerTimezone must be used within ViewerTimezoneProvider"
    );
  }

  return context.timeZone;
}
