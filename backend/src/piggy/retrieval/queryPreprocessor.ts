export interface PreprocessedQuery {
  original: string;
  normalized: string;
  tokens: string[];
  entities: string[];
  intentKeywords: string[];
}

const CONTRACTIONS: Record<string, string> = {
  "what's": "what is",
  "where's": "where is",
  "who's": "who is",
  "how's": "how is",
  "it's": "it is",
  "that's": "that is",
  "i'm": "i am",
  "can't": "cannot",
  "won't": "will not",
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "haven't": "have not",
  "hasn't": "has not",
  "hadn't": "had not",
};

const SYNONYMS: Record<string, string[]> = {
  programming: ["python", "rust", "study", "code"],
  coding: ["python", "rust", "leetcode", "code"],
  beverage: ["drink", "tea", "green tea"],
  drink: ["beverage", "tea", "green tea"],
  goals: ["goal", "target", "objective"],
  preferences: ["preference", "prefer", "like"],
  activities: ["activity", "study", "work"],
};

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "when",
  "at", "from", "by", "for", "with", "about", "against", "between",
  "into", "through", "during", "before", "after", "above", "below",
  "to", "of", "up", "in", "out", "on", "off", "over", "under",
  "does", "he", "she", "it", "his", "her", "they", "them",
]);

const DOMAIN_KEYWORDS = [
  "python", "javascript", "typescript", "rust", "react", "node",
  "leetcode", "data science", "machine learning", "ai", "deep work",
  "morning", "evening", "night", "daily", "weekly", "study", "habit",
  "task", "goal", "expense", "budget", "mood", "analytics", "green tea",
];

const TEMPORAL_KEYWORDS = [
  "morning", "afternoon", "evening", "night", "today", "tomorrow",
  "yesterday", "daily", "weekly", "monthly", "recent", "past",
];

export function preprocessQuery(query: string): PreprocessedQuery {
  const original = query.trim();
  if (!original) {
    return {
      original: "",
      normalized: "",
      tokens: [],
      entities: [],
      intentKeywords: [],
    };
  }

  // 1. Lowercase
  let lower = original.toLowerCase();

  // 2. Expand contractions
  for (const [contraction, expansion] of Object.entries(CONTRACTIONS)) {
    const regex = new RegExp(`\\b${contraction}\\b`, "g");
    lower = lower.replace(regex, expansion);
  }

  // 3. Normalize whitespace and clean punctuation
  const cleaned = lower.replace(/[^a-z0-9\s\-]/g, " ").replace(/\s+/g, " ").trim();

  // 4. Extract tokens and expand synonyms
  const rawTokens = cleaned.split(" ").filter(Boolean);
  const filteredTokens: string[] = [];
  const expandedEntities: string[] = [];

  for (const token of rawTokens) {
    if (!STOP_WORDS.has(token)) {
      filteredTokens.push(token);
      if (SYNONYMS[token]) {
        expandedEntities.push(...SYNONYMS[token]);
      }
    }
  }

  // 5. Extract domain entities & temporal keywords
  for (const domainKw of DOMAIN_KEYWORDS) {
    if (cleaned.includes(domainKw)) {
      expandedEntities.push(domainKw);
    }
  }

  const intentKeywords: string[] = [];
  for (const tempKw of TEMPORAL_KEYWORDS) {
    if (cleaned.includes(tempKw)) {
      intentKeywords.push(tempKw);
    }
  }

  return {
    original,
    normalized: cleaned,
    tokens: Array.from(new Set([...filteredTokens, ...expandedEntities])),
    entities: Array.from(new Set(expandedEntities)),
    intentKeywords: Array.from(new Set(intentKeywords)),
  };
}
