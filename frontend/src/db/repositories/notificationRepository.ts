import { db } from "../database";
import type { LocalNotification } from "../schema";

export const notificationRepository = {
  async getAll(): Promise<LocalNotification[]> {
    return db.notifications
      .filter((notif) => !notif._deletedAt)
      .toArray();
  },

  async save(notif: LocalNotification, isRemote: boolean = false): Promise<LocalNotification> {
    const now = new Date().toISOString();

    const localNotif: LocalNotification = {
      ...notif,
      _updatedAt: notif._updatedAt || now,
      _syncStatus: isRemote ? "synced" : "pending",
    };

    await db.notifications.put(localNotif);
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
    const existing = await db.notifications.get(id);
    if (!existing) return;
    await db.notifications.delete(id);
  },

  async clear(): Promise<void> {
    await db.notifications.clear();
  },
};
