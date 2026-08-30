import { notificationRepository } from "../db/repositories/notificationRepository";
import { syncManager } from "../sync/syncManager";
import type { SystemNotification } from "../types";

export const notificationService = {
  async getSystemNotifications(): Promise<SystemNotification[]> {
    return notificationRepository.getAll() as Promise<SystemNotification[]>;
  },

  async markRead(id: string): Promise<void> {
    const all = await notificationRepository.getAll();
    const existing = all.find((n) => n.id === id);
    if (!existing) return;

    await notificationRepository.save({
      ...existing,
      read: true,
    });
    syncManager.triggerSync();
  },

  async addNotification(notif: Omit<SystemNotification, "id">): Promise<SystemNotification> {
    const newNotif: SystemNotification = {
      ...notif,
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `notif-${Date.now()}`,
    };

    const saved = await notificationRepository.save(newNotif);
    syncManager.triggerSync();
    return saved;
  },
};
