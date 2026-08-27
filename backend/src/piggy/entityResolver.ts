/**
 * entityResolver.ts
 *
 * Entity resolution engine for ranking fuzzy name matches against live database records.
 * Generates candidate selection options for ambiguous entity queries and resolves
 * follow-up ordinal references ("the second one", "the Python one").
 */

export interface CandidateEntity {
  id: string;
  title: string;
  score: number;
}

export interface EntityResolutionResult {
  resolved: boolean;
  entityId?: string;
  entityTitle?: string;
  candidates?: CandidateEntity[];
  ambiguousQuestion?: string;
}

/**
 * Calculates string similarity score between query and entity title (0.0 to 1.0).
 */
export function calculateSimilarity(query: string, title: string): number {
  const q = query.toLowerCase().trim();
  const t = title.toLowerCase().trim();

  if (q === t) return 1.0;
  if (t.includes(q)) return 0.85 + (q.length / t.length) * 0.14;
  if (q.includes(t)) return 0.80;

  // Token overlap score
  const qTokens = new Set(q.split(/\s+/));
  const tTokens = new Set(t.split(/\s+/));
  let matchCount = 0;
  for (const tok of qTokens) {
    if (tTokens.has(tok)) matchCount++;
  }

  if (qTokens.size === 0) return 0;
  return matchCount / Math.max(qTokens.size, tTokens.size);
}

/**
 * Resolves an entity query against an array of live database records.
 */
export function resolveEntityMatch(
  query: string,
  items: Array<{ id: string; title?: string; name?: string }>,
  actionType: string = "delete",
): EntityResolutionResult {
  if (!items || items.length === 0) {
    return { resolved: false };
  }

  const scored: CandidateEntity[] = items
    .map((item) => {
      const title = item.title || item.name || "Untitled";
      const score = calculateSimilarity(query, title);
      return { id: item.id, title, score };
    })
    .filter((c) => c.score > 0.3)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  if (scored.length === 0) {
    return { resolved: false };
  }

  // Case 1: Single strong match (score >= 0.85 or top score significantly higher than 2nd)
  if (scored.length === 1 || (scored[0].score >= 0.85 && scored[0].score - (scored[1]?.score ?? 0) > 0.2)) {
    return {
      resolved: true,
      entityId: scored[0].id,
      entityTitle: scored[0].title,
    };
  }

  // Case 2: Ambiguous candidates — return candidate question
  const topCandidates = scored.slice(0, 4);
  const optionsList = topCandidates.map((c, i) => `${i + 1}. ${c.title}`).join("\n");
  const ambiguousQuestion = `I found ${topCandidates.length} matching items:\n\n${optionsList}\n\nWhich one would you like to ${actionType}?`;

  return {
    resolved: false,
    candidates: topCandidates,
    ambiguousQuestion,
  };
}

/**
 * Resolves follow-up ordinal / reference responses ("the second one", "1", "the Python one")
 * against a saved list of candidates.
 */
export function resolveCandidateSelection(
  userInput: string,
  candidates: CandidateEntity[],
): { resolved: boolean; selectedEntity?: CandidateEntity } {
  if (!candidates || candidates.length === 0) {
    return { resolved: false };
  }

  const lower = userInput.toLowerCase().trim();

  // Ordinal word / index check ("first", "1", "second", "2", "3rd")
  const ordinalMap: Record<string, number> = {
    first: 0, "1st": 0, "1": 0,
    second: 1, "2nd": 1, "2": 1,
    third: 2, "3rd": 2, "3": 2,
    fourth: 3, "4th": 3, "4": 3,
  };

  for (const [key, index] of Object.entries(ordinalMap)) {
    if (lower.includes(key) && candidates[index]) {
      return { resolved: true, selectedEntity: candidates[index] };
    }
  }

  // Title keyword matching against candidate titles
  for (const candidate of candidates) {
    if (lower.includes(candidate.title.toLowerCase()) || candidate.title.toLowerCase().includes(lower)) {
      return { resolved: true, selectedEntity: candidate };
    }
  }

  return { resolved: false };
}
