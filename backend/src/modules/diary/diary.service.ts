import { diaryRepository } from "./diary.repository.js";
import type {
  CreateDiaryEntryInput,
  UpdateDiaryEntryInput,
} from "./diary.types.js";

export const diaryService = {
  async save(input: CreateDiaryEntryInput) {
    return diaryRepository.upsertByDate(input);
  },

  async findAll() {
    return diaryRepository.findAll();
  },

  async findById(id: string) {
    return diaryRepository.findById(id);
  },

  async update(id: string, input: UpdateDiaryEntryInput) {
    const existing = await diaryRepository.findById(id);

    if (!existing) {
      throw new Error("Diary entry not found");
    }

    const updated = await diaryRepository.update(id, input);

    if (!updated) {
      throw new Error("Failed to update diary entry");
    }

    return updated;
  },

  async delete(id: string) {
    const existing = await diaryRepository.findById(id);

    if (!existing) {
      throw new Error("Diary entry not found");
    }

    return diaryRepository.delete(id);
  },
};
