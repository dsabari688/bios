import React, { useState, useEffect } from "react";
import { RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle, Settings, X, Server, Save } from "lucide-react";
import { useSync } from "../../hooks/useSync";
import { getApiBaseUrl, setCustomServerUrl } from "../../api/client";
import { connectionMonitor } from "../../sync/connectionMonitor";

export const SyncStatusBadge: React.FC = () => {
  const { isOnline, isSyncing, pendingCount, failedCount, syncNow } = useSync();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      setServerUrl(localStorage.getItem("bios_server_url") || "");
    }
  }, [isModalOpen]);

  const handleSaveServerUrl = async () => {
    setCustomServerUrl(serverUrl);
    const reachable = await connectionMonitor.checkServerHealth();
    if (reachable) {
      syncNow();
      setSavedNotice(true);
    } else {
      setSavedNotice(false);
    }
  };

  return (
    <div className="relative flex items-center gap-2 font-mono text-[10px]">
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
          !isOnline
            ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
            : pendingCount > 0
            ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
        }`}
        title={isOnline ? "Server Reachable - Click to inspect/sync" : "Offline Mode - Operations queued locally. Click to configure"}
      >
        {isSyncing ? (
          <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
        ) : isOnline ? (
          <Wifi className="w-3 h-3 text-emerald-400" />
        ) : (
          <WifiOff className="w-3 h-3 text-amber-400" />
        )}

        <span className="font-bold uppercase tracking-wider">
          {isSyncing
            ? "Syncing..."
            : isOnline
            ? pendingCount > 0
              ? `${pendingCount} Pending`
              : "Synced"
            : "Offline"}
        </span>

        {failedCount > 0 && (
          <span className="flex items-center text-rose-400 ml-1">
            <AlertTriangle className="w-3 h-3 mr-0.5" />
            {failedCount}
          </span>
        )}
      </button>

      {/* Sync Details & Server IP Config Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl max-w-sm w-full space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-500" />
                <h3 className="font-display font-black text-sm text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                  Cross-Device Sync Cockpit
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Sync Status Info */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Network Status</span>
                <span className={`font-bold ${isOnline ? "text-emerald-500" : "text-amber-500"}`}>
                  {isOnline ? "ONLINE (REACHABLE)" : "OFFLINE / UNREACHABLE"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Queue Status</span>
                <span className="font-bold text-indigo-400">
                  {pendingCount} Pending / {failedCount} Failed
                </span>
              </div>
            </div>

            {/* Server URL Config Form for Mobile */}
            <div className="space-y-2">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Windows PC Server IP / API URL
              </label>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                Enter your Windows PC local Wi-Fi IP: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-amber-500 font-bold">http://10.239.162.231:5000</code>
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="http://10.239.162.231:5000"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleSaveServerUrl}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const url = "http://10.239.162.231:5000";
                  setServerUrl(url);
                  setCustomServerUrl(url);
                  const reachable = await connectionMonitor.checkServerHealth();
                  if (reachable) {
                    syncNow();
                    setSavedNotice(true);
                  }
                }}
                className="text-[10px] text-amber-400 hover:underline font-mono block cursor-pointer"
              >
                ⚡ Click here to set Real PC IP: http://10.239.162.231:5000
              </button>
              {savedNotice && (
                <p className="text-[10px] text-emerald-500 font-mono flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Server URL updated! Connected to PC.
                </p>
              )}
              <div className="text-[10px] font-mono text-slate-400">
                Active Endpoint: <span className="text-slate-600 dark:text-slate-300 font-semibold">{getApiBaseUrl()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  syncNow();
                  setIsModalOpen(false);
                }}
                disabled={isSyncing}
                className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-display font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing Operations..." : "Force Sync Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
