import { apiRequest } from "./client";
import type { Habit } from "../types";

export interface HabitSyncConflict {
  id: string;
  resolution: "server_won" | "client_won";
  reason:
    | "client_newer"
    | "server_newer"
    | "missing_client_timestamp"
    | "inserted_from_client"
    | "identical";
}

export interface HabitSyncResult {
  habits: Habit[];
  appliedClientChanges: number;
  serverWins: number;
  conflicts: HabitSyncConflict[];
  syncedAt: string;
}

export const syncApi = {
  async getStatus(): Promise<{
    status: string;
    habitsOnServer: number;
    strategies: string[];
    entities: string[];
  }> {
    return apiRequest("/sync/status");
  },

  async pushHabits(
    habits: Array<Partial<Habit>>,
  ): Promise<HabitSyncResult> {
    return apiRequest<HabitSyncResult>("/sync/habits", {
      method: "POST",
      body: JSON.stringify({ habits }),
    });
  },
};

