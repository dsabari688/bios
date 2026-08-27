import type { RetrievedContext } from "../rag.js";

export interface ContextBuilderOptions {
  maxMemoryTokens?: number;
  maxLiveDataTokens?: number;
}

export function buildGroundedContext(
  memoryFacts: string[],
  liveData: RetrievedContext[],
  options?: ContextBuilderOptions,
): {
  memoryContext: string;
  liveDataContext: string;
  fullGroundedContext: string;
} {
  const maxMemChars = (options?.maxMemoryTokens ?? 1000) * 4;
  const maxLiveChars = (options?.maxLiveDataTokens ?? 1500) * 4;

  let memoryContext = "";
  if (memoryFacts.length > 0) {
    const formattedMemories = memoryFacts
      .map((fact) => `- ${fact}`)
      .join("\n");
    memoryContext = `<USER_MEMORY>\n${formattedMemories}\n</USER_MEMORY>`;
    if (memoryContext.length > maxMemChars) {
      memoryContext = memoryContext.slice(0, maxMemChars) + "\n...[truncated]";
    }
  }

  let liveDataContext = "";
  if (liveData.length > 0) {
    const formattedLive = liveData
      .map((entry) => `[${entry.source}]\n${entry.content}`)
      .join("\n\n");
    liveDataContext = `<LIVE_DATA>\n${formattedLive}\n</LIVE_DATA>`;
    if (liveDataContext.length > maxLiveChars) {
      liveDataContext = liveDataContext.slice(0, maxLiveChars) + "\n...[truncated]";
    }
  }

  const sections = [memoryContext, liveDataContext].filter(Boolean);
  const fullGroundedContext = sections.join("\n\n");

  return {
    memoryContext,
    liveDataContext,
    fullGroundedContext,
  };
}
