import type Dexie from "dexie";

export function configureMigrations(db: Dexie): void {
  // DB Version 1: Initial core entity stores and sync queue
  db.version(1).stores({
    tasks: "id, date, status, _syncStatus, _deletedAt, _updatedAt",
    habits: "id, name, category, _syncStatus, _deletedAt, _updatedAt",
    goals: "id, status, targetDate, _syncStatus, _deletedAt, _updatedAt",
    expenses: "id, category, transactionDate, _syncStatus, _deletedAt, _updatedAt",
    diary: "id, date, _syncStatus, _deletedAt, _updatedAt",
    notifications: "id, read, createdAt, _syncStatus, _deletedAt",
    syncQueue: "id, entity, entityId, operation, status, createdAt",
    syncMetadata: "key",
  });

  // DB Version 2: Index enhancements for sync queue lookup
  db.version(2).stores({
    tasks: "id, date, status, _syncStatus, _deletedAt, _updatedAt",
    habits: "id, name, category, _syncStatus, _deletedAt, _updatedAt",
    goals: "id, status, targetDate, _syncStatus, _deletedAt, _updatedAt",
    expenses: "id, category, transactionDate, _syncStatus, _deletedAt, _updatedAt",
    diary: "id, date, _syncStatus, _deletedAt, _updatedAt",
    notifications: "id, read, createdAt, _syncStatus, _deletedAt",
    syncQueue: "id, entity, entityId, operation, status, createdAt, [entity+entityId]",
    syncMetadata: "key",
  });
}
