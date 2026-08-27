import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-2";

const EMBEDDING_DIMENSIONS = Number(
  process.env.GEMINI_EMBEDDING_DIMENSIONS ?? "768",
);

const ai = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;

const embeddingCache = new Map<string, number[]>();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateDeterministicVector(text: string, dimensions = EMBEDDING_DIMENSIONS): number[] {
  const vec = new Array(dimensions).fill(0);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    vec[0] = 1.0;
    return vec;
  }

  for (const word of words) {
    let hash = 5381;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 33) ^ word.charCodeAt(i);
    }
    const index = Math.abs(hash) % dimensions;
    const sign = hash % 2 === 0 ? 1 : -1;
    vec[index] += sign * 1.0;
  }

  // Normalize to unit vector
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vec[i] /= norm;
    }
  }

  return vec;
}

export async function createEmbedding(
  text: string,
  retries = 2,
): Promise<number[]> {
  const cacheKey = `${EMBEDDING_MODEL}:${EMBEDDING_DIMENSIONS}:${text.trim().toLowerCase()}`;

  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  if (!ai) {
    const fallback = generateDeterministicVector(text);
    embeddingCache.set(cacheKey, fallback);
    return fallback;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text,
        config: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
        },
      });

      const embedding = response.embeddings?.[0]?.values;

      if (embedding && embedding.length === EMBEDDING_DIMENSIONS) {
        embeddingCache.set(cacheKey, embedding);
        return embedding;
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isRateLimit =
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("429") ||
        errMsg.includes("rate limit") ||
        errMsg.includes("Quota exceeded");

      if (isRateLimit && attempt < retries) {
        await delay(1000 * (attempt + 1));
        continue;
      }

      if (isRateLimit) {
        console.warn(
          `[PIGGY][EMBEDDING] Gemini rate limit/quota reached. Using fallback deterministic embedding for "${text.slice(0, 30)}..."`,
        );
        const fallback = generateDeterministicVector(text);
        embeddingCache.set(cacheKey, fallback);
        return fallback;
      }

      throw err;
    }
  }

  const fallback = generateDeterministicVector(text);
  embeddingCache.set(cacheKey, fallback);
  return fallback;
}

export const embeddingConfig = {
  provider: "gemini",
  model: EMBEDDING_MODEL,
  dimensions: EMBEDDING_DIMENSIONS,
};
