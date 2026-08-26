import { diaryApi } from "../api/diary.api";
import type { DiaryEntry } from "../types";

export const diaryService = {
  async getAll() {
    return diaryApi.getAll();
  },

  async getById(id: string) {
    return diaryApi.getById(id);
  },

  async create(input: {
    date: string;
    timestamp: string;
    content: string;
    review: string;
    mood: string;
    productivityScore: number;
  }) {
    return diaryApi.create(input);
  },

  async delete(id: string) {
    return diaryApi.delete(id);
  }
};
