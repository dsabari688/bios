import React, { useState } from "react";
import { 
  BookOpen, CheckCircle, Sparkles, Send, Trash2, Calendar, 
  PenTool, Clock, Check
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { getLocalDateString } from "../../lib/timeUtils";
import { safeLogs } from "../../types";

const moodOptions = [
  { key: "focused", label: "Focused", emoji: "🎯" },
  { key: "energetic", label: "Energetic", emoji: "⚡" },
  { key: "calm", label: "Calm", emoji: "🧘" },
  { key: "stressed", label: "Stressed", emoji: "😫" },
  { key: "fatigued", label: "Tired", emoji: "💤" }
];

export const DiaryView: React.FC = () => {
  const { osData, saveDiaryEntry, deleteDiaryEntry, showToast } = useStore();
  const [diaryText, setDiaryText] = useState("");
  const [mood, setMood] = useState("focused");
  const [prodScore, setProdScore] = useState(80);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = getLocalDateString(new Date());
  const todayEntry = osData?.diaryEntries?.find(e => e.date === todayStr);

  // Daily context metrics
  const totalHabits = osData?.habits?.length || 0;
  const completedHabitsToday = osData?.habits?.filter(h => safeLogs(h?.logs).includes(todayStr)).length || 0;
  const completedTasksToday = osData?.tasks?.filter(t => t.date === todayStr && t.status === "completed").length || 0;

  const allEntries = [...(osData?.diaryEntries || [])].sort((a, b) => {
    const timeA = new Date(a.timestamp || a.date).getTime();
    const timeB = new Date(b.timestamp || b.date).getTime();
    return timeB - timeA;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diaryText.trim()) {
      showToast("Please enter a reflection before saving.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await saveDiaryEntry(diaryText.trim(), mood, prodScore);
      setDiaryText("");
      showToast("Daily reflection saved successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to save reflection.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditToday = () => {
    if (todayEntry) {
      setDiaryText(todayEntry.content || "");
      setMood(todayEntry.mood || "focused");
      setProdScore(todayEntry.productivityScore || 80);
    }
  };

  const formatEntryDate = (dateStr: string, timestampStr?: string) => {
    try {
      const d = timestampStr ? new Date(timestampStr) : new Date(dateStr);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return "Today";
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const getMoodItem = (key: string) => {
    return moodOptions.find(m => m.key === key) || { key, label: key, emoji: "📝" };
  };

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
              <BookOpen className="w-4.5 h-4.5" />
            </div>
            <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 tracking-tight">
              Daily Journal
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
            Reflect on your day, track your mood, and receive automated AI insights.
          </p>
        </div>

        {/* Today's Context Pills */}
        <div className="flex items-center gap-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-1.5 shadow-xs flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Tasks</span>
            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">{completedTasksToday} Done</span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-1.5 shadow-xs flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Habits</span>
            <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">{completedHabitsToday}/{totalHabits}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Reflection Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-sm">
                <PenTool className="w-4 h-4 text-indigo-500" />
                <span>Write Today's Reflection</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{todayStr}</span>
            </div>

            {/* Today status banner */}
            {todayEntry && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 rounded-xl flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Today's reflection has been recorded.</span>
                </div>
                <button
                  type="button"
                  onClick={handleEditToday}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
                >
                  Edit
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mood Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  How are you feeling?
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {moodOptions.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setMood(item.key)}
                      className={`py-2 px-1 text-center rounded-xl border cursor-pointer transition-all flex flex-col items-center gap-1 ${
                        mood === item.key
                          ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-600 dark:text-indigo-300 shadow-xs"
                          : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950"
                      }`}
                    >
                      <span className="text-lg">{item.emoji}</span>
                      <span className="text-[10px] font-medium leading-none">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Productivity Score */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Productivity Rating
                  </label>
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                    {prodScore}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={prodScore}
                  onChange={(e) => setProdScore(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Journal Textarea */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Reflection Notes
                </label>
                <textarea
                  required
                  rows={5}
                  value={diaryText}
                  onChange={(e) => setDiaryText(e.target.value)}
                  placeholder="How did your day go? What went well or what did you accomplish? (Supports English, Tamil, Tanglish)"
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !diaryText.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Saving..." : todayEntry ? "Update Reflection" : "Save Reflection"}</span>
              </button>
            </form>

          </div>
        </div>

        {/* Right Column: Past Reflections Timeline */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-200 text-sm">
              Past Reflections
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              {allEntries.length} {allEntries.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          {allEntries.length === 0 ? (
            <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="font-semibold text-slate-600 dark:text-slate-400 text-sm">No reflections logged yet</p>
              <p className="text-[11px] max-w-sm mx-auto">
                Write your first reflection on the left to start tracking your thoughts, progress, and AI coaching insights.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {allEntries.map((entry) => {
                const moodData = getMoodItem(entry.mood);

                return (
                  <div 
                    key={entry.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs p-5 space-y-3 transition-all"
                  >
                    {/* Entry Header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          {formatEntryDate(entry.date, entry.timestamp)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                          {entry.date}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Mood Badge */}
                        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <span>{moodData.emoji}</span>
                          <span>{moodData.label}</span>
                        </span>

                        {/* Productivity Badge */}
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                          {entry.productivityScore}%
                        </span>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Delete this reflection entry?")) {
                              deleteDiaryEntry(entry.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Entry Content */}
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {entry.content}
                    </p>

                    {/* Piggy AI Insights / Review Card */}
                    {entry.review && (
                      <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl space-y-1">
                        <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Piggy Insight</span>
                        </div>
                        <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
                          {entry.review}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
