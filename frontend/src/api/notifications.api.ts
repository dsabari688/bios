import { apiRequest } from "./client";
import type { SystemNotification } from "../types";

interface BackendNotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  dedupeKey?: string | null;
  createdAt: string;
}

export const notificationsApi = {
  async getAll(limit = 50): Promise<BackendNotificationRow[]> {
    return apiRequest<BackendNotificationRow[]>(
      `/notifications?limit=${limit}`,
    );
  },

  async markRead(id: string): Promise<BackendNotificationRow> {
    return apiRequest<BackendNotificationRow>(
      `/notifications/${id}/read`,
      {
        method: "PATCH",
      },
    );
  },
};

export type { BackendNotificationRow };
export type { SystemNotification };
