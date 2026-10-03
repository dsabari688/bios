import React, { useState, useEffect, useRef } from "react";
import { User, Cpu, Bell, Shield, Palette, Check, Save, AlertTriangle, Camera, Server, Trash2 } from "lucide-react";
import { useStore } from "../../store/useStore";
import { getApiBaseUrl, setCustomServerUrl } from "../../api/client";

interface SettingsViewProps {
  initialProfile: {
    avatar?: string;
    name: string;
    email: string;
    aiPersonality: string;
    listeningMode?: 'always-listening' | 'push-to-talk' | 'text-only';
    proactiveModeEnabled?: boolean;
    maxProactiveNudges?: number;
    dailyReviewTime?: string;
    learnedPatterns?: string[];
    activationWord?: string;
  };
  onSaveProfile: (profile: { 
    avatar?: string;
    name: string; 
    email: string; 
    aiPersonality: 'Calm' | 'Energetic' | 'Cynical' | 'Logical';
    listeningMode?: 'always-listening' | 'push-to-talk' | 'text-only';
    proactiveModeEnabled?: boolean;
    maxProactiveNudges?: number;
    dailyReviewTime?: string;
    learnedPatterns?: string[];
    activationWord?: string;
    taskReminders?: boolean;
    habitNudges?: boolean;
    goalMilestones?: boolean;
    missedAlerts?: boolean;
    biometrics?: boolean;
    faceUnlock?: boolean;
    darkMode?: boolean;
    highContrast?: boolean;
  }) => void;
}

type TabKey = "personal" | "ai" | "notifications" | "security" | "appearance";

