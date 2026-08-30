import { syncEngine } from "./syncEngine";
import { connectionMonitor } from "./connectionMonitor";
import { syncQueue } from "./syncQueue";
import { syncRepository } from "../db/repositories/syncRepository";
import type { SyncStateSummary } from "./syncTypes";

type SyncStateListener = (state: SyncStateSummary) => void;

export class SyncManager {
  private isSyncingLock: boolean = false;
  private isNetworkOnline: boolean = false;
  private isServerReachable: boolean = false;
  private listeners: Set<SyncStateListener> = new Set();
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;

  constructor() {
    connectionMonitor.subscribe((isServerReachable, isNetworkOnline) => {
      const wasReachable = this.isServerReachable;
      this.isServerReachable = isServerReachable;
      this.isNetworkOnline = isNetworkOnline;

      if (!wasReachable && isServerReachable) {
        console.log("[SYNC] Reconnected to server. Triggering auto-sync.");
        this.triggerSync();
      } else {
        this.notify();
      }
    });

    syncRepository.getLastSyncedAt().then((ts) => {
      if (ts) this.lastSyncedAt = ts;
      this.notify();
    });

    // Start real-time 5-second background auto-sync timer
    this.startAutoSyncInterval();
  }

  private autoSyncInterval: any = null;

  public startAutoSyncInterval(intervalMs: number = 5000): void {
    if (this.autoSyncInterval) clearInterval(this.autoSyncInterval);
    this.autoSyncInterval = setInterval(() => {
      if (this.isServerReachable && !this.isSyncingLock) {
        this.triggerSync();
      }
    }, intervalMs);
  }

  public async triggerSync(): Promise<void> {
    if (this.isSyncingLock) {
      console.log("[SYNC] Sync process locked (already running).");
      return;
    }

    if (!this.isServerReachable) {
      console.log("[SYNC] Server unreachable. Sync deferred.");
      return;
    }

    this.isSyncingLock = true;
    this.lastError = null;
    this.notify();

    try {
      console.log("[SYNC] Sync cycle started.");
      const pushRes = await syncEngine.pushPending();
      const pullRes = await syncEngine.pullChanges();
      this.lastSyncedAt = new Date().toISOString();
      console.log(`[SYNC] Cycle finished: Pushed ${pushRes.pushedCount}, Pulled ${pullRes.pulledCount}.`);

      if (pushRes.pushedCount > 0 || pullRes.pulledCount > 0) {
        import("../store/useStore")
          .then(({ useStore }) => {
            if (typeof useStore.getState().hydrateSystemData === "function") {
              useStore.getState().hydrateSystemData();
            }
          })
          .catch((err) => console.warn("[SYNC] Store hydration notice failed:", err));
      }
    } catch (err: any) {
      this.lastError = err.message || "Sync execution failed";
      console.error("[SYNC] Sync cycle error:", err);
    } finally {
      this.isSyncingLock = false;
      this.notify();
    }
  }

  public subscribe(listener: SyncStateListener): () => void {
    this.listeners.add(listener);
    this.getStateSummary().then((state) => listener(state));
    return () => this.listeners.delete(listener);
  }

  public async getStateSummary(): Promise<SyncStateSummary> {
    const pending = await syncQueue.getPending();
    const failed = await syncQueue.getFailed();

    return {
      isOnline: this.isServerReachable,
      isSyncing: this.isSyncingLock,
      pendingCount: pending.length,
      failedCount: failed.length,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    };
  }

  private async notify() {
    const state = await this.getStateSummary();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

export const syncManager = new SyncManager();
