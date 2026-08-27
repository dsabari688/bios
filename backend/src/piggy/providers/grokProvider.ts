import "dotenv/config";
import {
  type AIProvider,
  type GenerateOptions,
  AiUnavailableError,
  AiTimeoutError,
  RateLimitError,
} from "./aiProvider.js";

const DEFAULT_TIMEOUT_MS = Number(process.env.GROK_TIMEOUT_MS ?? process.env.XAI_TIMEOUT_MS ?? 60000);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GrokProvider implements AIProvider {
  readonly provider = "grok";

  get apiKey(): string {
    return (
      process.env.XAI_API_KEY ??
      process.env.GROK_API_KEY ??
      ""
    ).trim();
  }

  get baseUrl(): string {
    const isGroqKey = this.apiKey.startsWith("gsk_");
    const raw = process.env.XAI_BASE_URL ?? process.env.GROK_BASE_URL;
    if (raw && raw.trim()) {
      const trimmed = raw.trim().replace(/\/+$/, "");
      if (trimmed !== "https://api.x.ai/v1" || !isGroqKey) {
        return trimmed;
      }
    }
    return isGroqKey ? "https://api.groq.com/openai/v1" : "https://api.x.ai/v1";
  }

  get model(): string {
    const isGroqKey = this.apiKey.startsWith("gsk_");
    const raw = process.env.XAI_MODEL ?? process.env.GROK_MODEL;
    if (raw && raw.trim()) {
      const trimmed = raw.trim();
      if (!isGroqKey || trimmed !== "grok-2-latest") {
        return trimmed;
      }
    }
    return isGroqKey ? "groq/compound-mini" : "grok-2-latest";
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async isAvailable(_timeoutMs = 2500): Promise<boolean> {
    return this.isConfigured;
  }

  async generate(options: GenerateOptions, retries = options.maxRetries ?? (options.fastChat ? 1 : 3)): Promise<string> {
    if (!this.isConfigured) {
      throw new AiUnavailableError("Grok/Groq API key is not configured. Set XAI_API_KEY in .env");
    }

    const timeoutMs = options.timeoutMs ?? (options.fastChat ? 8000 : DEFAULT_TIMEOUT_MS);

    const messages: { role: string; content: string }[] = [];
    if (options.system) {
      messages.push({ role: "system", content: options.system });
    }
    messages.push({ role: "user", content: options.prompt });

    const payload: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: options.temperature ?? 0.1,
    };

    if (options.format === "json") {
      payload.response_format = { type: "json_object" };
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const url = `${this.baseUrl}/chat/completions`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          if (res.status === 429) {
            const retryMatch = detail.match(/try again in ([\d.]+)s/i);
            const retryMs = retryMatch ? Math.ceil(parseFloat(retryMatch[1]) * 1000) : 1000;

            if (attempt < retries) {
              const backoffMs = options.fastChat
                ? 500
                : Math.min(Math.max(retryMs, 1000 * (attempt + 1)), 3000);
              console.warn(
                `[PIGGY][AI] Rate limit 429 on ${this.model}. Retrying in ${backoffMs}ms (attempt ${attempt + 1}/${retries})...`,
              );
              await delay(backoffMs);
              continue;
            }

            throw new RateLimitError(retryMs);
          }
          throw new Error(
            `AI API responded ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`
          );
        }

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };

        return data.choices?.[0]?.message?.content ?? "";
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new AiTimeoutError(timeoutMs);
        }
        if (
          error instanceof TypeError &&
          (error.message.includes("fetch failed") ||
            error.message.includes("ECONNREFUSED") ||
            error.message.includes("ENOTFOUND"))
        ) {
          throw new AiUnavailableError("AI API network error");
        }
        if (error instanceof RateLimitError) {
          throw error;
        }
        if (attempt < retries) {
          await delay(1000 * (attempt + 1));
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }

    throw new RateLimitError(5000);
  }

  async generateStructured<T>(options: GenerateOptions): Promise<T> {
    const raw = await this.generate({
      ...options,
      format: "json",
    });

    return parseJsonLoose<T>(raw);
  }
}

function parseJsonLoose<T>(raw: string): T {
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);

    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim()) as T;
    }

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }

    throw new Error("Grok/Groq model did not return valid JSON");
  }
}

export const grokProvider = new GrokProvider();
