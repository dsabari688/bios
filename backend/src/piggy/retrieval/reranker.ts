import type { PiggyMemorySearchResult } from "../memory.js";
import type { PreprocessedQuery } from "./queryPreprocessor.js";

export interface RerankedMemorySearchResult extends PiggyMemorySearchResult {
  compositeScore: number;
  keywordScore: number;
}

export interface RerankerOptions {
  weights?: {
    semantic?: number;
    keyword?: number;
    category?: number;
    importance?: number;
  };
  minCompositeScore?: number;
}

const DEFAULT_WEIGHTS = {
  semantic: 0.35,
  keyword: 0.35,
  category: 0.20,
  importance: 0.10,
};

const CATEGORY_MAP: Record<string, string[]> = {
  preference: ["prefer", "preference", "preferences", "like", "love", "favorite", "usually", "drink", "beverage"],
  goal: ["goal", "goals", "target", "targets", "aim", "want", "aspire", "become", "improve"],
  deadline: ["due", "deadline", "by", "until", "target"],
  exam: ["exam", "test", "quiz", "assessment"],
  constraint: ["cannot", "avoid", "only", "must"],
};

function stem(word: string): string {
  const w = word.toLowerCase().trim();
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function rerankMemories(
  candidates: PiggyMemorySearchResult[],
  query: PreprocessedQuery,
  options?: RerankerOptions,
): RerankedMemorySearchResult[] {
  if (candidates.length === 0) return [];

  const weights = { ...DEFAULT_WEIGHTS, ...options?.weights };
  const minCompositeScore = options?.minCompositeScore ?? 0.15;

  const queryTokens = query.tokens.map(stem);
  const queryEntities = query.entities.map(stem);

  const scored = candidates.map((item) => {
    const factLower = item.fact.toLowerCase();
    const factWords = factLower.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).map(stem);
    const factTextStemmed = factWords.join(" ");

    // 1. Semantic score (0.0 to 1.0 from vector search)
    const semanticScore = Math.max(0, item.score);

    // 2. Keyword & Entity match score
    let matchedTokens = 0;
    if (queryTokens.length > 0) {
      for (const token of queryTokens) {
        if (token.length > 2 && (factTextStemmed.includes(token) || factLower.includes(token))) {
          matchedTokens++;
        }
      }
    }
    const tokenMatchRatio = queryTokens.length > 0 ? matchedTokens / queryTokens.length : 0;

    let matchedEntities = 0;
    if (queryEntities.length > 0) {
      for (const entity of queryEntities) {
        if (entity.length > 2 && (factTextStemmed.includes(entity) || factLower.includes(entity))) {
          matchedEntities++;
        }
      }
    }
    const entityMatchRatio = queryEntities.length > 0 ? matchedEntities / queryEntities.length : tokenMatchRatio;

    const keywordScore = 0.5 * tokenMatchRatio + 0.5 * entityMatchRatio;

    // 3. Category relevance score
    let categoryScore = 0;
    if (item.category && CATEGORY_MAP[item.category]) {
      const categoryKeywords = CATEGORY_MAP[item.category];
      if (categoryKeywords.some((kw) => query.normalized.includes(kw))) {
        categoryScore = 1.0;
      }
    }

    // 4. Importance score (normalized from 1-10 to 0.1-1.0)
    const importanceScore = item.importance ? Math.min(Math.max(item.importance / 10, 0.1), 1.0) : 0.5;

    // Composite score computation
    const compositeScore =
      weights.semantic * semanticScore +
      weights.keyword * keywordScore +
      weights.category * categoryScore +
      weights.importance * importanceScore;

    return {
      ...item,
      keywordScore,
      compositeScore,
    };
  });

  // Filter out candidates that fall below composite threshold
  const filtered = scored.filter((item) => item.compositeScore >= minCompositeScore);

  // Sort descending by composite score
  filtered.sort((a, b) => b.compositeScore - a.compositeScore);

  // Update ranks
  return filtered.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}
