import { db } from "../db/database";
import type { SyncQueueItem, SyncEntity, SyncOperationType } from "./syncTypes";
import { getDeviceId } from "./deviceIdentity";

export const syncQueue = {
  async enqueue(
    entity: SyncEntity,
    entityId: string,
    operation: SyncOperationType,
    payload: Record<string, any>,
    userId: string = "current_user"
  ): Promise<SyncQueueItem> {
    const deviceId = getDeviceId();
    const now = new Date().toISOString();

    // Check for existing pending operations for this entity to coalesce
    const existing = await db.syncQueue
      .where({ entity, entityId })
      .filter((item) => item.status === "pending")
      .toArray();

    if (existing.length > 0) {
      const prev = existing[0];

      // Rule: CREATE + DELETE -> remove operation entirely if never pushed
      if (prev.operation === "create" && operation === "delete") {
        await db.syncQueue.delete(prev.id);
        return prev;
      }

      // Rule: CREATE + UPDATE -> keep CREATE with merged payload
      if (prev.operation === "create" && operation === "update") {
        const updated: SyncQueueItem = {
          ...prev,
          payload: { ...prev.payload, ...payload },
          updatedAt: now,
        };
        await db.syncQueue.put(updated);
        return updated;
      }

      // Rule: UPDATE + UPDATE -> keep single UPDATE with merged payload
      if (prev.operation === "update" && operation === "update") {
        const updated: SyncQueueItem = {
          ...prev,
          payload: { ...prev.payload, ...payload },
          updatedAt: now,
        };
        await db.syncQueue.put(updated);
        return updated;
      }

      // Rule: UPDATE + DELETE -> replace with DELETE
      if (prev.operation === "update" && operation === "delete") {
        const updated: SyncQueueItem = {
          ...prev,
          operation: "delete",
          payload,
          updatedAt: now,
        };
        await db.syncQueue.put(updated);
        return updated;
      }
    }

    const newItem: SyncQueueItem = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `op-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      entity,
      entityId,
      operation,
      payload,
      userId,
      deviceId,
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      status: "pending",
    };

    await db.syncQueue.put(newItem);
    return newItem;
  },

  async resetStuckSyncing(): Promise<void> {
    await db.syncQueue.where("status").equals("syncing").modify({ status: "pending" });
  },

  async revertSyncingToPending(id: string): Promise<void> {
    const item = await db.syncQueue.get(id);
    if (item && item.status === "syncing") {
      await db.syncQueue.update(id, { status: "pending" });
    }
  },

  async getPending(): Promise<SyncQueueItem[]> {
    await this.resetStuckSyncing();
    // Auto-retry failed operations on sync attempt
    await db.syncQueue.where("status").equals("failed").modify({ status: "pending", retryCount: 0 });
    return db.syncQueue
      .where("status")
      .equals("pending")
      .sortBy("createdAt");
  },

  async getFailed(): Promise<SyncQueueItem[]> {
    return db.syncQueue
      .where("status")
      .equals("failed")
      .toArray();
  },

  async markSyncing(ids: string[]): Promise<void> {
    await db.syncQueue.where("id").anyOf(ids).modify({ status: "syncing" });
  },

  async markFailed(id: string, errorMessage: string): Promise<void> {
    const item = await db.syncQueue.get(id);
    if (!item) return;
    const retryCount = item.retryCount + 1;
    const status = retryCount >= 5 ? "failed" : "pending";
    await db.syncQueue.update(id, {
      status,
      retryCount,
      errorMessage,
      updatedAt: new Date().toISOString(),
    });
  },

  async remove(ids: string[]): Promise<void> {
    await db.syncQueue.bulkDelete(ids);
  },

  async clear(): Promise<void> {
    await db.syncQueue.clear();
  },
};
