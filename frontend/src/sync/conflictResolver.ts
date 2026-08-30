export interface ConflictResolution<T> {
  resolvedItem: T;
  resolution: "client_won" | "server_won" | "merged";
  reason: string;
}

export function resolveEntityConflict<T extends Record<string, any>>(
  clientItem: T,
  serverItem: T
): ConflictResolution<T> {
  // Policy 1: Deletion tombstone check
  if (clientItem._deletedAt && !serverItem.deletedAt) {
    return {
      resolvedItem: clientItem,
      resolution: "client_won",
      reason: "client_tombstone_delete",
    };
  }

  if (serverItem.deletedAt && !clientItem._deletedAt) {
    return {
      resolvedItem: serverItem,
      resolution: "server_won",
      reason: "server_tombstone_delete",
    };
  }

  // Policy 2: Compare versions or timestamps
  const clientTime = new Date(clientItem._updatedAt || clientItem.updatedAt || 0).getTime();
  const serverTime = new Date(serverItem.updatedAt || 0).getTime();

  if (clientTime > serverTime) {
    return {
      resolvedItem: clientItem,
      resolution: "client_won",
      reason: "client_timestamp_newer",
    };
  }

  return {
    resolvedItem: serverItem,
    resolution: "server_won",
    reason: "server_timestamp_newer_or_equal",
  };
}
