/**
 * DEPRECATED / REMOVED: Ollama local AI fallback is no longer used in Piggy Direct Comms.
 * Piggy Direct Comms operates strictly via Grok API (xAI).
 */
import { getAIProvider, AiUnavailableError, AiTimeoutError } from "./providers/index.js";

export const ollamaService = {
  get isGrokEnabled(): boolean {
    return true;
  },
  get provider(): string {
    return getAIProvider().provider;
  },
  get model(): string {
    return getAIProvider().model;
  },
  get baseUrl(): string {
    return getAIProvider().baseUrl;
  },
  async isAvailable(): Promise<boolean> {
    return getAIProvider().isAvailable();
  },
  async generate(options: Parameters<ReturnType<typeof getAIProvider>["generate"]>[0]): Promise<string> {
    return getAIProvider().generate(options);
  },
  async generateStructured<T>(options: Parameters<ReturnType<typeof getAIProvider>["generateStructured"]>[0]): Promise<T> {
    return getAIProvider().generateStructured<T>(options);
  },
};

export { AiUnavailableError as OllamaUnavailableError, AiTimeoutError as OllamaTimeoutError };
