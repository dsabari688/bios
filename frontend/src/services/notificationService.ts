import { notificationsApi } from "../api/notifications.api";
import type { SystemNotification } from "../types";

function mapNotificationType(
  backendType: string,
): SystemNotification["type"] {
  if (backendType === "habit_reminder") {
    return "reminder";
  }

  if (backendType === "streak") {
    return "streak";
  }

  if (backendType === "budget") {
    return "budget";
  }

  return "warning";
}

export const notificationService = {
  async getSystemNotifications(): Promise<
    SystemNotification[]
  > {
    const rows =
      await notificationsApi.getAll(50);

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      timestamp: row.createdAt,
      type: mapNotificationType(row.type),
      read: row.read,
    }));
  },

  async markRead(id: string) {
    return notificationsApi.markRead(id);
  },
};
