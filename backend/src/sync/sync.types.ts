export interface HabitSyncItem {
  id: string;
  name: string;
  frequency?: string;
  streak?: number;
  logs?: string[];
  skippedDaysCount?: number;
  icon?: string | null;
  category?: string;
  targetValue?: number | null;
  unit?: string | null;
  stepIncrement?: number | null;
  dailyProgress?: Record<string, number>;
  notes?: string | null;
  updatedAt?: string;
}

export interface HabitSyncRequest {
  habits: HabitSyncItem[];
}

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
  habits: unknown[];
  appliedClientChanges: number;
  serverWins: number;
  conflicts: HabitSyncConflict[];
  syncedAt: string;
}
