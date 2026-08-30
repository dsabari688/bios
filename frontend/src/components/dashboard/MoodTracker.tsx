import React, { useState, useEffect } from "react";
import { Smile, CheckCircle2, History, ChevronLeft, ChevronRight, TrendingUp, Sparkles, Brain } from "lucide-react";
import { getApiBaseUrl } from "../../api/client";
import { syncQueue } from "../../sync/syncQueue";
import { syncManager } from "../../sync/syncManager";

interface MoodTrackerProps {
  token?: string | null;
}

interface MoodEntry {
  id: string;
  mood: string;
  note: string;
  createdAt: string;
}

const moodsList = [
  { emoji: "😄", label: "Great" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😐", label: "Normal" },
  { emoji: "😞", label: "Low" },
  { emoji: "😡", label: "Bad" }
];

const moodScores: Record<string, number> = {
  "Great": 5,
  "Good": 4,
  "Normal": 3,
  "Low": 2,
  "Bad": 1
};

const scoreToEmoji: Record<number, string> = {
  5: "😄",
  4: "🙂",
  3: "😐",
  2: "😞",
  1: "😡"
};

const generateAIReview = (history: MoodEntry[]) => {
  if (history.length === 0) {
    return {
      status: "AWAITING BIO-TELEMETRY",
      color: "text-slate-400 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20",
      iconColor: "text-slate-400",
      summary: "Input your daily mind state metrics above to generate a real-time cognitive optimization review.",
      suggestions: [
        "Select your current mood and log optional reflections.",
        "Maintain consistent logging intervals for high-precision trend analysis.",
        "Align with J.A.R.V.I.S. recommendations to boost daily productivity."
      ]
    };
  }

  // Calculate average score of last 5 entries
  const lastEntries = history.slice(0, 5);
  const totalScore = lastEntries.reduce((sum, entry) => sum + (moodScores[entry.mood] || 3), 0);
  const avg = totalScore / lastEntries.length;

  if (avg >= 4.2) {
    return {
      status: "OPTIMAL SYNERGY (COGNITIVE SURPLUS)",
      color: "text-emerald-700 border-emerald-200 bg-emerald-50/[0.08] dark:text-emerald-400 dark:border-emerald-900/40 dark:bg-emerald-950/[0.04]",
      iconColor: "text-emerald-500",
      summary: "Your neural bandwidth and emotional telemetry indicate a highly productive state of flow. Capitalize on this optimal alignment for strategic tasks.",
      suggestions: [
        "Tackle high-complexity architectural design or deep-focus coding queues.",
        "Document current mental workflows to replicate this flow state in future cycles.",
        "Spread positive resonance to team logs or save energy for late-day active review."
      ]
    };
  } else if (avg >= 3.2) {
    return {
      status: "STABLE ALIGNMENT (MAINTENANCE MODE)",
      color: "text-blue-700 border-blue-200 bg-blue-50/[0.08] dark:text-blue-400 dark:border-blue-900/40 dark:bg-blue-950/[0.04]",
      iconColor: "text-blue-500",
      summary: "Focus metrics are within normal baseline thresholds. You are maintaining steady focus, but there is headroom to optimize mental crispness.",
      suggestions: [
        "Integrate a 5-minute spatial resetting break (look 20 feet away to relax visual strain).",
        "Hydrate and step away from digital screens for brief intervals to recharge cognitive reserve.",
        "Consider logging progress on minor goals to trigger standard dopamine loops."
      ]
    };
  } else if (avg >= 2.2) {
    return {
      status: "COGNITIVE DISSIPATION DETECTED",
      color: "text-amber-700 border-amber-200 bg-amber-50/[0.08] dark:text-amber-400 dark:border-amber-900/40 dark:bg-amber-950/[0.04]",
      iconColor: "text-amber-500",
      summary: "Mild fatigue or situational stress is impacting focus levels. Cognitive performance is slightly throttled. A tactical reset is advised.",
      suggestions: [
        "Activate focus breathing mode (4s inhale, 4s hold, 4s exhale, 4s hold) for 3 cycles.",
        "De-clutter active terminal sessions and focus strictly on one task to minimize multi-tasking tax.",
        "Adjust lighting temperature and ensure physical ergonomic support is optimal."
      ]
    };
  } else {
    return {
      status: "CRITICAL COGNITIVE RECOVERY LEVEL",
      color: "text-rose-700 border-rose-200 bg-rose-50/[0.08] dark:text-rose-400 dark:border-rose-900/40 dark:bg-rose-950/[0.04]",
      iconColor: "text-rose-500",
      summary: "System logs show severe energy fatigue or stress levels. Standard operational bandwidth is compromised. Initiate immediate recovery protocol.",
      suggestions: [
        "Declare a temporary freeze on high-stress decision gates for the next 2 hours.",
        "Perform a physiological sigh (two quick inhales, followed by one long exhalation) to rapidly lower heart rate.",
        "Step outdoors or hydrate immediately; allocate 15 minutes of non-directed mental rest."
      ]
    };
  }
};

export default function MoodTracker({ token }: MoodTrackerProps) {
  const [selectedMood, setSelectedMood] = useState("");
  const [note, setNote] = useState("");
  const [todayMood, setTodayMood] = useState<MoodEntry | null>(null);
  const [history, setHistory] = useState<MoodEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyTab, setHistoryTab] = useState<"today" | "past">("today");

  // Calendar Year/Month State
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    // Default to July 2026 to align with system logs, otherwise current date
    const d = new Date();
    if (d.getFullYear() < 2026) {
      return new Date(2026, 6, 1); // July 2026
    }
    return d;
  });

  // Helper to format date as "12 Jul, 10:00 AM"
  const formatMoodDate = (date: Date): string => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = date.getDate();
    const dayStr = day < 10 ? "0" + day : day;
    const month = months[date.getMonth()];
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const minStr = minutes < 10 ? "0" + minutes : minutes;
    return `${dayStr} ${month}, ${hours}:${minStr} ${ampm}`;
  };

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async (): Promise<MoodEntry[]> => {
      // 1. Try the real backend first (source of truth)
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/moods`);
        if (!res.ok) throw new Error(`Backend responded ${res.status}`);
        const json = await res.json();
        if (!json?.success || !Array.isArray(json.data)) throw new Error("Invalid payload");

        const mapped = json.data
          .map((m: { id: string; mood: string; note: string | null; loggedAt: string }) => ({
            entry: {
              id: m.id,
              mood: m.mood,
              note: m.note ?? "",
              createdAt: formatMoodDate(new Date(m.loggedAt))
            },
            ts: new Date(m.loggedAt).getTime()
          }))
          .sort((a: { ts: number }, b: { ts: number }) => b.ts - a.ts)
          .map((item: { entry: MoodEntry }) => item.entry);

        // Read local entries to merge with remote
        const localHistoryStr = localStorage.getItem("lifeos_mood_history");
        let localEntries: MoodEntry[] = [];
        if (localHistoryStr) {
          try { localEntries = JSON.parse(localHistoryStr); } catch {}
        }

        // Combine local and remote entries (local entries prioritized)
        const combined = [...localEntries, ...mapped];
        const deduplicated: MoodEntry[] = [];
        const seenIds = new Set<string>();
        const seenKeys = new Set<string>();

        for (const item of combined) {
          const key = `${item.createdAt}_${item.mood}_${item.note}`;
          if (!seenIds.has(item.id) && !seenKeys.has(key)) {
            seenIds.add(item.id);
            seenKeys.add(key);
            deduplicated.push(item);
          }
        }

        // Mirror to localStorage so the offline fallback stays current
        localStorage.setItem("lifeos_mood_history", JSON.stringify(deduplicated));
        return deduplicated;
      } catch {
        // 2. Fallback: localStorage (offline mode)
        const localHistory = localStorage.getItem("lifeos_mood_history");
        if (localHistory) {
          try {
            const raw: MoodEntry[] = JSON.parse(localHistory);
            const deduplicated: MoodEntry[] = [];
            const seenKeys = new Set<string>();
            for (const item of raw) {
              const key = `${item.createdAt}_${item.mood}_${item.note}`;
              if (!seenKeys.has(key)) {
                seenKeys.add(key);
                deduplicated.push(item);
              }
            }
            return deduplicated;
          } catch (e) {
            console.error("Failed to parse mood history:", e);
          }
        }
        return [];
      }
    };

    (async () => {
      const historyData = await loadHistory();
      if (cancelled) return;

      setHistory(historyData);

      // Check if a mood was already logged today
      const todayPrefix = new Date().getDate() < 10 ? "0" + new Date().getDate() : "" + new Date().getDate();
      const todayMonth = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][new Date().getMonth()];
      const todayDateMatch = `${todayPrefix} ${todayMonth}`;

      const loggedToday = historyData.find(entry => entry.createdAt.startsWith(todayDateMatch));
      setTodayMood(loggedToday || null);

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [saved]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveMood = async () => {
    if (!selectedMood || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const moodNote = note.trim() || "State optimized";
      const now = new Date();
      const newId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `mood_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const newEntry: MoodEntry = {
        id: newId,
        mood: selectedMood,
        note: moodNote,
        createdAt: formatMoodDate(now)
      };

      // 1. Update UI state and localStorage immediately
      const updatedHistory = [newEntry, ...history.filter(h => h.id !== newId)];
      setHistory(updatedHistory);
      localStorage.setItem("lifeos_mood_history", JSON.stringify(updatedHistory));
      setTodayMood(newEntry);

      // 2. Direct API call with explicit ID (upsert)
      try {
        const baseUrl = getApiBaseUrl();
        await fetch(`${baseUrl}/moods`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            id: newId,
            mood: selectedMood,
            note: moodNote
          })
        });
      } catch (err) {
        console.warn("Direct mood save deferred:", err);
      }

      // 3. Queue for sync manager
      try {
        await syncQueue.enqueue("mood", newEntry.id, "create", {
          id: newEntry.id,
          mood: selectedMood,
          note: moodNote,
          loggedAt: now.toISOString(),
          createdAt: now.toISOString()
        });
        syncManager.triggerSync();
      } catch (e) {
        console.warn("Failed to enqueue mood sync:", e);
      }

      setNote("");
      setSelectedMood("");
      setSaved(prev => !prev);
    } catch (err) {
      console.warn("Failed to save mood:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 animate-pulse flex items-center justify-center text-slate-400 font-mono text-xs">
        Connecting to neural telemetry...
      </div>
    );
  }

  const loggedEmoji = moodsList.find(m => m.label === todayMood?.mood)?.emoji || "😄";

  // --- Calendar Logic ---
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthShortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  // Generate calendar cells (empty prefix, then actual dates)
  const cells: { dayNum: number | null; dateString: string; entries: MoodEntry[]; avgScore: number | null; avgEmoji: string | null }[] = [];

  for (let i = 0; i < firstDayIndex; i++) {
    cells.push({
      dayNum: null,
      dateString: "",
      entries: [],
      avgScore: null,
      avgEmoji: null
    });
  }

  for (let day = 1; day <= totalDays; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const monthStr = monthShortNames[month];
    const datePrefix = `${dayStr} ${monthStr}`;

    const dayEntries = history.filter(entry => entry.createdAt.startsWith(datePrefix));

    let avgScore: number | null = null;
    let avgEmoji: string | null = null;

    if (dayEntries.length > 0) {
      const totalScore = dayEntries.reduce((sum, entry) => {
        return sum + (moodScores[entry.mood] || 3);
      }, 0);
      avgScore = Math.round(totalScore / dayEntries.length);
      avgEmoji = scoreToEmoji[avgScore] || "😐";
    }

    cells.push({
      dayNum: day,
      dateString: `${day} ${monthNames[month]} ${year}`,
      entries: dayEntries,
      avgScore,
      avgEmoji
    });
  }

  // --- Trend Logic ---
  // Take last 7 entries to plot
  const trendEntries = [...history].slice(0, 7).reverse();
  const hasTrendData = trendEntries.length > 0;

  // Render SVG Trend Graph Coordinates
  const svgWidth = 280;
  const svgHeight = 150;
  const paddingLeft = 55;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 25;

  const graphWidth = svgWidth - paddingLeft - paddingRight;
  const graphHeight = svgHeight - paddingTop - paddingBottom;

  // y coordinate function
  const getYCoordinate = (score: number) => {
    // scale 1 (Bad) to 5 (Great)
    // 5 -> paddingTop
    // 1 -> paddingTop + graphHeight
    const ratio = (5 - score) / 4;
    return paddingTop + ratio * graphHeight;
  };

  // x coordinate function
  const getXCoordinate = (index: number, total: number) => {
    if (total <= 1) return paddingLeft + graphWidth / 2;
    return paddingLeft + index * (graphWidth / (total - 1));
  };

  // Generate SVG Path
  let pathD = "";
  if (hasTrendData) {
    const points = trendEntries.map((entry, idx) => {
      const score = moodScores[entry.mood] || 3;
      const x = getXCoordinate(idx, trendEntries.length);
      const y = getYCoordinate(score);
      return { x, y };
    });

    pathD = points.reduce((acc, p, idx) => {
      if (idx === 0) return `M ${p.x} ${p.y}`;
      return `${acc} L ${p.x} ${p.y}`;
    }, "");
  }

  // Filter history to ONLY show today's logged entries in the MOOD HISTORY BOX
  const currentTodayPrefix = new Date().getDate() < 10 ? "0" + new Date().getDate() : "" + new Date().getDate();
  const currentTodayMonth = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][new Date().getMonth()];
  const currentTodayDateMatch = `${currentTodayPrefix} ${currentTodayMonth}`;
  const todayHistory = history.filter(entry => entry.createdAt.startsWith(currentTodayDateMatch));

  // Past History entries (everything that isn't logged today)
  const pastHistoryEntries = history.filter(entry => !entry.createdAt.startsWith(currentTodayDateMatch));

  // Group pastHistoryEntries by the date part:
  const groupedPastHistory: Record<string, MoodEntry[]> = {};
  pastHistoryEntries.forEach(entry => {
    // Extract the date part. e.g., "03 Jul, 09:15 AM" -> "03 Jul"
    const datePart = entry.createdAt.includes(",") ? entry.createdAt.split(",")[0].trim() : entry.createdAt;
    if (!groupedPastHistory[datePart]) {
      groupedPastHistory[datePart] = [];
    }
    groupedPastHistory[datePart].push(entry);
  });

  const aiReview = generateAIReview(history);

  return (
    <div className="space-y-6">
      {/* Logger Module Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 transition-all hover:shadow-md dark:bg-slate-900 dark:border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:divide-x md:divide-slate-150 dark:divide-slate-800">
          
          {/* Left Column: Today's Mood Selector / Logger Status */}
          <div className="space-y-4 pb-6 md:pb-0 md:pr-6 flex flex-col justify-center">
            {todayMood ? (
              <div className="flex items-center gap-4 animate-in fade-in duration-200">
                <div className="text-4xl filter drop-shadow select-none">
                  {loggedEmoji}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md inline-block dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400">
                    METRICS LOGGED FOR TODAY
                  </span>
                  <h3 className="font-display font-black text-slate-800 dark:text-slate-200 text-sm md:text-base leading-tight mt-1 truncate">
                    You logged a {todayMood.mood} mood today.
                  </h3>
                  {todayMood.note && (
                    <p className="text-xs text-slate-500 dark:text-slate-450 font-sans italic mt-1 line-clamp-2">
                      "{todayMood.note}"
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setTodayMood(null);
                      setSaved(false);
                    }}
                    className="mt-3 px-3 py-1 bg-slate-50 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-700 font-display font-bold text-[9px] uppercase tracking-wider rounded-md transition-all cursor-pointer active:scale-95"
                  >
                    Log Another State
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Smile className="w-4.5 h-4.5 text-amber-500" />
                  <h3 className="font-display font-bold text-slate-800 dark:text-slate-200 text-sm">How are you feeling today, Sir?</h3>
                </div>

                <div className="flex gap-2 justify-between max-w-md">
                  {moodsList.map((m) => {
                    const isSelected = selectedMood === m.label;
                    return (
                      <button
                        key={m.label}
                        onClick={() => setSelectedMood(m.label)}
                        className={`flex-1 p-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? "border-amber-500 bg-amber-55/40 text-amber-800 dark:text-amber-300 font-black scale-[1.02]"
                            : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-200 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <span className="text-2xl filter drop-shadow select-none hover:scale-110 transition-transform mb-1">
                          {m.emoji}
                        </span>
                        <span className="text-[10px] font-display font-semibold uppercase tracking-wider">
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedMood && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <input
                      type="text"
                      placeholder="Optional reflection or notes..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full max-w-md px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                    />
                    <div>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleSaveMood}
                        className="px-5 py-2.5 bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 border border-transparent hover:bg-slate-800 text-white font-display font-bold text-[11px] uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer max-w-fit active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                        {isSubmitting ? "Logging State..." : "Log Mind State"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Scrollable Mood History Box */}
          <div className="pt-6 md:pt-0 md:pl-6 flex flex-col justify-between h-full min-h-[180px]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400 dark:text-slate-550" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550">
                    MOOD HISTORY BOX
                  </span>
                </div>
              </div>

              {/* Beautiful Sliding Tab Switch */}
              <div className="relative flex p-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl mb-3">
                <div
                  className="absolute top-0.5 bottom-0.5 left-0.5 bg-white dark:bg-slate-800 rounded-lg shadow-xs transition-all duration-300"
                  style={{
                    width: "calc(50% - 2px)",
                    transform: historyTab === "today" ? "translateX(0)" : "translateX(100%)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setHistoryTab("today")}
                  className={`relative z-10 flex-1 py-1.5 text-center text-[10px] font-mono font-black uppercase tracking-wider transition-colors cursor-pointer ${
                    historyTab === "today" ? "text-amber-600 dark:text-amber-400 font-bold" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Current Date
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab("past")}
                  className={`relative z-10 flex-1 py-1.5 text-center text-[10px] font-mono font-black uppercase tracking-wider transition-colors cursor-pointer ${
                    historyTab === "past" ? "text-amber-600 dark:text-amber-400 font-bold" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Past History
                </button>
              </div>

              <div className="overflow-y-auto max-h-[170px] pr-1 space-y-2 custom-scrollbar">
                {historyTab === "today" ? (
                  todayHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-550 font-mono text-[11px] border border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                      No mental states logged today.
                    </div>
                  ) : (
                    todayHistory.map((entry) => {
                      const emoji = moodsList.find(m => m.label === entry.mood)?.emoji || "😄";
                      return (
                        <div
                          key={entry.id}
                          className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-950/75 transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] font-semibold text-slate-400 dark:text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">
                              {entry.createdAt}
                            </span>
                          </div>
                          <div className="text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 flex-wrap">
                            <span className="text-base select-none">{emoji}</span>
                            <span className="font-bold text-slate-800 dark:text-slate-100 font-display">{entry.mood}</span>
                            {entry.note && (
                              <span className="text-slate-500 dark:text-slate-450 font-normal text-[11px] font-sans">
                                — <span className="italic">"{entry.note}"</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )
                ) : (
                  Object.keys(groupedPastHistory).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-550 font-mono text-[11px] border border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                      No past history logs found.
                    </div>
                  ) : (
                    Object.keys(groupedPastHistory).map((date) => (
                      <div key={date} className="space-y-1.5 border-b border-slate-50 dark:border-slate-800/40 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                        <div className="font-mono text-[9px] font-black text-amber-600 dark:text-amber-500 tracking-wider uppercase">
                          {date}
                        </div>
                        <div className="space-y-1.5">
                          {groupedPastHistory[date].map((entry) => {
                            const emoji = moodsList.find(m => m.label === entry.mood)?.emoji || "😄";
                            const timePart = entry.createdAt.includes(",") ? entry.createdAt.split(",")[1].trim() : "";
                            return (
                              <div
                                key={entry.id}
                                className="p-2.5 bg-slate-50/60 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850 rounded-xl space-y-0.5 hover:border-slate-200 dark:hover:border-slate-750 transition-all"
                              >
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-755 dark:text-slate-200">
                                  <span className="flex items-center gap-1.5">
                                    <span className="text-base select-none">{emoji}</span>
                                    <span className="font-bold font-display">{entry.mood}</span>
                                  </span>
                                  <span className="font-mono text-[9px] text-slate-400 dark:text-slate-550">{timePart}</span>
                                </div>
                                {entry.note && (
                                  <p className="text-[10px] text-slate-500 dark:text-slate-450 italic font-sans pl-5 leading-normal">
                                    "{entry.note}"
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* NEW Dual Widget: Mood History Calendar Grid (Left) & Mood Trend Chart (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Mood History Calendar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="font-display font-black text-sm text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                Mood History
              </span>
            </div>
            
            {/* Calendar Navigation */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {monthNames[month]} {year}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 rounded-md border border-slate-150 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1 rounded-md border border-slate-150 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((cell, idx) => {
              const colIndex = idx % 7;
              const hasEntries = cell.entries.length > 0;
              
              if (cell.dayNum === null) {
                return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/20 dark:bg-slate-950/10 rounded-lg border border-transparent" />;
              }

              return (
                <div
                  key={`day-${cell.dayNum}`}
                  className={`relative group aspect-square rounded-xl border flex flex-col items-center justify-between p-1 transition-all ${
                    hasEntries
                      ? "bg-amber-500/[0.04] dark:bg-amber-500/[0.02] border-amber-200 dark:border-amber-950 cursor-pointer hover:border-amber-400 dark:hover:border-amber-800"
                      : "bg-slate-50/30 dark:bg-slate-950/10 border-slate-100 dark:border-slate-850 text-slate-400 dark:text-slate-600 hover:border-slate-200 dark:hover:border-slate-700"
                  }`}
                >
                  {/* Day Number */}
                  <span className={`text-[9px] font-mono font-bold block self-start ${hasEntries ? "text-amber-600 dark:text-amber-500" : "text-slate-400 dark:text-slate-600"}`}>
                    {cell.dayNum}
                  </span>

                  {/* Mood Emoji or Null indicator */}
                  {hasEntries ? (
                    <span className="text-base select-none filter drop-shadow-sm pb-1 animate-in fade-in duration-300">
                      {cell.avgEmoji}
                    </span>
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800 mb-1" />
                  )}

                  {/* Tooltip Popup on Hover */}
                  {hasEntries && (
                    <div className={`absolute hidden group-hover:block z-50 bg-slate-900 dark:bg-slate-950 text-white border border-slate-700/80 rounded-xl p-3 shadow-xl w-64 text-left pointer-events-none transition-all duration-150 ${
                      colIndex < 2 
                        ? "left-0 bottom-full mb-2 origin-bottom-left animate-in zoom-in-95 duration-100" 
                        : colIndex > 4 
                        ? "right-0 bottom-full mb-2 origin-bottom-right animate-in zoom-in-95 duration-100" 
                        : "left-1/2 -translate-x-1/2 bottom-full mb-2 origin-bottom animate-in zoom-in-95 duration-100"
                    }`}>
                      <div className="font-display font-black text-xs text-amber-400 mb-1.5 pb-1 border-b border-white/10 flex justify-between items-center">
                        <span>{cell.dateString}</span>
                        <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-wider">
                          {cell.entries.length} {cell.entries.length > 1 ? "LOGS" : "LOG"}
                        </span>
                      </div>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                        {cell.entries.map((entry, entryIdx) => {
                          const timePart = entry.createdAt.includes(",") ? entry.createdAt.split(",")[1].trim() : "";
                          const entryEmoji = moodsList.find(m => m.label === entry.mood)?.emoji || "😐";
                          return (
                            <div key={entry.id || entryIdx} className="space-y-0.5 border-l-2 border-amber-500/30 pl-2">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                                <span className="flex items-center gap-1">
                                  <span>{entryEmoji}</span>
                                  <span>{entry.mood}</span>
                                </span>
                                <span className="text-[9px] font-mono text-slate-400">{timePart}</span>
                              </div>
                              {entry.note && (
                                <p className="text-[10px] text-slate-400 italic font-sans leading-relaxed">
                                  "{entry.note}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Mood Trend Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="font-display font-black text-sm text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                Mood Trend
              </span>
            </div>
            
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/40 px-2 py-0.5 border border-slate-100 dark:border-slate-800 rounded-md">
              Past {trendEntries.length} Records
            </span>
          </div>

          <div className="flex items-center justify-center">
            {hasTrendData ? (
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="1" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Horizontal Gridlines */}
                {[5, 4, 3, 2, 1].map((score) => {
                  const y = getYCoordinate(score);
                  return (
                    <line
                      key={`grid-${score}`}
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-100 dark:text-slate-800"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Y Axis Labels */}
                {[
                  { label: "GREAT", score: 5 },
                  { label: "GOOD", score: 4 },
                  { label: "NORMAL", score: 3 },
                  { label: "LOW", score: 2 },
                  { label: "BAD", score: 1 }
                ].map((item) => (
                  <text
                    key={`y-label-${item.score}`}
                    x={paddingLeft - 8}
                    y={getYCoordinate(item.score) + 3}
                    textAnchor="end"
                    className="font-mono text-[8px] font-black text-slate-400 dark:text-slate-500 fill-current"
                  >
                    {item.label}
                  </text>
                ))}

                {/* Trend Path */}
                {trendEntries.length > 1 && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="url(#trendGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                  />
                )}

                {/* Trend Interactive Points and Labels */}
                {trendEntries.map((entry, idx) => {
                  const score = moodScores[entry.mood] || 3;
                  const x = getXCoordinate(idx, trendEntries.length);
                  const y = getYCoordinate(score);
                  const emoji = moodsList.find(m => m.label === entry.mood)?.emoji || "😐";

                  return (
                    <g key={`point-${entry.id || idx}`} className="group cursor-pointer">
                      {/* Emoji above node */}
                      <text
                        x={x}
                        y={y - 12}
                        textAnchor="middle"
                        className="text-xs select-none pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity"
                      >
                        {emoji}
                      </text>

                      {/* Small line indicator from label to node */}
                      <line x1={x} y1={y - 6} x2={x} y2={y} stroke="currentColor" className="text-amber-500/20 group-hover:text-amber-500/50" strokeWidth="1" />

                      {/* Hover dot highlights */}
                      <circle
                        cx={x}
                        cy={y}
                        r="10"
                        className="fill-transparent group-hover:fill-amber-500/10 transition-colors"
                      />

                      {/* Main node dot */}
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        className="fill-amber-500 stroke-white dark:stroke-slate-900 stroke-2 transition-all group-hover:r-5.5"
                      />

                      {/* X Axis Label */}
                      <text
                        x={x}
                        y={svgHeight - 8}
                        textAnchor="middle"
                        className="font-mono text-[8px] font-bold text-slate-400 dark:text-slate-500 fill-current group-hover:text-amber-500 dark:group-hover:text-amber-500 transition-colors"
                      >
                        {idx + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-550 font-mono text-[11px] border border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 w-full min-h-[130px]">
                Awaiting performance metrics...
              </div>
            )}
          </div>
        </div>

      </div>

      {/* NEW AI REVIEW & RECOVERY INSIGHTS PANEL (Full width from left to right) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-all hover:shadow-md animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 dark:border-slate-800/80 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-amber-500 animate-pulse" />
            <div>
              <span className="font-display font-black text-sm text-slate-800 dark:text-slate-200 uppercase tracking-tight block">
                Cognitive J.A.R.V.I.S. Review
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-550 font-mono">
                REAL-TIME EMOTIONAL ANALYTICS
              </span>
            </div>
          </div>
          
          <div className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-black border uppercase tracking-wider flex items-center gap-1.5 ${aiReview.color}`}>
            <Sparkles className={`w-3 h-3 ${aiReview.iconColor}`} />
            {aiReview.status}
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-450 leading-relaxed font-sans mb-4">
          {aiReview.summary}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {aiReview.suggestions.map((suggestion, index) => (
            <div 
              key={index} 
              className="p-3.5 rounded-xl border border-slate-50 dark:border-slate-850 bg-slate-50/40 dark:bg-slate-950/20 space-y-1 hover:border-amber-200 dark:hover:border-amber-950 transition-all"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.2 rounded">
                  0{index + 1}
                </span>
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  ACTION PLAN
                </span>
              </div>
              <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed font-sans font-medium">
                {suggestion}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}



