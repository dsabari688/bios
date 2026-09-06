import { notificationRepository } from "../db/repositories/notificationRepository";
import { useStore } from "../store/useStore";
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
    useStore.getState().hydrateSystemData();
  },

  async addNotification(notif: Omit<SystemNotification, "id">): Promise<SystemNotification> {
    const newNotif: SystemNotification = {
      ...notif,
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `notif-${Date.now()}`,
    };

    const saved = await notificationRepository.save(newNotif);
    useStore.getState().hydrateSystemData();
    return saved;
  },
};
