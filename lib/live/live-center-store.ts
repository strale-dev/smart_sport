import { LIVE_POLL_INTERVAL_MS } from "@/lib/live/constants";
import type { LiveCenterData } from "@/lib/services/liveService";

type LiveCenterStore = {
  data: LiveCenterData;
  listeners: Set<() => void>;
};

const stores = new Map<string, LiveCenterStore>();

function getStore(
  apiHref: string,
  initialData: LiveCenterData
): LiveCenterStore {
  const existing = stores.get(apiHref);
  if (existing) {
    return existing;
  }

  const store: LiveCenterStore = {
    data: initialData,
    listeners: new Set(),
  };
  stores.set(apiHref, store);
  return store;
}

export function subscribeLiveCenterData(
  apiHref: string,
  initialData: LiveCenterData,
  onStoreChange: () => void
): () => void {
  const store = getStore(apiHref, initialData);
  store.data = initialData;
  store.listeners.add(onStoreChange);

  let cancelled = false;

  async function refreshLiveCenter() {
    try {
      const response = await fetch(apiHref, { cache: "no-store" });
      if (!response.ok || cancelled) {
        return;
      }

      const nextData = (await response.json()) as LiveCenterData;
      if (cancelled) {
        return;
      }

      const currentStore = stores.get(apiHref);
      if (!currentStore) {
        return;
      }

      currentStore.data = nextData;
      for (const listener of currentStore.listeners) {
        listener();
      }
    } catch {
      // Keep showing the last successful payload during transient failures.
    }
  }

  const intervalId = window.setInterval(
    refreshLiveCenter,
    LIVE_POLL_INTERVAL_MS
  );

  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
    store.listeners.delete(onStoreChange);

    if (store.listeners.size === 0) {
      stores.delete(apiHref);
    }
  };
}

export function getLiveCenterSnapshot(
  apiHref: string,
  initialData: LiveCenterData
): LiveCenterData {
  return getStore(apiHref, initialData).data;
}

export function getLiveCenterServerSnapshot(
  initialData: LiveCenterData
): LiveCenterData {
  return initialData;
}
