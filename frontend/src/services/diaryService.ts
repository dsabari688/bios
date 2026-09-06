import { diaryRepository } from "../db/repositories/diaryRepository";
import { diaryApi } from "../api/diary.api";
import { useStore } from "../store/useStore";
import type { DiaryEntry } from "../types";

export const diaryService = {
  async getAll(): Promise<DiaryEntry[]> {
    try {
      const remote = await diaryApi.getAll();
      if (Array.isArray(remote) && remote.length > 0) {
        for (const de of remote) {
          await diaryRepository.save(de as any, true).catch(() => {});
        }
      }
    } catch {}
    return diaryRepository.getAll() as Promise<DiaryEntry[]>;
  },

  async getById(id: string): Promise<DiaryEntry | undefined> {
    return diaryRepository.getById(id);
  },

  async create(input: {
    date: string;
    timestamp: string;
    content: string;
    review: string;
    mood: string;
    productivityScore: number;
  }): Promise<DiaryEntry> {
    const newEntry: DiaryEntry = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `diary-${Date.now()}`,
      date: input.date,
      timestamp: input.timestamp || new Date().toISOString(),
      content: input.content,
      review: input.review || "",
      mood: input.mood || "neutral",
      productivityScore: input.productivityScore || 50,
    };

    const saved = await diaryRepository.save(newEntry);
    try {
      await diaryApi.create({
        date: input.date,
        timestamp: input.timestamp || new Date().toISOString(),
        content: input.content,
        review: input.review || "",
        mood: input.mood || "neutral",
        productivityScore: input.productivityScore || 50,
      });
    } catch (e) {
      console.warn("Direct diary create deferred:", e);
    }
    useStore.getState().hydrateSystemData();
    return saved;
  },

  async delete(id: string): Promise<{ id: string }> {
    await diaryRepository.remove(id);
    try {
      await diaryApi.delete(id);
    } catch (e) {
      console.warn("Direct diary delete deferred:", e);
    }
    useStore.getState().hydrateSystemData();
    return { id };
  },
};
