const API_BASE = import.meta.env.VITE_API_URL || "/api";

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
  const response = await fetch(`${API_BASE}${path}`, {
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

export { API_BASE };
