import { db } from "../database";
import type { SyncMetadata } from "../../sync/syncTypes";

export const syncRepository = {
  async getMetadata(key: string): Promise<any | undefined> {
    const item = await db.syncMetadata.get(key);
    return item ? item.value : undefined;
  },

  async setMetadata(key: string, value: any): Promise<void> {
    await db.syncMetadata.put({ key, value });
  },

  async getLastSyncCursor(): Promise<string | undefined> {
    return this.getMetadata("lastSyncCursor");
  },

  async setLastSyncCursor(cursor: string): Promise<void> {
    await this.setMetadata("lastSyncCursor", cursor);
  },

  async getLastSyncedAt(): Promise<string | undefined> {
    return this.getMetadata("lastSyncedAt");
  },

  async setLastSyncedAt(timestamp: string): Promise<void> {
    await this.setMetadata("lastSyncedAt", timestamp);
  },
};
