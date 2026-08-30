export type SyncEntity =
  | "task"
  | "habit"
  | "goal"
  | "expense"
  | "diary"
  | "notification"
  | "mood";

export type SyncOperationType = "create" | "update" | "delete";

export type SyncItemStatus = "pending" | "syncing" | "failed" | "conflict";

export type SyncStatusState = "synced" | "pending" | "syncing" | "failed" | "conflict";

export interface SyncMetadata {
  syncStatus: SyncStatusState;
  version: number;
  lastSyncedAt?: string;
  updatedAt: string;
  deletedAt?: string | null;
  deviceId: string;
}

export interface SyncQueueItem {
  id: string;
  entity: SyncEntity;
  entityId: string;
  operation: SyncOperationType;
  payload: Record<string, any>;
  userId: string;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  status: "pending" | "syncing" | "failed";
  errorMessage?: string;
}

export interface PushOperation {
  id: string; // operationId
  entity: SyncEntity;
  entityId: string;
  operation: SyncOperationType;
  payload: Record<string, any>;
  clientUpdatedAt: string;
  version: number;
}

export interface SyncPushPayload {
  deviceId: string;
  operations: PushOperation[];
}

export interface PushOperationResult {
  operationId: string;
  entity: SyncEntity;
  entityId: string;
  status: "accepted" | "rejected" | "conflict";
  serverVersion: number;
  serverItem?: Record<string, any>;
  reason?: string;
}

export interface SyncPushResponse {
  results: PushOperationResult[];
  processedAt: string;
}

export interface SyncPullPayload {
  deviceId: string;
  lastSyncCursor?: string;
}

export interface PullEntityChange {
  entity: SyncEntity;
  entityId: string;
  operation: SyncOperationType;
  data: Record<string, any>;
  version: number;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface SyncPullResponse {
  changes: PullEntityChange[];
  newCursor: string;
  hasMore: boolean;
}

export interface SyncStateSummary {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}
