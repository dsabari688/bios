import { useState, useEffect } from "react";
import { syncManager } from "../sync/syncManager";
import type { SyncStateSummary } from "../sync/syncTypes";

export function useSync() {
  const [syncState, setSyncState] = useState<SyncStateSummary>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    lastSyncedAt: null,
    lastError: null,
  });

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((state) => {
      setSyncState(state);
    });
    return () => unsubscribe();
  }, []);

  const syncNow = () => {
    syncManager.triggerSync();
  };

  return {
    ...syncState,
    syncNow,
  };
}
