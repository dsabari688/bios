import React, { useState, useEffect } from "react";
import { Moon, CheckCircle2, Clock } from "lucide-react";
import { formatTo12Hour } from "../../lib/timeUtils";

interface SleepTrackerProps {
  token: string | null;
  onNudgeTriggered?: () => void; // Refresh parent brief text
}

interface SleepLog {
  sleepTime: string;
  wakeTime: string;
  duration: number;
  date: string;
}

export const SleepTracker: React.FC<SleepTrackerProps> = ({ token, onNudgeTriggered }) => {
  const [sleepTime, setSleepTime] = useState("22:30");
  const [wakeTime, setWakeTime] = useState("06:30");
  const [todayLog, setTodayLog] = useState<SleepLog | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("/api/sleep/today", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => {
        if (res.ok) return res.json();
        return null;
      })
      .then(data => {
        if (data) {
          setTodayLog(data);
        } else {
          setTodayLog(null);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading sleep log:", err);
        setLoading(false);
      });
  }, [token, saved]);

  const computeDuration = (sleep: string, wake: string) => {
    if (!sleep || !wake) return 0;
    const [sH, sM] = sleep.split(":").map(Number);
    const [wH, wM] = wake.split(":").map(Number);
    let diff = (wH * 60 + wM) - (sH * 60 + sM);
    if (diff < 0) diff += 24 * 60; // Handles crossing midnight
    return Math.round((diff / 60) * 10) / 10;
  };

  const handleSave = async () => {
    if (!token) return;
    const duration = computeDuration(sleepTime, wakeTime);

    try {
      const res = await fetch("/api/sleep", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          sleepTime,
          wakeTime,
          duration,
          date: todayStr
        })
      });

      if (res.ok) {
        setSaved(true);
        if (onNudgeTriggered) onNudgeTriggered(); // Refresh App state
      }
    } catch (err) {
      console.error("Error saving sleep log:", err);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 transition-all hover:shadow-md">
      {todayLog ? (
        <div className="flex items-center gap-4 animate-in fade-in duration-200">
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
            <Moon className="w-5 h-5 fill-indigo-100" />
          </div>
          <div>
            <span className="font-mono text-[9px] font-bold uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
              SLEEP RECORDED FOR TODAY
            </span>
            <h3 className="font-display font-black text-slate-800 text-sm md:text-base leading-tight mt-1">
              You logged {todayLog.duration} hours of sleep.
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Slept at {formatTo12Hour(todayLog.sleepTime)} &bull; Woke at {formatTo12Hour(todayLog.wakeTime)}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Moon className="w-4.5 h-4.5 text-indigo-500" />
            <h3 className="font-display font-bold text-slate-800 text-sm">Sleep Tracker</h3>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Slept At</label>
                <span className="text-[9px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{formatTo12Hour(sleepTime)}</span>
              </div>
              <input
                type="time"
                value={sleepTime}
                onChange={(e) => setSleepTime(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
              />
            </div>

            <div className="flex-1 w-full space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Woke At</label>
                <span className="text-[9px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{formatTo12Hour(wakeTime)}</span>
              </div>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
              />
            </div>

            <div className="w-full md:w-auto">
              <button
                onClick={handleSave}
                className="w-full md:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-display font-bold text-[11px] uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-200" />
                Log Sleep
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
