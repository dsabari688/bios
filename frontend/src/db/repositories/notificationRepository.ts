import { db } from "../database";
import type { LocalNotification } from "../schema";
import { syncQueue } from "../../sync/syncQueue";

export const notificationRepository = {
  async getAll(): Promise<LocalNotification[]> {
    return db.notifications
      .filter((notif) => !notif._deletedAt)
      .toArray();
  },

  async save(notif: LocalNotification, isRemote: boolean = false): Promise<LocalNotification> {
    const now = new Date().toISOString();
    const isNew = !(await db.notifications.get(notif.id));

    const localNotif: LocalNotification = {
      ...notif,
      _updatedAt: notif._updatedAt || now,
      _syncStatus: isRemote ? "synced" : "pending",
    };

    await db.notifications.put(localNotif);

    if (!isRemote) {
      await syncQueue.enqueue(
        "notification",
        localNotif.id,
        isNew ? "create" : "update",
        localNotif
      );
    }

    return localNotif;
  },

  async saveAll(notifications: LocalNotification[], isRemote: boolean = false): Promise<void> {
    const prepared: LocalNotification[] = notifications.map((n) => ({
      ...n,
      _syncStatus: isRemote ? "synced" : "pending",
    }));
    await db.notifications.bulkPut(prepared);
  },

  async remove(id: string, isRemote: boolean = false): Promise<void> {
    const now = new Date().toISOString();
    const existing = await db.notifications.get(id);
    if (!existing) return;

    if (isRemote) {
      await db.notifications.delete(id);
    } else {
      const tombstoned: LocalNotification = {
        ...existing,
        _deletedAt: now,
        _syncStatus: "pending",
      };
      await db.notifications.put(tombstoned);
      await syncQueue.enqueue("notification", id, "delete", { id, deletedAt: now });
    }
  },

  async clear(): Promise<void> {
    await db.notifications.clear();
  },
};
