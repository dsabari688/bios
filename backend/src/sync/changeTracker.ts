import type { HabitSyncItem } from "./sync.types.js";

export type SyncWinner = "client" | "server";

export function parseUpdatedAt(
  value: unknown,
): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function pickWinner(
  clientItem: HabitSyncItem,
  serverUpdatedAt: unknown,
): { winner: SyncWinner; reason: string } {
  const clientDate = parseUpdatedAt(clientItem.updatedAt);
  const serverDate = parseUpdatedAt(serverUpdatedAt);

  if (!clientDate && !serverDate) {
    return { winner: "server", reason: "identical" };
  }

  if (!clientDate) {
    return {
      winner: "server",
      reason: "missing_client_timestamp",
    };
  }

  if (!serverDate) {
    return { winner: "client", reason: "client_newer" };
  }

  if (clientDate.getTime() > serverDate.getTime()) {
    return { winner: "client", reason: "client_newer" };
  }

  if (clientDate.getTime() < serverDate.getTime()) {
    return { winner: "server", reason: "server_newer" };
  }

  return { winner: "server", reason: "identical" };
}
