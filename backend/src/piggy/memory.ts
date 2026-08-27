import { piggyStore } from "./piggyStore.js";
import { qdrant, COLLECTION_NAME } from "./qdrant.js";
import { createEmbedding } from "./memory/embedding.service.js";
import { preprocessQuery } from "./retrieval/queryPreprocessor.js";
import { rerankMemories } from "./retrieval/reranker.js";
import { deduplicateMemories } from "./retrieval/deduplicator.js";
import { detectMemoryConflicts } from "./memory/conflictResolver.js";

export interface PiggyMemoryFact {
  id: string;
  fact: string;
  category: string;
  importance: number;
  status: "active" | "superseded" | "archived";
  supersededBy?: string | null;
  confidence: number;
  validFrom: string;
  validUntil?: string | null;
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

const DEFAULT_TOP_K = Number(
  process.env.PIGGY_MEMORY_TOP_K ?? "6",
);

const DEFAULT_MIN_SIMILARITY = Number(
  process.env.PIGGY_MEMORY_MIN_SIMILARITY ?? "0.55",
);

export interface PiggyMemorySearchResult {
  id: string;
  fact: string;
  category?: string;
  importance?: number;
  status?: string;
  score: number;
  rank: number;
}

export const piggyMemory = {
  async list(status: "active" | "all" = "active"): Promise<PiggyMemoryFact[]> {
    const sql = status === "all"
      ? `SELECT id, fact, category, importance, status, superseded_by, confidence, valid_from, valid_until, created_at
         FROM piggy_memory
         ORDER BY created_at DESC
         LIMIT 200`
      : `SELECT id, fact, category, importance, status, superseded_by, confidence, valid_from, valid_until, created_at
         FROM piggy_memory
         WHERE status = 'active'
         ORDER BY created_at DESC
         LIMIT 200`;

    const rows = await piggyStore.all<{
      id: string;
      fact: string;
      category: string;
      importance: number;
      status: string;
      superseded_by: string | null;
      confidence: number;
      valid_from: Date;
      valid_until: Date | null;
      created_at: Date;
    }>(sql);

    return rows.map((row) => ({
      id: row.id,
      fact: row.fact,
      category: row.category,
      importance: row.importance,
      status: (row.status as PiggyMemoryFact["status"]) || "active",
      supersededBy: row.superseded_by,
      confidence: Number(row.confidence ?? 1.0),
      validFrom: new Date(row.valid_from).toISOString(),
      validUntil: row.valid_until ? new Date(row.valid_until).toISOString() : null,
      timestamp: new Date(row.created_at).getTime(),
    }));
  },

  async save(
    fact: string,
    category: string,
    importance = 5,
  ): Promise<PiggyMemoryFact> {
    const cleanFact = fact.trim();

    if (!cleanFact) {
      throw new Error("[PIGGY][MEMORY] Cannot save empty memory");
    }

    const normalizedCategory = VALID_CATEGORIES.has(category)
      ? category
      : "fact";

    // 0. Deduplicate exact existing active facts.
    const existing = await piggyStore.all<{
      id: string;
      fact: string;
      category: string;
      importance: number;
      status: string;
      superseded_by: string | null;
      confidence: number;
      valid_from: Date;
      valid_until: Date | null;
      created_at: Date;
    }>(
      `SELECT id, fact, category, importance, status, superseded_by, confidence, valid_from, valid_until, created_at
       FROM piggy_memory
       WHERE LOWER(fact) = LOWER($1) AND status = 'active'`,
      [cleanFact],
    );

    if (existing.length > 0) {
      console.log(
        `[PIGGY][MEMORY] active fact already exists (${existing[0].id}), returning existing record`,
      );
      return {
        id: existing[0].id,
        fact: existing[0].fact,
        category: existing[0].category,
        importance: existing[0].importance,
        status: (existing[0].status as PiggyMemoryFact["status"]) || "active",
        supersededBy: existing[0].superseded_by,
        confidence: Number(existing[0].confidence ?? 1.0),
        validFrom: new Date(existing[0].valid_from).toISOString(),
        validUntil: existing[0].valid_until ? new Date(existing[0].valid_until).toISOString() : null,
        timestamp: new Date(existing[0].created_at).getTime(),
      };
    }

    // 1. Conflict resolution: Check if new memory conflicts with existing active memories
    const activeMemories = await this.list("active");
    const conflictResult = detectMemoryConflicts(cleanFact, normalizedCategory, activeMemories);

    const newId = crypto.randomUUID();

    if (conflictResult.hasConflict) {
      console.log(`[PIGGY][MEMORY] Conflict detected for "${cleanFact}": ${conflictResult.reason}`);
      for (const oldId of conflictResult.supersededMemoryIds) {
        // Mark old memory as superseded in PostgreSQL
        await piggyStore.run(
          `UPDATE piggy_memory
           SET status = 'superseded', valid_until = NOW(), superseded_by = $1, updated_at = NOW()
           WHERE id = $2`,
          [newId, oldId],
        );

        // Update status in Qdrant payload
        try {
          await qdrant.setPayload(COLLECTION_NAME, {
            points: [oldId],
            payload: { status: "superseded", supersededBy: newId },
          });
        } catch (err) {
          console.error(`[PIGGY][MEMORY] Qdrant status update failed for ${oldId}:`, err);
        }
      }
    }

    // 2. Insert new canonical memory in PostgreSQL.
    await piggyStore.run(
      `INSERT INTO piggy_memory
        (id, fact, category, importance, status, confidence, valid_from)
       VALUES ($1, $2, $3, $4, 'active', 1.0, NOW())`,
      [newId, cleanFact, normalizedCategory, importance],
    );

    try {
      // 3. Convert memory into a semantic vector.
      const vector = await createEmbedding(cleanFact);

      // 4. Store vector in Qdrant with status metadata.
      await qdrant.upsert(COLLECTION_NAME, {
        wait: true,
        points: [
          {
            id: newId,
            vector,
            payload: {
              memoryId: newId,
              fact: cleanFact,
              category: normalizedCategory,
              importance,
              status: "active",
              validFrom: new Date().toISOString(),
            },
          },
        ],
      });

      console.log(
        `[PIGGY][MEMORY] saved + indexed active memory ${newId}`,
      );
    } catch (error) {
      console.error(
        "[PIGGY][MEMORY] Qdrant indexing failed:",
        error instanceof Error ? error.message : error,
      );
    }

    return {
      id: newId,
      fact: cleanFact,
      category: normalizedCategory,
      importance,
      status: "active",
      supersededBy: null,
      confidence: 1.0,
      validFrom: new Date().toISOString(),
      validUntil: null,
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

    await piggyStore.run(
      "DELETE FROM piggy_memory WHERE id = $1",
      [id],
    );

    try {
      await qdrant.delete(COLLECTION_NAME, {
        wait: true,
        points: [id],
      });
    } catch (error) {
      console.error(
        "[PIGGY][MEMORY] Qdrant delete failed:",
        error instanceof Error ? error.message : error,
      );
    }

    return true;
  },

  async retrieveRelevantWithDetails(
    query: string,
    limit = DEFAULT_TOP_K,
    minSimilarity = DEFAULT_MIN_SIMILARITY,
    options: { includeSuperseded?: boolean } = {},
  ): Promise<PiggyMemorySearchResult[]> {
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      return [];
    }

    const isHistoricalQuery =
      options.includeSuperseded ??
      /\b(old|previous|used to|past|former|earlier|before|prior)\b/i.test(cleanQuery);

    const preprocessedQuery = preprocessQuery(cleanQuery);

    try {
      // 1. Embed the user's query.
      const queryVector = await createEmbedding(cleanQuery);

      // 2. Fetch candidate set from Qdrant with candidate expansion.
      const candidateLimit = Math.max(limit * 3, 10);
      const response = await qdrant.query(COLLECTION_NAME, {
        query: queryVector,
        limit: candidateLimit,
        with_payload: true,
      });

      const results = response.points;
      const candidateResults: PiggyMemorySearchResult[] = [];

      for (const result of results) {
        const payload = result.payload as {
          memoryId?: string;
          fact?: unknown;
          category?: string;
          importance?: number;
          status?: string;
        } | null;

        const status = typeof payload?.status === "string" ? payload.status : "active";

        // Skip superseded or archived memories UNLESS it's a historical query
        if (status !== "active" && !isHistoricalQuery) {
          continue;
        }

        const fact = typeof payload?.fact === "string" ? payload.fact : "";
        if (fact) {
          candidateResults.push({
            id: typeof payload?.memoryId === "string" ? payload.memoryId : String(result.id),
            fact,
            category: typeof payload?.category === "string" ? payload.category : undefined,
            importance: typeof payload?.importance === "number" ? payload.importance : undefined,
            status,
            score: result.score,
            rank: candidateResults.length + 1,
          });
        }
      }

      if (candidateResults.length > 0) {
        // 3. Deduplicate candidates
        const deduplicated = deduplicateMemories(candidateResults);

        // 4. Rerank memories based on composite score
        const reranked = rerankMemories(deduplicated, preprocessedQuery, {
          minCompositeScore: 0.20,
        });

        // 5. Slice to requested top-K limit
        const finalResults = reranked.slice(0, limit).map((item, idx) => ({
          ...item,
          rank: idx + 1,
        }));

        if (finalResults.length > 0) {
          return finalResults;
        }
      }
    } catch (error) {
      console.error(
        "[PIGGY][MEMORY] semantic search failed:",
        error instanceof Error ? error.message : error,
      );
    }

    // Fallback to PostgreSQL active/all memory keyword matching.
    const memoryList = await this.list(isHistoricalQuery ? "all" : "active");
    const keywords = preprocessedQuery.tokens;

    if (keywords.length === 0 || memoryList.length === 0) {
      return [];
    }

    const scored = memoryList
      .map((item) => {
        const haystack = `${item.fact} ${item.category}`.toLowerCase();
        let score = item.importance / 10;

        for (const keyword of keywords) {
          if (haystack.includes(keyword)) {
            score += 1.0;
          }
        }

        return {
          id: item.id,
          fact: item.fact,
          category: item.category,
          importance: item.importance,
          status: item.status,
          score,
        };
      })
      .filter((item) => item.score >= 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    return scored;
  },

  async retrieveRelevant(
    query: string,
    limit = DEFAULT_TOP_K,
    minSimilarity = DEFAULT_MIN_SIMILARITY,
    options?: { includeSuperseded?: boolean },
  ): Promise<string[]> {
    const detailed = await this.retrieveRelevantWithDetails(query, limit, minSimilarity, options);
    return detailed.map((item) =>
      item.status && item.status !== "active"
        ? `${item.fact} [status: ${item.status}]`
        : item.fact
    );
  },
};
