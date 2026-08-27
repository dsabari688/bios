import "dotenv/config";

export interface GenerateOptions {
  system?: string;
  prompt: string;
  format?: "json";
  temperature?: number;
  timeoutMs?: number;
  maxRetries?: number;
  fastChat?: boolean;
}

export class AiUnavailableError extends Error {
  constructor(message = "AI service (Grok API) is not reachable") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export class AiTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`AI request timed out after ${timeoutMs}ms`);
    this.name = "AiTimeoutError";
  }
}

export class RateLimitError extends Error {
  retryAfterMs: number;
  constructor(retryAfterMs = 10000) {
    super(`AI rate limit reached. Try again in ${Math.ceil(retryAfterMs / 1000)}s.`);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export interface AIProvider {
  readonly provider: string;
  readonly model: string;
  readonly baseUrl: string;
  readonly isAvailable: (timeoutMs?: number) => Promise<boolean>;
  generate: (options: GenerateOptions) => Promise<string>;
  generateStructured: <T>(options: GenerateOptions) => Promise<T>;
}
