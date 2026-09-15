import { LIVE_USER_ACTIVE_WATCH_HEARTBEAT_MS } from "@/lib/live/constants";

const HEARTBEAT_INTERVAL_MS = LIVE_USER_ACTIVE_WATCH_HEARTBEAT_MS;

export type LiveWatchRegistrationBody =
  { surface: "match"; fixtureProviderId: number } | { surface: "live-center" };

export type LiveWatchErrorCode =
  | "LIVE_SIMULTANEOUS_LIMIT"
  | "LIVE_DAILY_LIMIT"
  | "AI_LIMIT_REACHED"
  | "live_polling_disabled"
  | "network";

export type LiveWatchResult =
  | { ok: true; watchToken: string }
  | { ok: false; code: LiveWatchErrorCode; limit?: number; used?: number };

async function postWatch(
  body: LiveWatchRegistrationBody
): Promise<LiveWatchResult> {
  try {
    const response = await fetch("/api/live/watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = (await response.json()) as {
      ok?: boolean;
      watchToken?: string;
      code?: LiveWatchErrorCode;
      error?: string;
      limit?: number;
      used?: number;
    };

    if (response.status === 429 && data.code) {
      return {
        ok: false,
        code: data.code,
        limit: data.limit,
        used: data.used,
      };
    }

    if (!response.ok || !data.ok || !data.watchToken) {
      return {
        ok: false,
        code:
          data.error === "live_polling_disabled"
            ? "live_polling_disabled"
            : "network",
      };
    }

    return { ok: true, watchToken: data.watchToken };
  } catch {
    return { ok: false, code: "network" };
  }
}

async function postHeartbeat(watchToken: string): Promise<boolean> {
  try {
    const response = await fetch("/api/live/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchToken }),
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as { ok?: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}

function sendUnwatchBeacon(watchToken: string): void {
  const payload = JSON.stringify({ watchToken });

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/live/unwatch",
      new Blob([payload], {
        type: "application/json",
      })
    );
    return;
  }

  void fetch("/api/live/unwatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  });
}

export type StartLiveWatchSessionOptions = {
  onWatchError?: (result: Extract<LiveWatchResult, { ok: false }>) => void;
};

export function startLiveWatchSession(
  body: LiveWatchRegistrationBody,
  options: StartLiveWatchSessionOptions = {}
): () => void {
  let watchToken: string | null = null;
  let heartbeatId: number | null = null;
  let cancelled = false;

  const unwatch = () => {
    if (watchToken) {
      sendUnwatchBeacon(watchToken);
      watchToken = null;
    }
  };

  const onPageHide = () => {
    unwatch();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      unwatch();
    }
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
  }

  void (async () => {
    const registered = await postWatch(body);
    if (cancelled) {
      return;
    }

    if (!registered.ok) {
      options.onWatchError?.(registered);
      return;
    }

    watchToken = registered.watchToken;

    heartbeatId = window.setInterval(() => {
      if (!watchToken) {
        return;
      }

      void postHeartbeat(watchToken).then((alive) => {
        if (!alive && watchToken) {
          void postWatch(body).then((next) => {
            if (next.ok) {
              watchToken = next.watchToken;
            } else {
              options.onWatchError?.(next);
            }
          });
        }
      });
    }, HEARTBEAT_INTERVAL_MS);
  })();

  return () => {
    cancelled = true;
    if (heartbeatId != null) {
      window.clearInterval(heartbeatId);
    }
    unwatch();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    }
  };
}
