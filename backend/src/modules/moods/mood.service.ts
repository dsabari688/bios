import { moodRepository } from "./mood.repository.js";
import type { CreateMoodInput } from "./mood.types.js";

const MOOD_SCORES: Record<string, number> = {
  Great: 5,
  Good: 4,
  Normal: 3,
  Low: 2,
  Bad: 1,
};

export const moodService = {
  async createMood(input: CreateMoodInput) {
    const score = MOOD_SCORES[input.mood];

    if (!score) {
      throw new Error("Invalid mood");
    }

    return moodRepository.create(input, score);
  },

  async getMoods() {
    return moodRepository.findAll();
  },

  async getTrend(limit = 7) {
    const safeLimit = Math.min(Math.max(limit, 1), 30);
    const moods = await moodRepository.findTrend(safeLimit);

    return moods.reverse();
  },
};
