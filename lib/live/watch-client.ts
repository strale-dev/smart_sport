const HEARTBEAT_INTERVAL_MS = 60_000;

export type LiveWatchRegistrationBody =
  { surface: "match"; fixtureProviderId: number } | { surface: "live-center" };

async function postWatch(
  body: LiveWatchRegistrationBody
): Promise<{ watchToken: string } | null> {
  try {
    const response = await fetch("/api/live/watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      ok?: boolean;
      watchToken?: string;
    };

    if (!data.ok || !data.watchToken) {
      return null;
    }

    return { watchToken: data.watchToken };
  } catch {
    return null;
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
  if (typeof navigator === "undefined" || !navigator.sendBeacon) {
    void fetch("/api/live/unwatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchToken }),
      keepalive: true,
    });
    return;
  }

  navigator.sendBeacon(
    "/api/live/unwatch",
    new Blob([JSON.stringify({ watchToken })], {
      type: "application/json",
    })
  );
}

export function startLiveWatchSession(
  body: LiveWatchRegistrationBody
): () => void {
  let watchToken: string | null = null;
  let heartbeatId: number | null = null;
  let cancelled = false;

  void (async () => {
    const registered = await postWatch(body);
    if (cancelled || !registered) {
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
            if (next) {
              watchToken = next.watchToken;
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
    if (watchToken) {
      sendUnwatchBeacon(watchToken);
    }
  };
}
