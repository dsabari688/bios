import { useState, useEffect } from "react";
import { useStore } from "../store/useStore";

export function useSync() {
  const isOffline = useStore((state) => state.isOffline);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncNow = async () => {
    setIsSyncing(true);
    try {
      await useStore.getState().hydrateSystemData();
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isOnline: !isOffline,
    isSyncing,
    pendingCount: 0,
    failedCount: 0,
    lastSyncedAt: new Date().toISOString(),
    lastError: null,
    syncNow,
  };
}
