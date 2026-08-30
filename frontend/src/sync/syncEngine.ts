import { syncQueue } from "./syncQueue";
import { getDeviceId } from "./deviceIdentity";
import { getApiBaseUrl } from "../api/client";
import { taskRepository } from "../db/repositories/taskRepository";
import { habitRepository } from "../db/repositories/habitRepository";
import { goalRepository } from "../db/repositories/goalRepository";
import { expenseRepository } from "../db/repositories/expenseRepository";
import { diaryRepository } from "../db/repositories/diaryRepository";
import { notificationRepository } from "../db/repositories/notificationRepository";
import { syncRepository } from "../db/repositories/syncRepository";
import { taskCategoryToFront } from "../api/tasks.api";
import type { SyncPushPayload, SyncPushResponse, SyncPullPayload, SyncPullResponse } from "./syncTypes";

export class SyncEngine {
  private backoffMs: number = 1000;
  private maxBackoffMs: number = 30000;

  private getToken(): string {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = localStorage.getItem("token") || localStorage.getItem("lifeos_token");
      if (stored && stored.trim() !== "") return stored;
    }
    return "mock_jwt_token_lifeos_dashboard";
  }

  public async pushPending(): Promise<{ pushedCount: number; errors: number }> {
    const pending = await syncQueue.getPending();
    if (pending.length === 0) {
      return { pushedCount: 0, errors: 0 };
    }

    const deviceId = getDeviceId();
    const token = this.getToken();
    const baseUrl = getApiBaseUrl();

    const payload: SyncPushPayload = {
      deviceId,
      operations: pending.map((item) => ({
        id: item.id,
        entity: item.entity,
        entityId: item.entityId,
        operation: item.operation,
        payload: item.payload,
        clientUpdatedAt: item.updatedAt,
        version: item.payload._version || 1,
      })),
    };

    try {
      await syncQueue.markSyncing(pending.map((p) => p.id));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${baseUrl}/sync/push`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      clearTimeout(timeoutId);

      if (res.status === 401 || res.status === 403) {
        console.error("[SYNC] Authentication failure (401/403). Stopping retry.");
        for (const item of pending) {
          await syncQueue.markFailed(item.id, "Authentication failure");
        }
        return { pushedCount: 0, errors: pending.length };
      }

      if (!res.ok) {
        for (const item of pending) {
          await syncQueue.revertSyncingToPending(item.id);
        }
        throw new Error(`HTTP Error ${res.status}`);
      }

      const data: SyncPushResponse = await res.json();
      let pushedCount = 0;
      let errors = 0;

      if (data && Array.isArray(data.results)) {
        for (const result of data.results) {
          if (result.status === "accepted" || result.status === "conflict") {
            pushedCount++;
            await syncQueue.remove([result.operationId]);
            await this.markEntitySynced(result.entity, result.entityId, result.serverItem);
          } else {
            errors++;
            await syncQueue.markFailed(result.operationId, result.reason || "Rejected by server");
          }
        }
      } else {
        for (const item of pending) {
          await syncQueue.revertSyncingToPending(item.id);
        }
      }

      this.resetBackoff();
      return { pushedCount, errors };
    } catch (err: any) {
      console.warn(`[SYNC] Push failed: ${err.message}. Applying backoff.`);
      for (const item of pending) {
        await syncQueue.revertSyncingToPending(item.id);
      }
      this.increaseBackoff();
      return { pushedCount: 0, errors: pending.length };
    }
  }

  public async pullChanges(): Promise<{ pulledCount: number }> {
    const deviceId = getDeviceId();
    const token = this.getToken();
    const baseUrl = getApiBaseUrl();

    const lastSyncCursor = await syncRepository.getLastSyncCursor();

    const payload: SyncPullPayload = {
      deviceId,
      lastSyncCursor,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${baseUrl}/sync/pull`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      clearTimeout(timeoutId);

      if (!res.ok) return { pulledCount: 0 };

      const data: SyncPullResponse = await res.json();
      let pulledCount = 0;

      for (const change of data.changes) {
        pulledCount++;
        if (change.operation === "delete") {
          await this.removeLocalEntity(change.entity, change.entityId);
        } else {
          await this.saveLocalEntity(change.entity, change.data);
        }
      }

      if (data.newCursor) {
        await syncRepository.setLastSyncCursor(data.newCursor);
      }
      await syncRepository.setLastSyncedAt(new Date().toISOString());

      return { pulledCount };
    } catch (err) {
      console.warn("[SYNC] Pull failed:", err);
      return { pulledCount: 0 };
    }
  }

  private async markEntitySynced(entity: string, id: string, serverItem?: any) {
    switch (entity) {
      case "task":
        await taskRepository.markSynced(id, serverItem);
        break;
      case "habit":
        await habitRepository.markSynced(id, serverItem);
        break;
      case "goal":
        await goalRepository.markSynced(id, serverItem);
        break;
      case "expense":
        await expenseRepository.markSynced(id, serverItem);
        break;
      case "diary":
      case "mood":
        await diaryRepository.markSynced(id, serverItem);
        break;
    }
  }

  private async saveLocalEntity(entity: string, data: any) {
    switch (entity) {
      case "task": {
        const existing = await taskRepository.getById(data.id);
        const getLocalYYYYMMDD = (d: Date = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        let dateStr = getLocalYYYYMMDD();
        if (data.date && typeof data.date === "string") {
          const match = data.date.match(/^(\d{4}-\d{2}-\d{2})/);
          if (match) dateStr = match[1];
        }
        const normalized = {
          ...data,
          category: taskCategoryToFront(data.category),
          date: dateStr,
          time: data.time || "09:00",
          status: data.status === "completed" ? "completed" : "pending",
        };
        if (existing && existing.title === normalized.title && existing.status === normalized.status && existing.date === normalized.date) {
          // Already identical locally, skip duplicate save to prevent re-hydration loops
          break;
        }
        await taskRepository.save(normalized, true);
        break;
      }
      case "habit":
        await habitRepository.save(data, true);
        break;
      case "goal":
        await goalRepository.save(data, true);
        break;
      case "expense":
        await expenseRepository.save(data, true);
        break;
      case "diary":
      case "mood":
        await diaryRepository.save(data, true);
        break;
      case "notification":
        await notificationRepository.save(data, true);
        break;
    }
    this.syncToLocalStorage(entity, data);
  }

  private syncToLocalStorage(entity: string, item: any) {
    try {
      const raw = localStorage.getItem("lifeos_data");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data) return;

      let key = "";
      if (entity === "task") key = "tasks";
      else if (entity === "habit") key = "habits";
      else if (entity === "goal") key = "goals";
      else if (entity === "expense") key = "expenses";
      else if (entity === "diary" || entity === "mood") key = "diaryEntries";
      else if (entity === "notification") key = "notifications";

      if (key && Array.isArray(data[key])) {
        const idx = data[key].findIndex((x: any) => {
          if (x.id === item.id) return true;
          if ((entity === "diary" || entity === "mood") && item.date && x.date) {
            return x.date.slice(0, 10) === item.date.slice(0, 10);
          }
          return false;
        });
        if (idx !== -1) {
          data[key][idx] = { ...data[key][idx], ...item };
        } else {
          data[key].push(item);
        }
        localStorage.setItem("lifeos_data", JSON.stringify(data));
      }
    } catch (e) {
      console.warn("Failed to sync updated entity to localStorage:", e);
    }
  }

  private purgeFromLocalStorage(entity: string, id: string) {
    try {
      const raw = localStorage.getItem("lifeos_data");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data) return;

      let key = "";
      if (entity === "task") key = "tasks";
      else if (entity === "habit") key = "habits";
      else if (entity === "goal") key = "goals";
      else if (entity === "expense") key = "expenses";
      else if (entity === "diary" || entity === "mood") key = "diaryEntries";
      else if (entity === "notification") key = "notifications";

      if (key && Array.isArray(data[key])) {
        data[key] = data[key].filter((item: any) => item.id !== id);
        localStorage.setItem("lifeos_data", JSON.stringify(data));
      }
    } catch (e) {
      console.warn("Failed to purge deleted entity from localStorage:", e);
    }
  }

  private async removeLocalEntity(entity: string, id: string) {
    this.purgeFromLocalStorage(entity, id);
    switch (entity) {
      case "task":
        await taskRepository.remove(id, true);
        break;
      case "habit":
        await habitRepository.remove(id, true);
        break;
      case "goal":
        await goalRepository.remove(id, true);
        break;
      case "expense":
        await expenseRepository.remove(id, true);
        break;
      case "diary":
      case "mood":
        await diaryRepository.remove(id, true);
        break;
      case "notification":
        await notificationRepository.remove(id, true);
        break;
    }
  }

  private increaseBackoff() {
    this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
  }

  private resetBackoff() {
    this.backoffMs = 1000;
  }

  public getNextBackoffMs(): number {
    return this.backoffMs;
  }
}

export const syncEngine = new SyncEngine();