export const SettingsView: React.FC<SettingsViewProps> = ({
  initialProfile,
  onSaveProfile
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>("personal");
  const { token, showToast, systemConfig } = useStore();
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importData, setImportData] = useState<any>(null);

  // Local state form fields
  const [avatar, setAvatar] = useState(initialProfile.avatar || "");
  const [name, setName] = useState(initialProfile.name);
  const [email, setEmail] = useState(initialProfile.email);
  const [personality, setPersonality] = useState(initialProfile.aiPersonality);
  const [activationWord, setActivationWord] = useState(initialProfile.activationWord || "piggy");
  const [serverIpUrl, setServerIpUrl] = useState<string>(() => (typeof localStorage !== "undefined" ? localStorage.getItem("bios_server_url") || "" : ""));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [listeningMode, setListeningMode] = useState<'always-listening' | 'push-to-talk' | 'text-only'>(initialProfile.listeningMode || "push-to-talk");
  const [proactiveEnabled, setProactiveEnabled] = useState<boolean>(initialProfile.proactiveModeEnabled ?? true);
  const [maxNudges, setMaxNudges] = useState<number>(initialProfile.maxProactiveNudges ?? 2);
  const [reviewTime, setReviewTime] = useState<string>(initialProfile.dailyReviewTime || "21:30");
  const [patterns, setPatterns] = useState<string[]>(initialProfile.learnedPatterns || [
    "Peak focus observed between 19:00 - 22:00 for deep work.",
    "Morning workouts correlate with higher daily task completion.",
    "Tasks completed before 20:00 maintain longer habit streaks."
  ]);

  const [toggles, setToggles] = useState<Record<string, boolean>>({
    taskReminders: true,
    habitNudges: true,
    goalMilestones: true,
    missedAlerts: false,
    biometrics: true,
    faceUnlock: false,
    darkMode: true,
    highContrast: false
  });

  useEffect(() => {
    if (initialProfile) {
      if (initialProfile.name) setName(initialProfile.name);
      if (initialProfile.email) setEmail(initialProfile.email);
      if (initialProfile.aiPersonality) setPersonality(initialProfile.aiPersonality);
      if (initialProfile.activationWord) setActivationWord(initialProfile.activationWord);
      if (initialProfile.listeningMode) setListeningMode(initialProfile.listeningMode);
      if (initialProfile.proactiveModeEnabled !== undefined) setProactiveEnabled(initialProfile.proactiveModeEnabled);
      if (initialProfile.maxProactiveNudges !== undefined) setMaxNudges(initialProfile.maxProactiveNudges);
      if (initialProfile.dailyReviewTime) setReviewTime(initialProfile.dailyReviewTime);
      if (initialProfile.learnedPatterns?.length) setPatterns(initialProfile.learnedPatterns);
    }

    const sourceConfig = systemConfig || initialProfile;
    if (sourceConfig) {
      const isDark = (sourceConfig as any).darkMode ?? true;
      setToggles({
        taskReminders: (sourceConfig as any).taskReminders ?? true,
        habitNudges: (sourceConfig as any).habitNudges ?? true,
        goalMilestones: (sourceConfig as any).goalMilestones ?? true,
        missedAlerts: (sourceConfig as any).missedAlerts ?? false,
        biometrics: (sourceConfig as any).biometrics ?? true,
        faceUnlock: (sourceConfig as any).faceUnlock ?? false,
        darkMode: isDark,
        highContrast: (sourceConfig as any).highContrast ?? false,
      });

      if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }, [systemConfig, initialProfile]);

  const handleToggle = (key: string) => {
    setToggles(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === "darkMode") {
        if (next.darkMode) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        }
      }
      return next;
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image size must be less than 5MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      if (base64Data) {
        setAvatar(base64Data);
        showToast("Profile photo loaded! Click Save to apply.", "success");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveServerIpUrl = () => {
    setCustomServerUrl(serverIpUrl);
    showToast("Server URL updated.", "success");
  };

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveProfile({
      avatar,
      name,
      email,
      aiPersonality: personality as 'Calm' | 'Energetic' | 'Cynical' | 'Logical',
      listeningMode,
      proactiveModeEnabled: proactiveEnabled,
      maxProactiveNudges: maxNudges,
      dailyReviewTime: reviewTime,
      learnedPatterns: patterns,
      activationWord,
      taskReminders: toggles.taskReminders,
      habitNudges: toggles.habitNudges,
      goalMilestones: toggles.goalMilestones,
      missedAlerts: toggles.missedAlerts,
      biometrics: toggles.biometrics,
      faceUnlock: toggles.faceUnlock,
      darkMode: toggles.darkMode,
      highContrast: toggles.highContrast,
    });
    showToast("Settings saved successfully!", "success");
  };

  const handleBackupExport = () => {
    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/data`, {
      headers: { ...(token ? { "Authorization": `Bearer ${token}` } : {}) }
    })
      .then(res => res.json())
      .then(data => {
        const fileContent = JSON.stringify(data, null, 2);
        const blob = new Blob([fileContent], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `lifeos-backup-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Backup exported successfully.", "success");
      })
      .catch(err => {
        console.error("Export failure:", err);
        showToast("Failed to export backup.", "error");
      });
  };

  const executeBackupImport = async (data: any) => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/data/import`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        showToast("Backup restored successfully! Reloading...", "success");
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        const errData = await res.json();
        showToast(`Import failed: ${errData.error || "Server rejected file."}`, "error");
      }
    } catch (err) {
      showToast("Error importing backup file.", "error");
    }
  };

  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.tasks || !parsed.habits || !parsed.goals) {
          showToast("Invalid backup file: missing core collections.", "error");
          return;
        }
        setImportData(parsed);
        setShowImportConfirm(true);
      } catch (err) {
        showToast("Error reading backup file.", "error");
      }
    };
    reader.readAsText(file);
  };

  const menuItems = [
    { key: "personal", label: "Profile", icon: User },
    { key: "ai", label: "AI Assistant", icon: Cpu },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "security", label: "Security & Data", icon: Shield },
    { key: "appearance", label: "Appearance", icon: Palette }
  ] as const;

  const renderToggle = (key: string) => {
    const isActive = toggles[key];
    return (
      <button
        type="button"
        onClick={() => handleToggle(key)}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
        style={{ backgroundColor: isActive ? "#F59E0B" : "#CBD5E1" }}
      >
        <span
          className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out"
          style={{ transform: isActive ? "translateX(20px)" : "translateX(0px)" }}
        />
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-6xl mx-auto pb-24 font-sans">
      
      {/* Left Sidebar Menu */}
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-xs space-y-1">
        {menuItems.map((item) => {
          const IconComp = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <IconComp className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right Tab Content Card */}
      <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs min-h-[460px]">
        
        {/* Profile Tab */}
        {activeTab === "personal" && (
          <form onSubmit={handleSaveAll} className="space-y-5">
            <div>
              <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-base">Profile Settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage your personal details and account information.</p>
            </div>

            {/* Profile Photo */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            <div className="flex items-center gap-4 py-1">
              <img
                src={avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"}
                alt={name || "Profile Photo"}
                className="w-16 h-16 rounded-full border-2 border-amber-500 object-cover shadow-xs"
              />
              <button 
                type="button" 
                className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-3.5 h-3.5 text-amber-500" />
                Change Photo
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Optional Server URL for Mobile */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold text-xs">
                <Server className="w-3.5 h-3.5 text-amber-500" />
                Local Network Server IP (Optional)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                If connecting from the Android mobile app, enter your PC's local Wi-Fi address (e.g. <code>http://192.168.1.15:5000</code>).
              </p>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="http://192.168.x.x:5000"
                  value={serverIpUrl}
                  onChange={(e) => setServerIpUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveServerIpUrl}
                  className="px-3.5 py-1.5 bg-slate-800 dark:bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Save URL
                </button>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Current Endpoint: {getApiBaseUrl()}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* AI & Assistant Tab */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-base">AI Assistant Settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Customize Piggy's personality and voice interaction.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Personality Mode</label>
                <select 
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 text-xs bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="Logical">🧠 Logical (Objective & Analytical)</option>
                  <option value="Calm">🧘 Calm (Zen & Encouraging)</option>
                  <option value="Energetic">⚡ Energetic (High Motivation)</option>
                  <option value="Cynical">😏 Cynical (Witty & Direct)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Activation Wake Word</label>
                <input
                  type="text"
                  required
                  value={activationWord}
                  onChange={(e) => setActivationWord(e.target.value.toLowerCase().trim())}
                  placeholder="piggy"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 text-xs bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* Listening Mode */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Microphone & Listening Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "push-to-talk", label: "Push to Talk", desc: "Manual mic trigger" },
                  { key: "always-listening", label: "Always Listening", desc: "Wake word enabled" },
                  { key: "text-only", label: "Text Only", desc: "Disable microphone" }
                ].map((mode) => (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => setListeningMode(mode.key as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      listeningMode === mode.key
                        ? "bg-amber-500 border-amber-500 text-slate-950 font-bold shadow-xs"
                        : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-500/40"
                    }`}
                  >
                    <span className="block text-xs font-semibold">{mode.label}</span>
                    <span className={`block text-[10px] mt-0.5 ${listeningMode === mode.key ? "text-slate-900" : "text-slate-400"}`}>
                      {mode.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Review Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Daily Review Prompt Time</label>
                <input 
                  type="text" 
                  value={reviewTime}
                  onChange={(e) => setReviewTime(e.target.value)}
                  placeholder="21:30"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 text-xs bg-slate-50 dark:bg-slate-950 font-mono focus:outline-none focus:border-amber-500" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Max Proactive Nudges / Day</label>
                <div className="flex items-center gap-2 pt-1">
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    value={maxNudges}
                    onChange={(e) => setMaxNudges(parseInt(e.target.value))}
                    className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none" 
                  />
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{maxNudges}</span>
                </div>
              </div>
            </div>

            {/* Learned Insights */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
              <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                Learned User Preferences
              </h4>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {patterns.map((pat, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                    <span>{pat}</span>
                    <button
                      type="button"
                      onClick={() => setPatterns(patterns.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleSaveAll()}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                Save AI Settings
              </button>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="space-y-5">
            <div>
              <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-base">Notification Preferences</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Control when and how you receive alerts.</p>
            </div>

            <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex items-center justify-between pt-3">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Task Reminders</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Receive alerts 15 minutes before scheduled tasks.</p>
                </div>
                {renderToggle("taskReminders")}
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Habit Check-in Nudges</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Gentle reminders to log daily habit routines.</p>
                </div>
                {renderToggle("habitNudges")}
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Goal Milestone Celebrations</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Notifies you upon reaching important milestones.</p>
                </div>
                {renderToggle("goalMilestones")}
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Overdue Task Warnings</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Alerts when a task has passed its target deadline.</p>
                </div>
                {renderToggle("missedAlerts")}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleSaveAll()}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                Save Notifications
              </button>
            </div>
          </div>
        )}

        {/* Security & Data Tab */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-base">Security & Data Backup</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage authentication and export/import database backups.</p>
            </div>

            <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex items-center justify-between pt-3">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Biometric Authentication</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Use fingerprint / Touch ID to unlock.</p>
                </div>
                {renderToggle("biometrics")}
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Face Recognition</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Authenticate commands via camera scan.</p>
                </div>
                {renderToggle("faceUnlock")}
              </div>
            </div>

            {/* Backup Systems */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Database Backup</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Export all tasks, habits, goals, and reflections as a JSON file or restore from a previous backup.</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleBackupExport}
                  className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 font-semibold text-xs rounded-xl border border-amber-200 dark:border-amber-800/40 cursor-pointer transition-colors"
                >
                  Export Backup (JSON)
                </button>
                <label className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors">
                  Import Backup
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleBackupImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === "appearance" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-base">Appearance</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Customize theme and display contrast.</p>
            </div>

            <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex items-center justify-between pt-3">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Dark Mode</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Switch to sleek low-light theme.</p>
                </div>
                {renderToggle("darkMode")}
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">High Contrast</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Enhance text sharpness and border contrast.</p>
                </div>
                {renderToggle("highContrast")}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Confirmation Modal */}
      {showImportConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Restore Database
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
              Warning: Importing this file will replace your current tasks, habits, and goals. Are you sure?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowImportConfirm(false);
                  setImportData(null);
                }}
                className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  executeBackupImport(importData);
                  setShowImportConfirm(false);
                  setImportData(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
