// Smart Multi-Endpoint Resilient API Client

let cachedActiveBaseUrl: string | null = null;

function normalizeApiUrl(url: string): string {
  let clean = url.trim().replace(/\/+$/, "");
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = `http://${clean}`;
  }
  return clean.endsWith("/api") ? clean : `${clean}/api`;
}

export function getCandidateUrls(): string[] {
  const candidates: string[] = [];

  // 1. User manual override
  if (typeof window !== "undefined" && window.localStorage) {
    const custom = localStorage.getItem("bios_server_url");
    if (custom && custom.trim()) {
      candidates.push(normalizeApiUrl(custom));
    }
  }

  // 2. Vite environment variable if provided
  if (import.meta.env.VITE_API_URL) {
    candidates.push(normalizeApiUrl(import.meta.env.VITE_API_URL));
  }

  // 3. Dynamic browser hostname if running on LAN
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    if (
      hostname &&
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      hostname !== "" &&
      protocol !== "capacitor:" &&
      protocol !== "file:"
    ) {
      candidates.push(`${protocol === "https:" ? "https:" : "http:"}//${hostname}:5000/api`);
    }
  }

  // 4. USB cable reverse port-forwarding (127.0.0.1:5000 / localhost:5000)
  candidates.push("http://127.0.0.1:5000/api");
  candidates.push("http://localhost:5000/api");

  // 5. Active LAN IP candidates
  candidates.push("http://10.128.219.231:5000/api");
  candidates.push("http://10.0.2.2:5000/api"); // Android emulator host loopback

  // Deduplicate
  return Array.from(new Set(candidates));
}

export function getApiBaseUrl(): string {
  if (cachedActiveBaseUrl) {
    return cachedActiveBaseUrl;
  }
  const candidates = getCandidateUrls();
  return candidates[0] || "http://127.0.0.1:5000/api";
}

export function setCustomServerUrl(url: string | null): void {
  if (typeof window !== "undefined" && window.localStorage) {
    if (url && url.trim() !== "") {
      const clean = normalizeApiUrl(url);
      localStorage.setItem("bios_server_url", clean);
      cachedActiveBaseUrl = clean;
    } else {
      localStorage.removeItem("bios_server_url");
      cachedActiveBaseUrl = null;
    }
  }
}

// Background probing of candidate URLs to find the fastest reachable server
export async function probeServerEndpoints(): Promise<string> {
  const candidates = getCandidateUrls();
  for (const candidate of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${candidate}/health`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        cachedActiveBaseUrl = candidate;
        return candidate;
      }
    } catch {
      // Continue to next candidate
    }
  }
  return candidates[0] || "http://127.0.0.1:5000/api";
}

// Kick off probe immediately on load
if (typeof window !== "undefined") {
  void probeServerEndpoints();
}

export const API_BASE = getApiBaseUrl();

if (typeof globalThis !== "undefined") {
  try {
    Object.defineProperty(globalThis, "__BIOS_API_BASE__", {
      get: () => getApiBaseUrl(),
      configurable: true,
    });
  } catch {}
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const candidates = [getApiBaseUrl(), ...getCandidateUrls().filter(u => u !== getApiBaseUrl())];
  let lastError: any = null;

  for (const baseUrl of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        signal: options.signal || controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });
      clearTimeout(timeoutId);

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      const envelope =
        body && typeof body === "object" && "success" in (body as object)
          ? (body as ApiEnvelope<T>)
          : null;

      if (!response.ok || envelope?.success === false) {
        throw new Error(
          envelope?.error ||
            envelope?.message ||
            `API request failed (${response.status})`,
        );
      }

      // If successful, update our active working base URL
      cachedActiveBaseUrl = baseUrl;

      return (envelope ? envelope.data : (body as T)) as T;
    } catch (err) {
      lastError = err;
      // If network error/timeout, try next candidate
      continue;
    }
  }

  throw lastError || new Error("All API endpoints unreachable");
}

export function authHeader(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
