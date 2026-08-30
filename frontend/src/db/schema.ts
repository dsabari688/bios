import type { Task, Habit, Goal, Expense, DiaryEntry, SystemNotification } from "../types";
import type { SyncStatusState, SyncQueueItem } from "../sync/syncTypes";

export interface LocalTask extends Task {
  _version?: number;
  _syncStatus?: SyncStatusState;
  _deletedAt?: string | null;
  _updatedAt?: string;
}

export interface LocalHabit extends Habit {
  _version?: number;
  _syncStatus?: SyncStatusState;
  _deletedAt?: string | null;
  _updatedAt?: string;
}

export interface LocalGoal extends Goal {
  _version?: number;
  _syncStatus?: SyncStatusState;
  _deletedAt?: string | null;
  _updatedAt?: string;
}

export interface LocalExpense extends Expense {
  _version?: number;
  _syncStatus?: SyncStatusState;
  _deletedAt?: string | null;
  _updatedAt?: string;
}

export interface LocalDiaryEntry extends DiaryEntry {
  _version?: number;
  _syncStatus?: SyncStatusState;
  _deletedAt?: string | null;
  _updatedAt?: string;
}

export interface LocalNotification extends SystemNotification {
  _version?: number;
  _syncStatus?: SyncStatusState;
  _deletedAt?: string | null;
  _updatedAt?: string;
}

export interface MetaKV {
  key: string;
  value: any;
}
