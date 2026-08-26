import React from "react";
import { X, Check, Bell, Flame, AlertOctagon, TrendingUp } from "lucide-react";
import { SystemNotification } from "../../types";
import { formatTimestamp12Hour } from "../../lib/timeUtils";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: any[];
  onClearRead: () => void;
  user?: { name: string };   // ← Add this
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onClearRead,
  user
}) => {
  const userName = user?.name || "Sir";

  if (!isOpen) return null;
  // ... rest of your code

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl border-l border-slate-100 flex flex-col animate-in slide-in-from-right duration-250 ease-out">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500 animate-pulse" />
            <h3 className="font-display font-bold text-slate-900 text-lg">Diagnostics</h3>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.read) && (
              <button
                onClick={onClearRead}
                className="text-xs font-mono font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100/50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Flush Unread
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center h-48">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-2">
                <Bell className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-slate-400 font-sans">No diagnostic telemetry available, {userName}.</p>
            </div>
          ) : (
            notifications.map((item) => {
              // Custom borders based on notification types
              let borderClass = "border-amber-400";
              let Icon = Bell;
              let iconBg = "bg-amber-50 text-amber-500";

              if (item.type === "warning") {
                borderClass = "border-rose-500";
                Icon = AlertOctagon;
                iconBg = "bg-rose-50 text-rose-500";
              } else if (item.type === "streak") {
                borderClass = "border-emerald-500";
                Icon = Flame;
                iconBg = "bg-emerald-50 text-emerald-500";
              } else if (item.type === "budget") {
                borderClass = "border-purple-500";
                Icon = TrendingUp;
                iconBg = "bg-purple-50 text-purple-500";
              }

              return (
                <div 
                  key={item.id}
                  className={`p-4 border-l-4 ${borderClass} transition-colors duration-150 ${
                    !item.read ? "bg-amber-50/10 hover:bg-amber-50/25" : "bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display font-semibold text-xs text-slate-800 line-clamp-1">{item.title}</p>
                        {!item.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-sans leading-relaxed">{item.message}</p>
                      <span className="text-[9px] text-slate-400 font-mono block mt-2">
                        {formatTimestamp12Hour(item.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Console parameters footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 font-mono text-[9px] text-slate-400 flex justify-between items-center whitespace-nowrap">
          <span>COGNITIVE SWEEP: EXECUTED</span>
          <span>STABILITY: OPTIMAL</span>
        </div>
      </div>
    </>
  );
};
