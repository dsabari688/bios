export function getApiBaseUrl(): string {
  if (typeof window !== "undefined" && window.localStorage) {
    const customUrl = localStorage.getItem("bios_server_url");
    if (customUrl && customUrl.trim() !== "") {
      let clean = customUrl.trim().replace(/\/+$/, "");
      if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
        clean = `http://${clean}`;
      }
      return clean.endsWith("/api") ? clean : `${clean}/api`;
    }
  }

  if (import.meta.env.VITE_API_URL) {
    let clean = import.meta.env.VITE_API_URL.trim().replace(/\/+$/, "");
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = `http://${clean}`;
    }
    return clean.endsWith("/api") ? clean : `${clean}/api`;
  }

  // Handle Electron desktop app & Capacitor mobile native environment
  if (typeof window !== "undefined") {
    const isCapacitor = !!(window as any).Capacitor || window.location.protocol === "capacitor:";
    const isFileOrElectron =
      window.location.protocol === "file:" ||
      (typeof navigator !== "undefined" && navigator.userAgent.includes("Electron"));

    if (isFileOrElectron) {
      return "http://localhost:5000/api";
    }

    if (isCapacitor) {
      // In Capacitor native mobile app, if no server URL configured, fallback to the PC server IP
      return "http://10.239.162.231:5000/api";
    }
  }

  return "https://bios-backend-93q3.onrender.com/api";
}

export function setCustomServerUrl(url: string | null): void {
  if (typeof window !== "undefined" && window.localStorage) {
    if (url && url.trim() !== "") {
      let clean = url.trim().replace(/\/+$/, "");
      if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
        clean = `http://${clean}`;
      }
      localStorage.setItem("bios_server_url", clean);
    } else {
      localStorage.removeItem("bios_server_url");
    }
  }
}

export const API_BASE = getApiBaseUrl();
// Re-export dynamic getter property for API_BASE so runtime server URL updates work across all modules
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
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

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

  // Endpoints may answer either with a {success, data} envelope or a bare
  // JSON payload (e.g. GET /api/analytics/weekly-review).
  return (envelope ? envelope.data : (body as T)) as T;
}

export function authHeader(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}


