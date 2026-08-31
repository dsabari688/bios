import React, { useState, useEffect, useRef } from "react";
import FocusScoreCard from "../dashboard/FocusScoreCard";
import { Play, Pause, RotateCcw, CheckCircle2, ShieldCheck, Flame, Bell, VolumeX, Volume2 } from "lucide-react";
import { useStore } from "../../store/useStore";
import { getApiBaseUrl } from "../../api/client";

export type TimerState = "idle" | "running" | "paused" | "completed";

export const FocusModeView: React.FC = () => {
  const { osData, logFocusSession, showToast } = useStore();
  const [selectedTask, setSelectedTask] = useState<string>("general");
  const [selectedDuration, setSelectedDuration] = useState<number>(25); // minutes
  const [timeRemaining, setTimeRemaining] = useState<number>(25 * 60); // seconds
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [focusScore, setFocusScore] = useState<number>(85);
  const [completedSessions, setCompletedSessions] = useState<number>(0);
  const [todayFocusMinutes, setTodayFocusMinutes] = useState<number>(0);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);
  const [blockWakeWord, setBlockWakeWord] = useState<boolean>(true);
  const isLoggingRef = useRef<boolean>(false);

  // Fetch initial focus metrics from backend on mount
  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/piggy/dashboard`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.summary) {
          if (typeof data.summary.todayFocusMinutes === "number") {
            setTodayFocusMinutes(data.summary.todayFocusMinutes);
          }
          if (typeof data.summary.focusBlocksCompleted === "number") {
            setCompletedSessions(data.summary.focusBlocksCompleted);
          }
        }
      })
      .catch((err) => console.warn("Failed to fetch initial focus telemetry:", err));
  }, []);

  // Sync timer when duration changes
  useEffect(() => {
    setTimeRemaining(selectedDuration * 60);
    setTimerState("idle");
    setAlertBanner(null);
    isLoggingRef.current = false;
  }, [selectedDuration]);

  // Play synthesized electronic completeness chime using web AudioContext
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

  // Helper to handle completing & persisting a focus block to DB
  const handleCompleteSession = async (overrideMinutes?: number) => {
    if (isLoggingRef.current) return;
    isLoggingRef.current = true;

    const sessionMinutes = overrideMinutes ?? selectedDuration;
    setTimerState("completed");
    playCompletedChime();
    setAlertBanner(`Deep Work Block Complete! Persisting ${sessionMinutes}m session to database...`);

    const result = await logFocusSession(sessionMinutes, focusScore);

    if (result.success && result.summary) {
      setCompletedSessions(result.summary.todayCompletedBlocks);
      setTodayFocusMinutes(result.summary.todayTotalMinutes);
      setAlertBanner(`Session Logged to DB! Today's Focus: ${result.summary.todayTotalMinutes} mins across ${result.summary.todayCompletedBlocks} blocks.`);
    } else {
      setCompletedSessions((prev) => prev + 1);
      setTodayFocusMinutes((prev) => prev + sessionMinutes);
    }

    setTimeRemaining(selectedDuration * 60);
  };

  // Handle countdown interval and middle warnings
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (timerState === "running" && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          const nextTime = prev - 1;
          const totalSecs = selectedDuration * 60;
          
          // Halfway banner (50% remaining)
          if (nextTime === Math.round(totalSecs / 2)) {
            setAlertBanner("Halfway coordinate reached, Sir. Piggy observes optimum brain patterns.");
          }
          // 5-minute warning (300 seconds left)
          else if (nextTime === 300) {
            setAlertBanner("5 Minutes remaining. Conclude current cognitive loop variables.");
          }
          
          return nextTime;
        });
      }, 1000);
    } else if (timerState === "running" && timeRemaining === 0) {
      handleCompleteSession();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState, timeRemaining, selectedDuration]);

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
    setTimeRemaining(selectedDuration * 60);
    setAlertBanner(null);
    isLoggingRef.current = false;
  };

  // Human clean strings helpers
  const formatTime = (secs: number) => {
    const mm = Math.floor(secs / 60).toString().padStart(2, "0");
    const ss = (secs % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // SVG circular calculation
  const totalSeconds = selectedDuration * 60;
  const progressRatio = totalSeconds > 0 ? timeRemaining / totalSeconds : 1;
  const strokeDashoffset = 2 * Math.PI * 90 * (1 - progressRatio);

  // Task title resolution
  const activeTaskObj = osData.tasks.find((t) => t.id === selectedTask);
  const activeTaskTitle = activeTaskObj ? activeTaskObj.title : "Deep Work Focus Session";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-8 max-w-2xl mx-auto flex flex-col items-center justify-between text-center min-h-[580px] relative overflow-hidden">
      
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(245,166,35,0.02)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Header parameters */}
      <div className="space-y-1 z-10">
        <span className="font-mono text-[9px] font-bold text-amber-500 uppercase tracking-widest block">Core active target</span>
        <h3 className="font-display font-extrabold text-lg text-slate-800 max-w-md mx-auto leading-snug">
          {activeTaskTitle}
        </h3>
      </div>

      {/* Subtle Progress Banners */}
      {alertBanner && (
        <div className="w-full my-3 p-3 bg-amber-500/10 text-amber-900 border border-amber-500/20 rounded-xl text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-300 flex items-center justify-center gap-2 z-10">
          <Bell className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{alertBanner}</span>
          <button 
            onClick={() => setAlertBanner(null)} 
            className="ml-auto font-bold hover:text-amber-700 text-[10px] font-mono hover:scale-105"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Segment Selector Pills */}
      <div className="flex gap-2 my-2 font-display z-10">
        {([25, 50, 90] as const).map((mins) => (
          <button
            key={mins}
            disabled={timerState === "running"}
            onClick={() => setSelectedDuration(mins)}
            className={`px-4 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              selectedDuration === mins
                ? "bg-amber-500 border-amber-500 text-white shadow-xs"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            }`}
          >
            {mins} Min Block
          </button>
        ))}
      </div>

      {/* Large SVG Countdown Chronometer Ring */}
      <div className="relative w-52 h-52 flex items-center justify-center my-4 z-10">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle 
            cx="104" cy="104" r="90" 
            className="stroke-slate-100 fill-none" 
            strokeWidth="6"
          />
          <circle 
            cx="104" cy="104" r="90" 
            className="stroke-amber-500 fill-none transition-all duration-300 ease-linear" 
            strokeWidth="6"
            strokeDasharray={2 * Math.PI * 90}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Countdown view */}
        <div className="text-center z-10">
          <span className="font-mono font-bold text-4xl text-slate-800 tracking-tight block">
            {formatTime(timeRemaining)}
          </span>
          <span className={`font-mono text-[9px] font-bold uppercase tracking-widest block mt-1 ${
            timerState === "running" ? "text-amber-500 animate-pulse" :
            timerState === "paused" ? "text-amber-700" :
            timerState === "completed" ? "text-emerald-600" : "text-slate-400"
          }`}>
            {timerState === "running" ? "Focus Block Active" :
             timerState === "paused" ? "Session Paused" :
             timerState === "completed" ? "Session Completed & Logged" : "Block Ready"}
          </span>
        </div>
      </div>

      {/* Wake Word Blocker Control */}
      <div className="mb-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-mono text-slate-500">
        <button
          type="button"
          onClick={() => setBlockWakeWord(!blockWakeWord)}
          className="flex items-center gap-1 hover:text-slate-700 transition-colors"
        >
          {blockWakeWord ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Block Wake Word: ENABLED</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 animate-pulse" />
              <span>Block Wake Word: ALLOWED</span>
            </>
          )}
        </button>
        <span className="text-slate-300">|</span>
        <span className="text-[9px] text-slate-400 font-sans italic">Jarvis voice listener is locked during study</span>
      </div>

      {/* Control button strip */}
      <div className="flex items-center gap-4 font-display z-10">
        <button
          onClick={handleReset}
          className="p-3 border border-slate-150 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
          title="Reset sequence timer"
        >
          <RotateCcw className="w-5 h-5 shrink-0" />
        </button>

        {/* Play/Pause Trigger Button */}
        <button
          onClick={toggleTimer}
          className="h-14 w-14 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:shadow-xl active:scale-[0.96] transition-all"
          title={timerState === "running" ? "Pause active Work session" : "Initialize Work session"}
        >
          {timerState === "running" ? (
            <Pause className="w-6 h-6 fill-white text-white" />
          ) : (
            <Play className="w-6 h-6 fill-white text-white translate-x-0.5" />
          )}
        </button>

        {/* Complete Session Early & Log to DB */}
        {(timerState === "running" || timerState === "paused") && (
          <button
            onClick={() => {
              const elapsedMinutes = Math.max(1, Math.round((selectedDuration * 60 - timeRemaining) / 60));
              handleCompleteSession(elapsedMinutes);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-display font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs animate-in zoom-in-50 duration-200"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Log Session ({Math.max(1, Math.round((selectedDuration * 60 - timeRemaining) / 60))}m)</span>
          </button>
        )}
      </div>

      <FocusScoreCard score={focusScore}/>

      {/* Focus Stats Cards Grid */}
      <div className="grid grid-cols-3 gap-4 w-full pt-6 border-t border-slate-50 z-10">
        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-center">
          <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
          <span className="font-display font-black text-slate-800 text-sm block mt-1">{completedSessions} blocks</span>
        </div>

        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-center">
          <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Today's Focus</span>
          <span className="font-display font-black text-amber-500 text-sm block mt-1">
            {todayFocusMinutes} mins
          </span>
        </div>

        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-center">
          <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Stability</span>
          <span className="font-display font-black text-emerald-600 text-[11px] block mt-1 uppercase">Sovereign Focus</span>
        </div>
      </div>
    </div>
  );
};

