import { apiRequest } from "./client";
import type { DiaryEntry } from "../types";

interface BackendDiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD string from backend DATE column
  timestamp: string;
  content: string;
  review: string;
  mood: string;
  productivityScore: number;
  createdAt?: string;
  updatedAt?: string;
}

function backendToDiaryEntry(row: BackendDiaryEntry): DiaryEntry {
  return {
    id: row.id,
    date: row.date.slice(0, 10),
    timestamp: new Date(row.timestamp).toISOString(),
    content: row.content ?? "",
    review: row.review ?? "",
    mood: row.mood ?? "",
    productivityScore: Number(row.productivityScore)
  };
}

export const diaryApi = {
  async getAll(): Promise<DiaryEntry[]> {
    const rows = await apiRequest<BackendDiaryEntry[]>("/diary");
    return (rows || []).map(backendToDiaryEntry);
  },

  async getById(id: string): Promise<DiaryEntry> {
    const row = await apiRequest<BackendDiaryEntry>(`/diary/${id}`);
    return backendToDiaryEntry(row);
  },

  async create(input: {
    date: string;
    timestamp: string;
    content: string;
    review: string;
    mood: string;
    productivityScore: number;
  }): Promise<DiaryEntry> {
    const row = await apiRequest<BackendDiaryEntry>("/diary", {
      method: "POST",
      body: JSON.stringify({
        date: input.date,
        timestamp: input.timestamp,
        content: input.content,
        review: input.review,
        mood: input.mood,
        productivityScore: input.productivityScore
      }),
    });
    return backendToDiaryEntry(row);
  },

  async delete(id: string): Promise<{ id: string; deleted: boolean }> {
    return apiRequest<{ id: string; deleted: boolean }>(`/diary/${id}`, {
      method: "DELETE",
    });
  }
};

