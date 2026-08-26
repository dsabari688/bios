import type { HabitSyncConflict } from "./sync.types.js";
import { pickWinner } from "./changeTracker.js";

export interface ConflictDecision {
  applyClient: boolean;
  conflict: HabitSyncConflict | null;
}

export function resolveHabitConflict(
  clientItem: { updatedAt?: string; [key: string]: unknown },
  serverRow: Record<string, unknown>,
): ConflictDecision {
  const { winner, reason } = pickWinner(
    clientItem as unknown as Parameters<typeof pickWinner>[0],
    serverRow.updatedAt,
  );

  const applyClient = winner === "client";

  return {
    applyClient,
    conflict: {
      id: String(serverRow.id),
      resolution: applyClient ? "client_won" : "server_won",
      reason: reason as HabitSyncConflict["reason"],
    },
  };
}
