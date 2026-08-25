import React, { useState, useEffect } from "react";
import { 
  BookOpen, Lock, ShieldAlert, CheckCircle, RefreshCw, AlertTriangle,
  Smile, Moon, Sparkles, Send, Trash2, Calendar, Award, Compass, Eye,
  ChevronLeft, ChevronRight, Bookmark, ArrowLeft, PenTool
} from "lucide-react";
import { useStore } from "../store/useStore";
import { motion, AnimatePresence } from "motion/react";

export const DiaryView: React.FC = () => {
  const { osData, saveDiaryEntry, deleteDiaryEntry, showToast } = useStore();
  const [diaryText, setDiaryText] = useState("");
  const [mood, setMood] = useState("focused");
  const [prodScore, setProdScore] = useState(80);
  const [isBypassed, setIsBypassed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  
  // Real-time Night Detection
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  
  // 3D Physical Diary Book states
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [indexPage, setIndexPage] = useState(0); // Pagination for the index on the left page
  const [flipKey, setFlipKey] = useState(0);     // Key to trigger page flip animation
  const [isBookCoverOpen, setIsBookCoverOpen] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const isNight = currentHour >= 18 || currentHour < 6;
  const isUnlocked = isNight || isBypassed;

  // Auto-select latest entry on mount or updates
  useEffect(() => {
    if (osData?.diaryEntries && osData.diaryEntries.length > 0) {
      if (!selectedEntryId) {
        setSelectedEntryId(osData.diaryEntries[0].id);
      }
    }
  }, [osData, selectedEntryId]);

  // Analysis Animation Steps
  useEffect(() => {
    if (isAnalyzing) {
      const intervals = [800, 1500, 2400, 3200];
      const timers = intervals.map((time, idx) => 
        setTimeout(() => setAnalysisStep(idx + 1), time)
      );
      
      const completionTimer = setTimeout(() => {
        saveDiaryEntry(diaryText, mood, prodScore);
        setIsAnalyzing(false);
        setDiaryText("");
        setAnalysisStep(0);
        // Automatically flip to the first page (latest entry) when completed
        if (osData?.diaryEntries && osData.diaryEntries.length > 0) {
          setSelectedEntryId(osData.diaryEntries[0].id);
        }
        setFlipKey(prev => prev + 1);
        showToast("Diary entries compiled successfully, Sir! Flip through your book.", "success");
      }, 4000);

      return () => {
        timers.forEach(clearTimeout);
        clearTimeout(completionTimer);
      };
    }
  }, [isAnalyzing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diaryText.trim()) {
      showToast("Please input some tactical details first, Sir.", "warning");
      return;
    }
    setIsAnalyzing(true);
  };

  const getMoodEmoji = (m: string) => {
    switch (m) {
      case "energetic": return "⚡ Energetic";
      case "calm": return "🧘 Calm";
      case "focused": return "🎯 Focused";
      case "stressed": return "😫 Stressed";
      case "fatigued": return "💤 Fatigued";
      default: return "📝 Neutral";
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayEntry = osData?.diaryEntries?.find(e => e.date === todayStr);

  // Stats computation
  const totalHabits = osData?.habits?.length || 0;
  const completedHabitsToday = osData?.habits?.filter(h => h.logs.includes(todayStr)).length || 0;
  const completedTasksToday = osData?.tasks?.filter(t => t.date === todayStr && t.status === "completed").length || 0;

  // Retrieve selected entry object
  const activeEntry = osData?.diaryEntries?.find(e => e.id === selectedEntryId) || osData?.diaryEntries?.[0];

  // Index Pagination items
  const entriesPerPage = 5;
  const allEntries = osData?.diaryEntries || [];
  const totalIndexPages = Math.max(1, Math.ceil(allEntries.length / entriesPerPage));
  const paginatedEntries = allEntries.slice(indexPage * entriesPerPage, (indexPage + 1) * entriesPerPage);

  const selectEntry = (id: string) => {
    if (id !== selectedEntryId) {
      setSelectedEntryId(id);
      setFlipKey(prev => prev + 1); // Triggers visual flip rotation
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 rounded-xl">
              <BookOpen className="w-5 h-5 shrink-0" />
            </div>
            <h1 className="text-xl font-display font-black text-slate-800 dark:text-white uppercase tracking-wider">Nightly Reflection Diary</h1>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">
            CIRCADIAN REFLECTION CYCLE &bull; STAGES LOGS SECURE VAULT
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isNight ? (
            <span className="font-mono text-xs text-indigo-400 bg-indigo-950/40 border border-indigo-900/50 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              NIGHTLY LOCK COMPLIANCE: UNLOCKED
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-amber-500 bg-amber-950/30 border border-amber-900/50 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                CIRCADIAN LOCKOUT ACTIVE
              </span>
              {!isUnlocked && (
                <button
                  onClick={() => {
                    setIsBypassed(true);
                    showToast("Circadian lock bypassed. Diagnostic Test Mode active.", "info");
                  }}
                  className="font-mono text-xs text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-full cursor-pointer transition-all"
                >
                  OVERRIDE LOCK
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          /* LOCKED VIEW */
          <motion.div
            key="locked"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-slate-950 border border-slate-900 rounded-3xl p-10 text-center relative overflow-hidden shadow-2xl min-h-[400px] flex flex-col justify-center items-center"
          >
            {/* Ambient deep twilight backdrop */}
            <div className="absolute inset-0 bg-radial-gradient(circle at center, rgba(79, 70, 229, 0.08) 0%, transparent 70%) pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
            
            <div className="w-16 h-16 rounded-full bg-indigo-950/50 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/5 relative">
              <Lock className="w-7 h-7" />
              <div className="absolute inset-0 rounded-full border border-indigo-500/10 animate-ping" />
            </div>

            <h2 className="text-lg font-display font-black text-white tracking-widest uppercase mb-2">Protocol: Circadian Boundary Lock</h2>
            <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed mb-6 font-sans">
              To preserve mental hygiene and cognitive load balance, the Nightly Reflection module can only be initialized between <span className="text-indigo-400 font-mono font-bold">18:00 (6:00 PM)</span> and <span className="text-indigo-400 font-mono font-bold">06:00 (6:00 AM)</span>. 
            </p>

            <div className="flex flex-col items-center gap-3">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                SYSTEM CURRENTLY ON STANDBY &bull; RE-OPENING AT 18:00 LOCAL TIME
              </span>
              
              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => {
                    setIsBypassed(true);
                    showToast("Security override confirmed. Core diagnostics initialized.", "success");
                  }}
                  className="px-6 py-3 bg-gradient-to-tr from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-mono text-xs font-bold rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  BYPASS CIRCADIAN LOCKOUT
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* UNLOCKED / ACTIVE REFLECTION VIEW */
          <motion.div
            key="unlocked"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
          >
            {/* LEFT COLUMN: Input Form */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Today's entry summary banner if already filled */}
              {todayEntry && (
                <div className="bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20 dark:border-emerald-800/50 rounded-2xl p-4 flex items-start gap-3">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-500">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Nightly Log Transmitted</h3>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-500 mt-0.5 leading-relaxed">
                      You have already filed today's cognitive report, Sir. Submitting a new log below will override the existing log with updated metrics.
                    </p>
                  </div>
                </div>
              )}

              {/* Input Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <h2 className="text-xs font-mono font-black text-slate-800 dark:text-white tracking-widest uppercase mb-4 pb-2 border-b border-slate-50 dark:border-slate-800 flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-indigo-500" />
                  Write Evening Report
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Today's Context Quick Stats */}
                  <div className="grid grid-cols-2 gap-2 pb-2">
                    <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                      <span className="block text-[8px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">Tactical Tasks</span>
                      <span className="font-display font-black text-sm text-slate-700 dark:text-slate-300 mt-0.5 block">
                        {completedTasksToday} Completed
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                      <span className="block text-[8px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">Routines</span>
                      <span className="font-display font-black text-sm text-slate-700 dark:text-slate-300 mt-0.5 block">
                        {completedHabitsToday} / {totalHabits}
                      </span>
                    </div>
                  </div>

                  {/* Mood Selector */}
                  <div>
                    <label className="block text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                      Mental State Index
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        { key: "focused", emoji: "🎯" },
                        { key: "energetic", emoji: "⚡" },
                        { key: "calm", emoji: "🧘" },
                        { key: "stressed", emoji: "😫" },
                        { key: "fatigued", emoji: "💤" }
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setMood(item.key)}
                          title={item.key.toUpperCase()}
                          className={`py-2 text-center text-base rounded-lg border cursor-pointer transition-all ${
                            mood === item.key
                              ? "bg-indigo-500/15 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-xs"
                              : "border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950"
                          }`}
                        >
                          {item.emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Productivity Score Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Productivity Efficiency
                      </label>
                      <span className="text-[10px] font-mono font-bold text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        {prodScore}% SCORE
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={prodScore}
                      onChange={(e) => setProdScore(Number(e.target.value))}
                      className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Diary Entry Text Area */}
                  <div>
                    <label className="block text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                      Tactical Narrative (English/Tamil/Tanglish)
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={diaryText}
                      onChange={(e) => setDiaryText(e.target.value)}
                      placeholder="e.g. Naan vandhen, and then completed coding work. Gym vanden and completed task. Or write fully in தமிழ்..."
                      className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 resize-none font-sans leading-relaxed"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isAnalyzing || !diaryText.trim()}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-black uppercase tracking-wider rounded-xl shadow-md disabled:bg-slate-100 dark:disabled:bg-slate-850 disabled:text-slate-400 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    Transmit Entry
                  </button>

                </form>
              </div>

            </div>

            {/* RIGHT COLUMN: The Physical 3D Flip Page Diary Book */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* Dynamic Analyzing Overlay Mode */}
              <AnimatePresence mode="wait">
                {isAnalyzing && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-950 border border-slate-900 rounded-3xl p-6 text-center text-white relative overflow-hidden min-h-[500px] flex flex-col justify-center items-center shadow-2xl"
                  >
                    <div className="absolute inset-0 bg-radial-gradient(circle at center, rgba(79, 70, 229, 0.12) 0%, transparent 70%) pointer-events-none" />
                    
                    {/* Animated Pulsing Brain Core / Orb */}
                    <div className="relative mb-6">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 animate-pulse flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-white animate-spin duration-5000" />
                      </div>
                      <div className="absolute inset-0 w-16 h-16 rounded-full bg-indigo-500/20 animate-ping" />
                    </div>

                    <h3 className="text-sm font-display font-black text-indigo-400 uppercase tracking-widest">
                      Piggy Cognitive Processor
                    </h3>

                    {/* Progress steps animation */}
                    <div className="mt-4 space-y-2.5 max-w-xs mx-auto">
                      <div className="flex items-center gap-2 justify-center font-mono text-[10px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${analysisStep >= 1 ? "bg-indigo-400" : "bg-slate-700"}`} />
                        <span className={analysisStep >= 1 ? "text-indigo-200 font-bold" : "text-slate-500"}>Ingesting multi-language parameters</span>
                      </div>
                      <div className="flex items-center gap-2 justify-center font-mono text-[10px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${analysisStep >= 2 ? "bg-indigo-400" : "bg-slate-700"}`} />
                        <span className={analysisStep >= 2 ? "text-indigo-200 font-bold" : "text-slate-500"}>Evaluating Tamil/Tanglish milestones</span>
                      </div>
                      <div className="flex items-center gap-2 justify-center font-mono text-[10px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${analysisStep >= 3 ? "bg-indigo-400" : "bg-slate-700"}`} />
                        <span className={analysisStep >= 3 ? "text-indigo-200 font-bold" : "text-slate-500"}>Consulting Piggy's mental cortex</span>
                      </div>
                      <div className="flex items-center gap-2 justify-center font-mono text-[10px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${analysisStep >= 4 ? "bg-indigo-400" : "bg-slate-700"}`} />
                        <span className={analysisStep >= 4 ? "text-indigo-200 font-bold" : "text-slate-500"}>Compiling \"How I Did Well\" audit</span>
                      </div>
                    </div>

                    <div className="w-32 bg-slate-800 h-1 rounded-full overflow-hidden mt-6 mx-auto">
                      <div 
                        className="bg-indigo-500 h-full transition-all duration-300"
                        style={{ width: `${(analysisStep / 4) * 100}%` }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* THE PHYSICAL BOOK DESIGNED WITH REAL LEATHER AND PAPER LINED SHEETS */}
              {!isAnalyzing && (
                <div className="relative">
                  
                  {/* Book header buttons */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-indigo-500" />
                      PHYSICAL CHRONICLE BOOK MODULE
                    </span>
                    <button 
                      onClick={() => setIsBookCoverOpen(prev => !prev)}
                      className="font-mono text-[10px] text-slate-500 dark:text-slate-400 hover:text-indigo-500 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {isBookCoverOpen ? "Close Book Cover" : "Open Book"}
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {!isBookCoverOpen ? (
                      /* CLOSED BOOK COVER VIEW */
                      <motion.div
                        key="closed-cover"
                        initial={{ rotateY: -90, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        exit={{ rotateY: 90, opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        onClick={() => setIsBookCoverOpen(true)}
                        className="bg-gradient-to-tr from-[#382012] via-[#59341f] to-[#201008] border-[12px] border-[#1f0f07] rounded-3xl min-h-[500px] flex flex-col justify-center items-center text-center p-8 shadow-2xl relative overflow-hidden cursor-pointer group"
                      >
                        {/* Brass corners */}
                        <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-yellow-500/80 rounded-tl-xl" />
                        <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-yellow-500/80 rounded-tr-xl" />
                        <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-yellow-500/80 rounded-bl-xl" />
                        <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-yellow-500/80 rounded-br-xl" />
                        
                        {/* Embossed leather gold leaf texture */}
                        <div className="w-24 h-24 rounded-full border-2 border-yellow-500/30 flex items-center justify-center text-yellow-500/40 mb-6 group-hover:scale-105 group-hover:border-yellow-500/60 group-hover:text-yellow-400 transition-all">
                          <BookOpen className="w-12 h-12" />
                        </div>
                        
                        <h2 className="text-xl font-display font-black text-yellow-500/90 tracking-widest uppercase">
                          PIGGY'S CHRONICLES
                        </h2>
                        <p className="text-[10px] font-mono text-yellow-600/70 tracking-widest mt-1.5 uppercase">
                          CIRCADIAN DEEP FEED LOGS
                        </p>
                        
                        <div className="w-16 h-1 bg-yellow-500/30 rounded mt-6 mb-12" />
                        
                        <span className="text-[10px] font-mono text-slate-400 group-hover:text-white transition-colors duration-300">
                          CLICK TO OPEN DIARY BOOK
                        </span>
                      </motion.div>
                    ) : (
                      /* OPEN BOOK SPREAD VIEW */
                      <motion.div
                        key="open-book"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="relative bg-gradient-to-tr from-[#3b2314] via-[#54331F] to-[#26140a] border-[10px] border-[#1d0e06] rounded-3xl p-2.5 md:p-5 shadow-2xl overflow-hidden min-h-[520px]"
                        style={{ perspective: "1500px" }}
                      >
                        
                        {/* EMBOSSED BOOK SPINDLE / SPIRAL RING BINDER (Desktop Only) */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-2 -ml-1 bg-gradient-to-r from-stone-400 via-stone-200 to-stone-500 z-15 flex flex-col justify-around py-8 pointer-events-none hidden md:flex">
                          {[...Array(8)].map((_, i) => (
                            <div 
                              key={i} 
                              className="w-10 h-3 -ml-4 rounded-full border-t-[3px] border-b-[3px] border-l-2 border-stone-300 bg-transparent opacity-90 filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)]" 
                              style={{ transform: "rotate(-5deg)" }} 
                            />
                          ))}
                        </div>

                        {/* RED FABRIC BOOKMARK RIBBON (Desktop Only) */}
                        <div className="absolute top-0 left-[calc(50%-8px)] w-4 h-64 bg-gradient-to-b from-rose-700 to-rose-600 shadow-md rounded-b-sm z-20 pointer-events-none origin-top hidden md:block animate-bounce duration-[4000ms]" />

                        {/* DESKTOP SPREAD GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full relative">
                          
                          {/* ================= LEFT PAGE: THE INDEX / TABLE OF CONTENTS ================= */}
                          <div className="bg-[#FAF7F0] text-slate-800 p-5 rounded-xl md:rounded-l-xl md:rounded-r-none shadow-[-5px_5px_15px_rgba(0,0,0,0.15)] flex flex-col justify-between min-h-[480px] relative border-r border-slate-200/50">
                            
                            {/* Page header lines */}
                            <div>
                              <div className="flex items-center justify-between border-b border-rose-200 pb-2 mb-3">
                                <h3 className="font-handwritten text-lg font-black text-rose-800 flex items-center gap-1 uppercase tracking-wider">
                                  <Bookmark className="w-3.5 h-3.5" />
                                  Diary Index
                                </h3>
                                <span className="text-[9px] font-mono text-slate-400 uppercase">
                                  Vault Logs ({allEntries.length})
                                </span>
                              </div>

                              {/* Index Entries list */}
                              {allEntries.length === 0 ? (
                                <div className="text-center py-16">
                                  <Moon className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                                  <p className="font-handwritten text-lg text-stone-500">This Book is blank.</p>
                                  <p className="text-[10px] text-stone-400 max-w-[200px] mx-auto mt-1 font-sans">
                                    File your first evening report to see Piggy's handwritten logs.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2 mt-2">
                                  {paginatedEntries.map((entry, idx) => {
                                    const entryNum = (indexPage * entriesPerPage) + idx + 1;
                                    const isSelected = selectedEntryId === entry.id;
                                    return (
                                      <div
                                        key={entry.id}
                                        onClick={() => selectEntry(entry.id)}
                                        className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                                          isSelected
                                            ? "bg-amber-100/50 border-amber-300/80 shadow-xs"
                                            : "bg-white/40 hover:bg-white/95 border-transparent hover:border-amber-200"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="font-handwritten text-stone-400 font-bold text-sm">
                                            #{entryNum}
                                          </span>
                                          <div>
                                            <span className="block font-handwritten text-sm md:text-base font-black text-slate-800 leading-tight">
                                              {new Date(entry.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            <span className="block text-[8px] font-mono text-slate-400 uppercase">
                                              Mood: {entry.mood} &bull; Score: {entry.productivityScore}%
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs">{getMoodEmoji(entry.mood).split(" ")[0]}</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteDiaryEntry(entry.id);
                                              if (selectedEntryId === entry.id) {
                                                setSelectedEntryId(null);
                                              }
                                            }}
                                            className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                                            title="Decommission"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Left Page pagination */}
                            {allEntries.length > 0 && (
                              <div className="border-t border-rose-100 pt-3 flex items-center justify-between">
                                <button
                                  disabled={indexPage === 0}
                                  onClick={() => setIndexPage(p => p - 1)}
                                  className="p-1 rounded hover:bg-slate-100 text-stone-600 disabled:text-stone-300 disabled:hover:bg-transparent cursor-pointer"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="font-handwritten text-sm font-bold text-stone-500">
                                  Index {indexPage + 1} of {totalIndexPages}
                                </span>
                                <button
                                  disabled={indexPage >= totalIndexPages - 1}
                                  onClick={() => setIndexPage(p => p + 1)}
                                  className="p-1 rounded hover:bg-slate-100 text-stone-600 disabled:text-stone-300 disabled:hover:bg-transparent cursor-pointer"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            )}

                          </div>

                          {/* ================= RIGHT PAGE: DETAILED DAILY JOURNAL SHEET ================= */}
                          <div className="bg-[#FAF7F0] text-slate-800 p-5 rounded-xl md:rounded-r-xl md:rounded-l-none shadow-[5px_5px_15px_rgba(0,0,0,0.15)] flex flex-col justify-between min-h-[480px] relative overflow-hidden">
                            
                            {/* Page Background lined paper texture */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_0%,_rgba(0,0,0,0)_95%,_rgba(219,234,254,0.7)_95%,_rgba(219,234,254,0.7)_100%)] [background-size:100%_24px] pointer-events-none opacity-40 z-0" />
                            
                            {/* RED MARGIN VERTICAL LINE */}
                            <div className="absolute top-0 bottom-0 left-6 w-0.5 bg-red-200/70 z-0 pointer-events-none" />

                            {/* Main Content inside 3D Flip Anim */}
                            <div className="z-10 h-full flex flex-col justify-between relative pl-5">
                              
                              <AnimatePresence mode="wait">
                                {!activeEntry ? (
                                  <motion.div
                                    key="no-active"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center text-center py-20 h-full"
                                  >
                                    <BookOpen className="w-12 h-12 text-stone-300 mb-2" />
                                    <p className="font-handwritten text-xl text-stone-500 font-bold">No log selected.</p>
                                    <p className="text-[10px] text-stone-400 mt-1 font-sans">
                                      Select a date from the left page index to read the detailed reflections.
                                    </p>
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key={`${activeEntry.id}-${flipKey}`}
                                    initial={{ rotateY: 70, opacity: 0 }}
                                    animate={{ rotateY: 0, opacity: 1 }}
                                    exit={{ rotateY: -70, opacity: 0 }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    style={{ transformStyle: "preserve-3d", transformOrigin: "left center" }}
                                    className="flex-1 flex flex-col justify-between h-full"
                                  >
                                    <div>
                                      {/* Date header & Grade Stamps */}
                                      <div className="flex items-start justify-between border-b border-rose-100 pb-2 mb-2">
                                        <div>
                                          <span className="block font-handwritten text-lg md:text-xl font-bold text-stone-800 leading-tight">
                                            {new Date(activeEntry.timestamp).toLocaleDateString([], { weekday: 'long' })}
                                          </span>
                                          <span className="block text-[9px] font-mono text-stone-400 uppercase">
                                            {new Date(activeEntry.timestamp).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                                          </span>
                                        </div>

                                        {/* Circled Red Grade Stamp */}
                                        <div className="w-14 h-14 rounded-full border-2 border-dashed border-rose-500/80 flex flex-col items-center justify-center transform rotate-12 font-handwritten text-xs font-black text-rose-500/90 select-none bg-rose-50/20 shadow-xs">
                                          <span>{activeEntry.productivityScore}%</span>
                                          <span className="text-[8px] font-mono font-bold tracking-widest uppercase">OK!</span>
                                        </div>
                                      </div>

                                      {/* Transcription Content (Handwritten cursive) */}
                                      <div className="space-y-1.5 py-2">
                                        <span className="block text-[8px] font-mono text-rose-500 font-black tracking-wider uppercase">
                                          TRANSCRIPTION FEED:
                                        </span>
                                        <p className="font-handwritten text-lg md:text-xl text-indigo-950 font-bold italic leading-relaxed whitespace-pre-wrap">
                                          "{activeEntry.content}"
                                        </p>
                                      </div>

                                      {/* Stamped Polaroid Post-it AI Memo Box with washi tape */}
                                      <div className="relative mt-5 pt-3">
                                        
                                        {/* Washi Tape Accent */}
                                        <div className="absolute -top-1 left-[30%] w-16 h-4 bg-yellow-100/50 backdrop-blur-xs border border-yellow-200/30 transform -rotate-12 shadow-xs opacity-75 z-20" />
                                        
                                        <div className="relative bg-[#FFFEE5] border border-amber-200/40 p-3.5 rounded shadow-sm transform rotate-0.5 hover:rotate-0 transition-transform duration-300 z-10">
                                          <div className="flex items-center justify-between mb-1.5 border-b border-amber-200/30 pb-1">
                                            <div className="flex items-center gap-1">
                                              <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                              <span className="text-[9px] font-mono font-black text-amber-700 uppercase tracking-widest">
                                                Piggy Audit Review
                                              </span>
                                            </div>
                                            <span className="text-[7px] font-mono text-amber-600">COGNITIVE INDEX V1.4</span>
                                          </div>
                                          
                                          <p className="font-handwritten text-base md:text-lg text-amber-950 font-black leading-relaxed">
                                            {activeEntry.review}
                                          </p>
                                        </div>

                                      </div>
                                    </div>

                                    {/* Page numbers / Footer */}
                                    <div className="pt-4 border-t border-rose-100 flex items-center justify-between mt-auto">
                                      <span className="text-[9px] font-mono text-slate-400">
                                        MOOD: {activeEntry.mood.toUpperCase()}
                                      </span>
                                      <span className="font-handwritten text-sm font-bold text-stone-500">
                                        Page {allEntries.indexOf(activeEntry) + 1}
                                      </span>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                            </div>

                          </div>

                        </div>

                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
