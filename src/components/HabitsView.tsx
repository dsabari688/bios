import React, { useState } from "react";
import {
  Plus,
  Flame,
  Check,
  Trophy,
  Droplets,
  Utensils,
  Dumbbell,
  BookOpen,
  Brain,
  Timer,
  Sparkles,
  Minus,
  Trash2,
  HelpCircle,
  TrendingUp,
  Target,
  Info
} from "lucide-react";
import { Habit } from "../types";

interface HabitsViewProps {
  habits: Habit[];
  selectedDate?: string;
  onToggleHabit: (habitId: string, dateStr?: string) => void;
  onUpdateHabitProgress?: (habitId: string, delta: number, dateStr?: string) => void;
  onAddHabit: (
    name: string,
    frequency: "daily" | "weekly",
    icon?: string,
    options?: Partial<Omit<Habit, "id" | "name" | "frequency" | "streak" | "logs" | "skippedDaysCount">>
  ) => void;
  onDeleteHabit: (habitId: string) => void;
  selectedHabitId?: string | null;
  onFocusHabit?: (id: string, name: string) => void;
}

interface PresetProtocol {
  id: string;
  name: string;
  category: "water" | "nutrition" | "fitness" | "reading" | "mindfulness" | "productivity" | "general";
  icon: string;
  defaultTarget: number;
  unit: string;
  stepIncrement: number;
  frequency: "daily" | "weekly";
  description: string;
  suggestedNotes: string;
}

const PRESET_PROTOCOLS: PresetProtocol[] = [
  {
    id: "water_hydration",
    name: "Hydration & Water Intake",
    category: "water",
    icon: "💧",
    defaultTarget: 8,
    unit: "glasses",
    stepIncrement: 1,
    frequency: "daily",
    description: "Track how many times or how much water you drink daily.",
    suggestedNotes: "Drink 1 glass upon waking, 1 before each meal, and throughout workouts (approx 2.5L total)."
  },
  {
    id: "meal_nutrition",
    name: "Daily Nutrition & Meal Frequency",
    category: "nutrition",
    icon: "🥗",
    defaultTarget: 3,
    unit: "meals",
    stepIncrement: 1,
    frequency: "daily",
    description: "Plan and record your daily meal times and portion adherence.",
    suggestedNotes: "3 structured whole-food meals (Breakfast, Lunch, Dinner) with high protein and clean greens."
  },
  {
    id: "active_fitness",
    name: "Physical Training & Movement",
    category: "fitness",
    icon: "🏋️",
    defaultTarget: 45,
    unit: "mins",
    stepIncrement: 15,
    frequency: "daily",
    description: "Track active exercise time, gym resistance sets, or cardio.",
    suggestedNotes: "45-minute structured workout + mobility stretches."
  },
  {
    id: "daily_steps",
    name: "Daily Step Target",
    category: "fitness",
    icon: "🏃",
    defaultTarget: 10000,
    unit: "steps",
    stepIncrement: 1000,
    frequency: "daily",
    description: "Maintain base NEAT cardiovascular energy expenditure.",
    suggestedNotes: "10,000 steps throughout the day with post-meal walks."
  },
  {
    id: "deep_reading",
    name: "Knowledge & Book Reading",
    category: "reading",
    icon: "📚",
    defaultTarget: 20,
    unit: "pages",
    stepIncrement: 5,
    frequency: "daily",
    description: "Systematic reading quota for cognitive expansion.",
    suggestedNotes: "20 pages of non-fiction, philosophy, or technical publications."
  },
  {
    id: "mind_meditation",
    name: "Mindfulness & Mental Alignment",
    category: "mindfulness",
    icon: "🧘",
    defaultTarget: 15,
    unit: "mins",
    stepIncrement: 5,
    frequency: "daily",
    description: "Meditation, box breathing, and neural calm.",
    suggestedNotes: "15 minutes of uninterrupted breath awareness or guided focus."
  },
  {
    id: "deep_work",
    name: "Deep Work Sprint Blocks",
    category: "productivity",
    icon: "💻",
    defaultTarget: 4,
    unit: "sprints",
    stepIncrement: 1,
    frequency: "daily",
    description: "High-intensity distraction-free focus intervals.",
    suggestedNotes: "4 x 25-minute Pomodoro focus blocks with zero context switching."
  }
];

