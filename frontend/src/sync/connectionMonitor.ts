import { getApiBaseUrl } from "../api/client";

type ConnectionListener = (isServerReachable: boolean, isNetworkOnline: boolean) => void;

export class ConnectionMonitor {
  private isNetworkOnline: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;
  private isServerReachable: boolean = false;
  private listeners: Set<ConnectionListener> = new Set();
  private pingInterval: any = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleNetworkOnline);
      window.addEventListener("offline", this.handleNetworkOffline);
      this.checkServerHealth();
      this.startHeartbeat();
    }
  }

  private handleNetworkOnline = () => {
    this.isNetworkOnline = true;
    this.checkServerHealth();
  };

  private handleNetworkOffline = () => {
    this.isNetworkOnline = false;
    this.isServerReachable = false;
    this.notify();
  };

  public async checkServerHealth(): Promise<boolean> {
    if (!this.isNetworkOnline) {
      this.isServerReachable = false;
      this.notify();
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/health`, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          this.isServerReachable = Boolean(data && (data.success === true || data.status === "healthy" || data.message?.includes("running")));
        } else {
          // Received HTML (e.g., SPA index.html) instead of API JSON response
          this.isServerReachable = false;
        }
      } else {
        this.isServerReachable = false;
      }
    } catch {
      this.isServerReachable = false;
    }

    this.notify();
    return this.isServerReachable;
  }

  private startHeartbeat() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.isNetworkOnline) {
        this.checkServerHealth();
      }
    }, 30000); // 30 second health check
  }

  public subscribe(listener: ConnectionListener): () => void {
    this.listeners.add(listener);
    listener(this.isServerReachable, this.isNetworkOnline);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.isServerReachable, this.isNetworkOnline);
    }
  }

  public getStatus() {
    return {
      isNetworkOnline: this.isNetworkOnline,
      isServerReachable: this.isServerReachable,
    };
  }

  public destroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleNetworkOnline);
      window.removeEventListener("offline", this.handleNetworkOffline);
    }
    if (this.pingInterval) clearInterval(this.pingInterval);
  }
}

export const connectionMonitor = new ConnectionMonitor();
