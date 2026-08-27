import type { RetrievedContext } from "../rag.js";

export interface ValidationResult {
  isValid: boolean;
  hallucinationDetected: boolean;
  reason?: string;
  sanitizedAnswer?: string;
}

// Known personal hallucinations that should not appear without memory backing
const COMMON_PERSONAL_HALLUCINATIONS = [
  "pizza", "burger", "sushi", "pasta", "tacos", "ice cream", "biryani",
  "stanford", "harvard", "mit", "oxford", "cambridge", "berkeley",
  "max", "charlie", "bella", "luna", "rocky", "milo",
  "tesla", "bmw", "audi", "honda", "toyota", "ford",
];

const ACKNOWLEDGMENT_PATTERNS = [
  "don't have",
  "don't know",
  "no record",
  "not stored",
  "haven't",
  "unable",
  "could you",
  "rephrase",
  "don't recall",
  "do not have",
  "do not know",
  "haven't told me",
  "not sure",
  "I don't know that",
  "haven't shared",
];

// General knowledge answers that should NEVER be blocked by grounding
const GENERAL_KNOWLEDGE_BYPASS = [
  /^(paris|london|berlin|tokyo|madrid|rome|beijing|moscow|washington|delhi|cairo)\b/i,
  /\b(is the capital of|capital city)\b/i,
  /\bprogramming language\b/i,
  /\bopen.?source\b/i,
  /\bcontainer(ization|ized|s)?\b/i,
  /\b(original song|🎵|here'?s something for you)\b/i,
  /^sure[,!]?\s*(here'?s|i'?d|let me)/i,
];

export function validateAnswer(
  query: string,
  answer: string,
  memoryFacts: string[],
  liveData: RetrievedContext[],
): ValidationResult {
  const lowerAnswer = answer.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Skip validation entirely if no personal memory involved
  if (memoryFacts.length === 0 && liveData.length === 0) {
    return { isValid: true, hallucinationDetected: false };
  }

  // Skip validation for general knowledge answers (songs, capitals, etc.)
  if (GENERAL_KNOWLEDGE_BYPASS.some((p) => p.test(answer))) {
    return { isValid: true, hallucinationDetected: false };
  }

  // Combine grounding corpus
  const corpus = [
    ...memoryFacts,
    ...liveData.map((d) => `${d.source}: ${d.content}`),
  ]
    .join(" ")
    .toLowerCase();

  // 1. Check if response acknowledges lack of memory
  const acknowledgesUnknown = ACKNOWLEDGMENT_PATTERNS.some((pat) =>
    lowerAnswer.includes(pat),
  );

  // 2. Check for suspicious ungrounded personal claims ONLY if we have some corpus
  if (corpus.length > 0) {
    for (const item of COMMON_PERSONAL_HALLUCINATIONS) {
      if (lowerAnswer.includes(item)) {
        const existsInCorpus = corpus.includes(item);
        if (!existsInCorpus) {
          return {
            isValid: false,
            hallucinationDetected: true,
            reason: `Answer asserts ungrounded personal fact "${item}" not found in retrieved memory or live state`,
            sanitizedAnswer: "I don't have any record of that — you haven't told me yet.",
          };
        }
      }
    }
  }

  // 3. Only apply personal query gate when corpus is completely empty
  // AND the answer doesn't acknowledge unknown info
  const isPersonalQuery =
    lowerQuery.includes("favorite") ||
    lowerQuery.includes("my pet") ||
    lowerQuery.includes("my car") ||
    lowerQuery.includes("university") ||
    lowerQuery.includes("where do i live");

  if (isPersonalQuery && corpus.length === 0 && !acknowledgesUnknown) {
    return {
      isValid: false,
      hallucinationDetected: true,
      reason: "Personal query was answered without supporting memory context or unknown acknowledgment",
      sanitizedAnswer: "I don't know that yet — you haven't told me.",
    };
  }

  return {
    isValid: true,
    hallucinationDetected: false,
  };
}