export const HabitsView: React.FC<HabitsViewProps> = ({
  habits,
  selectedDate,
  onToggleHabit,
  onUpdateHabitProgress,
  onAddHabit,
  onDeleteHabit,
  selectedHabitId,
  onFocusHabit
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formMode, setFormMode] = useState<"preset" | "custom">("preset");

  // Form Fields State
  const [habitName, setHabitName] = useState("");
  const [habitFreq, setHabitFreq] = useState<"daily" | "weekly">("daily");
  const [selectedIcon, setSelectedIcon] = useState("💧");
  const [habitCategory, setHabitCategory] = useState<Habit["category"]>("water");
  const [isQuantitative, setIsQuantitative] = useState(true);
  const [targetValue, setTargetValue] = useState<number>(8);
  const [unit, setUnit] = useState("glasses");
  const [stepIncrement, setStepIncrement] = useState<number>(1);
  const [habitNotes, setHabitNotes] = useState("");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString("default", { month: "long" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const GRID_DAYS = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const effectiveDate = selectedDate || now.toISOString().split("T")[0];

  const handleSelectPreset = (preset: PresetProtocol) => {
    setHabitName(preset.name);
    setHabitCategory(preset.category);
    setSelectedIcon(preset.icon);
    setHabitFreq(preset.frequency);
    setIsQuantitative(true);
    setTargetValue(preset.defaultTarget);
    setUnit(preset.unit);
    setStepIncrement(preset.stepIncrement);
    setHabitNotes(preset.suggestedNotes);
    setFormMode("custom");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) return;

    onAddHabit(habitName.trim(), habitFreq, selectedIcon, {
      category: habitCategory,
      targetValue: isQuantitative ? targetValue : undefined,
      unit: isQuantitative ? unit.trim() : undefined,
      stepIncrement: isQuantitative ? stepIncrement : undefined,
      notes: habitNotes.trim() || undefined
    });

    // Reset Form
    setHabitName("");
    setHabitNotes("");
    setShowAddForm(false);
  };

  // Assign rich emojis fallback
  const getHabitIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("water") || n.includes("hydrat") || n.includes("drink")) return "💧";
    if (n.includes("food") || n.includes("meal") || n.includes("eat") || n.includes("diet") || n.includes("nutrition")) return "🥗";
    if (n.includes("code") || n.includes("program") || n.includes("build")) return "💻";
    if (n.includes("meditat") || n.includes("focus") || n.includes("mind") || n.includes("breath")) return "🧘";
    if (n.includes("read") || n.includes("book") || n.includes("page")) return "📚";
    if (n.includes("gym") || n.includes("workout") || n.includes("exercise") || n.includes("train")) return "🏋️";
    if (n.includes("step") || n.includes("walk") || n.includes("run")) return "🏃";
    return "⚡";
  };

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight flex items-center gap-2">
            Habit & Health Tracking Core
            <span className="font-mono text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Quantitative Metrics
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Log water intake, meal & nutrition schedules, workouts, reading quotas, and daily routines.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(!showAddForm);
            if (!showAddForm) setFormMode("preset");
          }}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-slate-900 stroke-3" />
          {showAddForm ? "Close Creator" : "New Habit Protocol"}
        </button>
      </div>

      {/* Add Habit Multi-Option Creator */}
      {showAddForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="font-display font-bold text-sm text-slate-800">
                {formMode === "preset" ? "Select a Quick Health & Habit Template" : "Customize Habit Parameters"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFormMode("preset")}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                  formMode === "preset"
                    ? "bg-amber-500 text-slate-950"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Templates
              </button>
              <button
                type="button"
                onClick={() => setFormMode("custom")}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                  formMode === "custom"
                    ? "bg-amber-500 text-slate-950"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Preset Cards Selector */}
          {formMode === "preset" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Choose a pre-configured protocol below to instantly populate water, meal, fitness, or reading settings:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PRESET_PROTOCOLS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className="p-3.5 border border-slate-200 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/20 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl select-none group-hover:scale-110 transition-transform">
                          {preset.icon}
                        </span>
                        <span className="text-[10px] font-mono font-bold uppercase text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                          Target: {preset.defaultTarget} {preset.unit}
                        </span>
                      </div>
                      <h4 className="font-display font-bold text-xs text-slate-800 group-hover:text-amber-900">
                        {preset.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Step: +{preset.stepIncrement} {preset.unit}</span>
                      <span className="text-amber-600 font-bold group-hover:underline">Customize →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Customization Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Habit Name */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Habit Title / Objective Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Water Hydration (8 Glasses) or 3 Clean Meals"
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Cycle Frequency */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Cycle Frequency
                </label>
                <select
                  value={habitFreq}
                  onChange={(e) => setHabitFreq(e.target.value as "daily" | "weekly")}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:border-amber-500 font-sans cursor-pointer"
                >
                  <option value="daily">Daily Goal (Reset each day)</option>
                  <option value="weekly">Weekly Target (Accumulate)</option>
                </select>
              </div>
            </div>

            {/* Quantitative vs Checkbox Selector */}
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-display font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Measurement & Quantity Mode
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Track precise counts (how many times / how much) or simple done/undone checkboxes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsQuantitative(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      isQuantitative
                        ? "bg-amber-500 text-slate-950 shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Quantitative Goal (Count / Amount)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsQuantitative(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      !isQuantitative
                        ? "bg-amber-500 text-slate-950 shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Simple Checkbox (Done/Not Done)
                  </button>
                </div>
              </div>

              {/* Quantitative Configuration Details */}
              {isQuantitative && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200/70">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono font-bold text-slate-600">
                      Daily Target Quantity (How much / How many times)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={targetValue}
                      onChange={(e) => setTargetValue(Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-slate-400">e.g. 8 for water, 3 for meals, 20 for pages</span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono font-bold text-slate-600">
                      Measurement Unit
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="glasses / ml / meals / mins / pages / steps"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    {/* Quick unit suggestions */}
                    <div className="flex gap-1 flex-wrap pt-0.5">
                      {["glasses", "ml", "meals", "mins", "pages", "steps", "times"].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setUnit(u)}
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                            unit === u
                              ? "bg-amber-100 border-amber-300 text-amber-900 font-bold"
                              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono font-bold text-slate-600">
                      Increment Per Tap (+)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={stepIncrement}
                      onChange={(e) => setStepIncrement(Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-slate-400">e.g. +1 glass, +250 ml, +1 meal</span>
                  </div>
                </div>
              )}
            </div>

            {/* Protocol Guidelines & Icon Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* Guidelines / Dietary / Schedule instructions */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Tactical Guidelines / Schedule Details (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Drink 1 glass every 2 hours; Eat lunch at 1:00 PM and dinner by 8:00 PM with clean macros."
                  value={habitNotes}
                  onChange={(e) => setHabitNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
                />
              </div>

              {/* Emoji Picker */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Habit Icon Emoji
                </label>
                <div className="flex gap-1.5 flex-wrap items-center">
                  {["💧", "🥗", "🏋️", "🏃", "📚", "🧘", "💻", "🧠", "🍎", "💰", "⚡"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedIcon(emoji)}
                      className={`w-8 h-8 rounded-lg border text-sm flex items-center justify-center transition-all cursor-pointer ${
                        selectedIcon === emoji
                          ? "border-amber-500 bg-amber-50 text-amber-700 shadow-xs"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <input
                    type="text"
                    placeholder="Custom"
                    value={selectedIcon}
                    onChange={(e) => setSelectedIcon(e.target.value)}
                    className="w-12 px-1.5 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 font-mono"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 font-display">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Lock In Protocol
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active habits display grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {habits.map((item) => {
          const isDoneToday = item.logs.includes(effectiveDate);
          const iconEmoji = item.icon || getHabitIcon(item.name);
          
          const isSelected = selectedHabitId === item.id;
          const target = item.targetValue;
          const currentCount = item.dailyProgress?.[effectiveDate] || (isDoneToday ? target || 1 : 0);
          const step = item.stepIncrement || 1;
          const unitLabel = item.unit || "times";

          let progressPercent = 0;
          if (target && target > 0) {
            progressPercent = Math.min(100, Math.round((currentCount / target) * 100));
          } else {
            progressPercent = isDoneToday ? 100 : 0;
          }

          let progressClass = "bg-rose-500";
          if (progressPercent >= 100) {
            progressClass = "bg-emerald-500";
          } else if (progressPercent >= 50) {
            progressClass = "bg-amber-500";
          }

          return (
            <div
              key={item.id}
              onClick={() => onFocusHabit?.(item.id, item.name)}
              className={`rounded-2xl p-5 border transition-all relative flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? "border-amber-500 bg-amber-50/20 shadow-md ring-2 ring-amber-500/20"
                  : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      style={{ fontFamily: "Segoe UI Emoji, Apple Color Emoji, sans-serif" }}
                      className="text-3xl filter drop-shadow select-none shrink-0"
                    >
                      {iconEmoji}
                    </span>
                    <div>
                      <h4 className="font-display font-black text-sm text-slate-800 tracking-tight leading-snug flex items-center gap-2">
                        {item.name}
                        {isSelected && (
                          <span className="font-mono text-[8px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 uppercase tracking-widest animate-pulse">
                            FOCUSED
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-slate-400">
                        <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                          <Flame className="w-3.5 h-3.5 fill-amber-500" />
                          Streak: {item.streak}d
                        </span>
                        <span>&middot;</span>
                        <span>{item.frequency} cycle</span>
                        {target && (
                          <>
                            <span>&middot;</span>
                            <span className="text-slate-600 font-semibold">
                              Target: {target} {unitLabel}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Complete Toggle Trigger */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleHabit(item.id, effectiveDate);
                    }}
                    className={`h-8 w-8 rounded-full border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      progressPercent >= 100 || isDoneToday
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-xs"
                        : "border-slate-300 hover:border-amber-500 hover:bg-amber-50 text-slate-400"
                    }`}
                    title={isDoneToday ? "Target Achieved - Click to unmark" : "Mark 100% completed today"}
                  >
                    <Check
                      className={`w-4 h-4 ${
                        progressPercent >= 100 || isDoneToday ? "opacity-100 scale-100" : "opacity-0 scale-50"
                      } transition-all`}
                    />
                  </button>
                </div>

                {/* Notes/Instructions if present */}
                {item.notes && (
                  <p className="mt-2.5 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed font-sans italic">
                    {item.notes}
                  </p>
                )}

                {/* Quantitative Counter Controls (If has targetValue) */}
                {target && target > 0 && (
                  <div
                    className="mt-4 p-3 bg-slate-50/90 border border-slate-200/80 rounded-xl space-y-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-slate-600">
                        Daily Intake / Progress:
                      </span>
                      <span className="text-xs font-mono font-black text-slate-800">
                        <span className={progressPercent >= 100 ? "text-emerald-600" : "text-amber-600"}>
                          {currentCount}
                        </span>{" "}
                        / {target} {unitLabel} ({progressPercent}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onUpdateHabitProgress?.(item.id, -step, effectiveDate)}
                        disabled={currentCount <= 0}
                        className="h-7 px-2.5 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none rounded-lg text-slate-700 text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title={`Subtract ${step} ${unitLabel}`}
                      >
                        <Minus className="w-3 h-3" />
                        <span>-{step}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onUpdateHabitProgress?.(item.id, step, effectiveDate)}
                        className="flex-1 h-7 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        title={`Log +${step} ${unitLabel}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+{step} {unitLabel}</span>
                      </button>

                      {currentCount < target && (
                        <button
                          type="button"
                          onClick={() => onUpdateHabitProgress?.(item.id, target - currentCount, effectiveDate)}
                          className="h-7 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer"
                          title="Finish entire quota"
                        >
                          Max
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Conformance Bar */}
              <div className="mt-4 space-y-1">
                <div className="flex justify-between items-center text-[9px] font-mono font-bold text-slate-400">
                  <span>DAILY CONFORMANCE</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${progressClass} rounded-full transition-all duration-300`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Bottom utilities */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] font-mono">
                <span className="text-slate-400">
                  {isDoneToday ? "✓ Logged today" : "Pending completion"}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteHabit(item.id);
                  }}
                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
                  title="Decommission Habit Protocol"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 30-Day Heatmap layout */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
          <Trophy className="w-4.5 h-4.5 text-amber-500" />
          <h3 className="font-display font-bold text-slate-800 text-sm">
            Monthly Consistency Ledger ({monthName} {year})
          </h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mb-5 flex-wrap">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Legend</span>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-emerald-500" />
            <span className="text-xs text-slate-600">All habits done</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-amber-400" />
            <span className="text-xs text-slate-600">Partial quota logged</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-rose-400" />
            <span className="text-xs text-slate-600">Missed / Overdue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200" />
            <span className="text-xs text-slate-600">Future / Upcoming</span>
          </div>
        </div>

        {/* 7-column calendar grid */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-400 font-mono font-bold mb-2">
          <span>MON</span>
          <span>TUE</span>
          <span>WED</span>
          <span>THU</span>
          <span>FRI</span>
          <span>SAT</span>
          <span>SUN</span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {GRID_DAYS.map((day) => {
            const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
            const targetDate = new Date(dateStr);
            const todayStr = now.toISOString().split("T")[0];
            const todayDate = new Date(todayStr);
            const isToday = todayStr === dateStr;

            let bgClass = "bg-slate-100";
            if (targetDate > todayDate) {
              bgClass = "bg-slate-50/50 text-slate-300 border border-dashed border-slate-200";
            } else if (habits.length === 0) {
              bgClass = "bg-rose-400 text-white";
            } else {
              const completedCount = habits.filter((h) => h.logs?.includes(dateStr)).length;
              if (completedCount === 0) {
                bgClass = "bg-rose-400 text-white";
              } else if (completedCount === habits.length) {
                bgClass = "bg-emerald-500 text-white";
              } else {
                bgClass = "bg-amber-400 text-slate-900";
              }
            }

            return (
              <div
                key={day}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center font-mono text-[10px] font-bold relative transition-transform hover:scale-105 cursor-pointer ${bgClass} ${
                  isToday ? "ring-2 ring-amber-500 ring-offset-2 scale-[1.05]" : ""
                }`}
              >
                <span>{day}</span>
                {isToday && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-slate-900" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
