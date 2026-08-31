import { notificationRepository } from "./notification.repository.js";

export const notificationService = {
  async getNotifications(limit?: number) {
    const safeLimit =
      typeof limit === "number" &&
      Number.isFinite(limit) &&
      limit > 0
        ? Math.min(Math.floor(limit), 200)
        : 50;

    return notificationRepository.findAll(safeLimit);
  },

  async markAsRead(id: string) {
    const notification =
      await notificationRepository.markRead(id);

    if (!notification) {
      throw new Error("Notification not found");
    }

    return notification;
  },

  async createNotification(input: { type?: string; title: string; message: string; dedupeKey?: string }) {
    return notificationRepository.create({
      type: input.type || "system",
      title: input.title,
      message: input.message,
      dedupeKey: input.dedupeKey,
    });
  },
};
