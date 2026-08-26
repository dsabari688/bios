import { grokProvider } from "./grokProvider.js";
import type { AIProvider } from "./aiProvider.js";

export * from "./aiProvider.js";
export * from "./grokProvider.js";

export function getAIProvider(): AIProvider {
  return grokProvider;
}
