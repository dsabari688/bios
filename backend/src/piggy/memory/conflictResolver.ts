import type { PiggyMemoryFact } from "../memory.js";

export interface ConflictResolutionResult {
  hasConflict: boolean;
  supersededMemoryIds: string[];
  reason?: string;
}

const PREFERENCE_INDICATORS = [
  "prefer", "likes", "like", "favorite", "prefers", "dislikes", "focused on",
];

const GOAL_INDICATORS = [
  "goal", "target", "aims to", "wants to", "aspire to", "focusing on",
];

function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "to", "in", "of", "for", "with", "on", "at", "sabari", "he", "i", "my", "me",
  ]);

  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w)),
  );
}

export function detectMemoryConflicts(
  newFact: string,
  newCategory: string,
  existingActiveMemories: PiggyMemoryFact[],
): ConflictResolutionResult {
  if (existingActiveMemories.length === 0) {
    return { hasConflict: false, supersededMemoryIds: [] };
  }

  const newFactLower = newFact.toLowerCase();
  const newKeywords = extractKeywords(newFact);

  const supersededIds: string[] = [];

  const isPreference = PREFERENCE_INDICATORS.some((p) => newFactLower.includes(p)) || newCategory === "preference";
  const isGoal = GOAL_INDICATORS.some((g) => newFactLower.includes(g)) || newCategory === "goal";

  for (const existing of existingActiveMemories) {
    // Only compare active memories
    if (existing.status && existing.status !== "active") {
      continue;
    }

    const existingFactLower = existing.fact.toLowerCase();

    // 1. Same category match
    const sameCategory = existing.category === newCategory;

    // 2. High domain keyword overlap (e.g. "morning", "studying")
    const existingKeywords = extractKeywords(existing.fact);
    let sharedCount = 0;
    for (const kw of newKeywords) {
      if (existingKeywords.has(kw)) {
        sharedCount++;
      }
    }

    // 3. Check for specific subject conflict (e.g., Python vs Java for morning study preference)
    if (isPreference && sameCategory && sharedCount >= 2) {
      // If new fact is a preference change in the same domain context
      supersededIds.push(existing.id);
    } else if (isGoal && sameCategory && sharedCount >= 2 && (newFactLower.includes("goal") || existingFactLower.includes("goal"))) {
      // Goal update in same domain
      if (
        (newFactLower.includes("study") && existingFactLower.includes("study")) ||
        (newFactLower.includes("language") && existingFactLower.includes("language"))
      ) {
        supersededIds.push(existing.id);
      }
    } else if (sharedCount >= 3) {
      // Direct high-overlap fact revision
      supersededIds.push(existing.id);
    }
  }

  return {
    hasConflict: supersededIds.length > 0,
    supersededMemoryIds: supersededIds,
    reason: supersededIds.length > 0
      ? `Superseded ${supersededIds.length} conflicting prior active memories`
      : undefined,
  };
}
