import type { PiggyMemorySearchResult } from "../memory.js";

function getJaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const setB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 2));

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersection++;
    }
  }

  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function deduplicateMemories(
  memories: PiggyMemorySearchResult[],
  similarityThreshold = 0.8,
): PiggyMemorySearchResult[] {
  if (memories.length <= 1) return memories;

  const unique: PiggyMemorySearchResult[] = [];

  for (const candidate of memories) {
    const candidateFactLower = candidate.fact.toLowerCase().trim();
    let isDuplicate = false;

    for (const existing of unique) {
      const existingFactLower = existing.fact.toLowerCase().trim();

      // 1. Exact string match or substring match
      if (
        candidateFactLower === existingFactLower ||
        candidateFactLower.includes(existingFactLower) ||
        existingFactLower.includes(candidateFactLower)
      ) {
        isDuplicate = true;
        break;
      }

      // 2. High Jaccard similarity (> threshold)
      const sim = getJaccardSimilarity(candidateFactLower, existingFactLower);
      if (sim >= similarityThreshold) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      unique.push(candidate);
    }
  }

  return unique;
}
