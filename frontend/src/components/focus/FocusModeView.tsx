import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, CheckCircle2, Clock, Plus, Minus } from "lucide-react";
import { useStore } from "../../store/useStore";
import { getApiBaseUrl } from "../../api/client";

export type TimerState = "idle" | "running" | "paused" | "completed";

const PRESET_DURATIONS = [15, 25, 45, 60];

export const FocusModeView: React.FC = () => {
  const { osData, logFocusSession, showToast } = useStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string>("general");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [timeRemaining, setTimeRemaining] = useState<number>(25 * 60);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [completedSessions, setCompletedSessions] = useState<number>(0);
  const [todayFocusMinutes, setTodayFocusMinutes] = useState<number>(0);
  const isLoggingRef = useRef<boolean>(false);

  // Fetch initial telemetry on mount
  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/piggy/dashboard`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.summary) {
          if (typeof data.summary.todayFocusMinutes === "number") {
            setTodayFocusMinutes(data.summary.todayFocusMinutes);
          }
          if (typeof data.summary.focusBlocksCompleted === "number") {
            setCompletedSessions(data.summary.focusBlocksCompleted);
          }
        }
      })
      .catch((err) => console.warn("Failed to fetch focus stats:", err));
  }, []);

  // Update timer remaining when duration changes in idle state
  const handleDurationChange = (newMinutes: number) => {
    const clamped = Math.max(1, Math.min(180, newMinutes));
    setDurationMinutes(clamped);
    if (timerState === "idle" || timerState === "completed") {
      setTimeRemaining(clamped * 60);
      setTimerState("idle");
    }
  };

  // Play gentle completion chime using Web Audio API
  const playCompletedChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3); // C6
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.warn("Audio Context chime failed", e);
    }
  };

  // Log completed session
  const handleCompleteSession = async (overrideMinutes?: number) => {
    if (isLoggingRef.current) return;
    isLoggingRef.current = true;

    const sessionMinutes = overrideMinutes ?? durationMinutes;
    setTimerState("completed");
    playCompletedChime();

    const taskLabel = selectedTaskId === "custom" && customTitle.trim()
      ? customTitle.trim()
      : selectedTaskId !== "general"
        ? osData.tasks.find(t => t.id === selectedTaskId)?.title || "Focus Session"
        : "General Focus";

    const result = await logFocusSession(sessionMinutes, 100);

    if (result.success && result.summary) {
      setCompletedSessions(result.summary.todayCompletedBlocks);
      setTodayFocusMinutes(result.summary.todayTotalMinutes);
    } else {
      setCompletedSessions((prev) => prev + 1);
      setTodayFocusMinutes((prev) => prev + sessionMinutes);
    }

    showToast(`Great work! Logged ${sessionMinutes}m for "${taskLabel}".`, "success");
    setTimeRemaining(durationMinutes * 60);
  };

  // Timer countdown
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (timerState === "running" && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timerState === "running" && timeRemaining === 0) {
      handleCompleteSession();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState, timeRemaining, durationMinutes]);

  const toggleTimer = () => {
    if (timerState === "running") {
      setTimerState("paused");
    } else {
      isLoggingRef.current = false;
      setTimerState("running");
    }
  };

  const handleReset = () => {
    setTimerState("idle");
    setTimeRemaining(durationMinutes * 60);
    isLoggingRef.current = false;
  };

  const addExtraMinutes = (extraMinutes: number) => {
    setTimeRemaining((prev) => Math.max(60, prev + extraMinutes * 60));
  };

  const formatTime = (secs: number) => {
    const mm = Math.floor(secs / 60).toString().padStart(2, "0");
    const ss = (secs % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // SVG circular calculations
  const totalSeconds = durationMinutes * 60;
  const progressRatio = totalSeconds > 0 ? timeRemaining / totalSeconds : 1;
  const strokeDashoffset = 2 * Math.PI * 90 * (1 - progressRatio);

  const pendingTasks = osData.tasks.filter((t) => t.status === "pending");

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto">
      {/* Main Focus Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs flex flex-col items-center justify-between text-center space-y-6 transition-all">
        
        {/* Task Selection */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-center gap-2 text-slate-800 dark:text-slate-200">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="font-display font-bold text-lg">Focus Timer</h2>
          </div>

          <div className="max-w-xs mx-auto">
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
            >
              <option value="general">🎯 General Focus Session</option>
              {pendingTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  📋 {t.title}
                </option>
              ))}
              <option value="custom">✏️ Custom Task...</option>
            </select>

            {selectedTaskId === "custom" && (
              <input
                type="text"
                placeholder="What are you working on?"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full mt-2 text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            )}
          </div>
        </div>

        {/* Duration Presets & Custom Adjuster */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            {PRESET_DURATIONS.map((mins) => (
              <button
                key={mins}
                disabled={timerState === "running"}
                onClick={() => handleDurationChange(mins)}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  durationMinutes === mins
                    ? "bg-amber-500 border-amber-500 text-slate-950 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-500/50 disabled:opacity-50"
                }`}
              >
                {mins}m
              </button>
            ))}

            {/* Custom Minutes Input */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1">
              <input
                type="number"
                min="1"
                max="180"
                disabled={timerState === "running"}
                value={durationMinutes}
                onChange={(e) => handleDurationChange(parseInt(e.target.value) || 25)}
                className="w-10 text-center font-mono font-bold text-xs bg-transparent text-slate-800 dark:text-slate-200 outline-none disabled:opacity-50"
              />
              <span className="text-[10px] font-bold text-slate-400">min</span>
            </div>
          </div>
        </div>

        {/* Circular Countdown Ring */}
        <div className="relative w-56 h-56 flex items-center justify-center my-2">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle 
              cx="112" cy="112" r="90" 
              className="stroke-slate-100 dark:stroke-slate-800 fill-none" 
              strokeWidth="7"
            />
            <circle 
              cx="112" cy="112" r="90" 
              className="stroke-amber-500 fill-none transition-all duration-300 ease-linear" 
              strokeWidth="7"
              strokeDasharray={2 * Math.PI * 90}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>

          {/* Time & State in center */}
          <div className="text-center z-10 space-y-1">
            <span className="font-mono font-bold text-5xl text-slate-900 dark:text-slate-100 tracking-tight block">
              {formatTime(timeRemaining)}
            </span>
            <span className={`text-xs font-medium block ${
              timerState === "running" ? "text-amber-500 font-semibold animate-pulse" :
              timerState === "paused" ? "text-amber-600 dark:text-amber-400" :
              timerState === "completed" ? "text-emerald-600 dark:text-emerald-400 font-semibold" : 
              "text-slate-400 dark:text-slate-500"
            }`}>
              {timerState === "running" ? "Focusing..." :
               timerState === "paused" ? "Paused" :
               timerState === "completed" ? "Session Completed! 🎉" : "Ready"}
            </span>
          </div>
        </div>

        {/* Timer Control Buttons */}
        <div className="flex items-center gap-3">
          {/* Reset */}
          <button
            onClick={handleReset}
            className="p-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl transition-all cursor-pointer"
            title="Reset timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Start / Pause Main Button */}
          <button
            onClick={toggleTimer}
            className="h-14 w-14 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl flex items-center justify-center cursor-pointer shadow-md hover:shadow-lg active:scale-95 transition-all"
            title={timerState === "running" ? "Pause" : "Start"}
          >
            {timerState === "running" ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current translate-x-0.5" />
            )}
          </button>

          {/* Quick +5 Min button while running */}
          {timerState === "running" && (
            <button
              onClick={() => addExtraMinutes(5)}
              className="px-3 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-2xl transition-all cursor-pointer"
              title="Add 5 minutes"
            >
              +5m
            </button>
          )}

          {/* Log / Finish Session early */}
          {(timerState === "running" || timerState === "paused") && (
            <button
              onClick={() => {
                const elapsedMinutes = Math.max(1, Math.round((durationMinutes * 60 - timeRemaining) / 60));
                handleCompleteSession(elapsedMinutes);
              }}
              className="flex items-center gap-1.5 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finish ({Math.max(1, Math.round((durationMinutes * 60 - timeRemaining) / 60))}m)</span>
            </button>
          )}
        </div>

        {/* Clean Focus Stats */}
        <div className="grid grid-cols-2 gap-3 w-full pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/60 text-center">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Today's Focus
            </span>
            <span className="font-mono font-bold text-amber-500 text-base block mt-0.5">
              {todayFocusMinutes} mins
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/60 text-center">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Sessions Completed
            </span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-base block mt-0.5">
              {completedSessions}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
