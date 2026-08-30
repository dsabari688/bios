import Dexie, { type Table } from "dexie";
import type {
  LocalTask,
  LocalHabit,
  LocalGoal,
  LocalExpense,
  LocalDiaryEntry,
  LocalNotification,
  MetaKV,
} from "./schema";
import type { SyncQueueItem } from "../sync/syncTypes";
import { configureMigrations } from "./migrations";

export class LifeOSDatabase extends Dexie {
  tasks!: Table<LocalTask, string>;
  habits!: Table<LocalHabit, string>;
  goals!: Table<LocalGoal, string>;
  expenses!: Table<LocalExpense, string>;
  diary!: Table<LocalDiaryEntry, string>;
  notifications!: Table<LocalNotification, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  syncMetadata!: Table<MetaKV, string>;

  constructor() {
    super("LifeOSDatabase");
    configureMigrations(this);
  }
}

export const db = new LifeOSDatabase();
