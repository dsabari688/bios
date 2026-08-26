export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  dedupeKey?: string | null;
  createdAt: string;
}

export interface CreateNotificationInput {
  type: string;
  title: string;
  message: string;
  dedupeKey?: string | null;
}
