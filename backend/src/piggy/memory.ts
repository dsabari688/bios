import { piggyStore } from "./piggyStore.js";

export interface PiggyMemoryFact {
  id: string;
  fact: string;
  category: string;
  importance: number;
  timestamp: number;
}

const VALID_CATEGORIES = new Set([
  "preference",
  "deadline",
  "exam",
  "constraint",
  "goal",
  "fact",
]);

export const piggyMemory = {
  async list(): Promise<PiggyMemoryFact[]> {
    const rows = await piggyStore.all<{
      id: string;
      fact: string;
      category: string;
      importance: number;
      created_at: Date;
    }>(
      `SELECT id, fact, category, importance, created_at
       FROM piggy_memory
       ORDER BY created_at DESC
       LIMIT 200`,
    );

    return rows.map((row) => ({
      id: row.id,
      fact: row.fact,
      category: row.category,
      importance: row.importance,
      timestamp: new Date(row.created_at).getTime(),
    }));
  },

  async save(
    fact: string,
    category: string,
    importance = 5,
  ): Promise<PiggyMemoryFact> {
    const normalizedCategory = VALID_CATEGORIES.has(category)
      ? category
      : "fact";

    const id = piggyStore.newId();

    await piggyStore.run(
      `INSERT INTO piggy_memory (id, fact, category, importance)
       VALUES ($1, $2, $3, $4)`,
      [id, fact.trim(), normalizedCategory, importance],
    );

    return {
      id,
      fact: fact.trim(),
      category: normalizedCategory,
      importance,
      timestamp: Date.now(),
    };
  },

  async remove(id: string): Promise<boolean> {
    const existing = await piggyStore.all(
      "SELECT id FROM piggy_memory WHERE id = $1",
      [id],
    );

    if (existing.length === 0) {
      return false;
    }

    await piggyStore.run("DELETE FROM piggy_memory WHERE id = $1", [
      id,
    ]);

    return true;
  },

  async retrieveRelevant(query: string, limit = 6): Promise<string[]> {
    const keywords = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3);

    if (keywords.length === 0) {
      const top = await this.list();
      return top.slice(0, limit).map((item) => item.fact);
    }

    const all = await this.list();

    const scored = all
      .map((item) => {
        const haystack = `${item.fact} ${item.category}`.toLowerCase();
        let score = item.importance / 10;

        for (const keyword of keywords) {
          if (haystack.includes(keyword)) {
            score += 1;
          }
        }

        return { fact: item.fact, score };
      })
      .filter((item) => item.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map((item) => item.fact);
  },
};
