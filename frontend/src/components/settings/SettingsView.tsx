import React, { useState, useEffect } from "react";
import { User, Cpu, Bell, Shield, Palette, Check, Save, AlertTriangle, Server, Wifi } from "lucide-react";
import { useStore } from "../../store/useStore";
import { getApiBaseUrl, setCustomServerUrl } from "../../api/client";
import { connectionMonitor } from "../../sync/connectionMonitor";

interface SettingsViewProps {
  initialProfile: {
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
        showToast("System database backup successfully compiled.", "success");
      })
      .catch(err => {
        console.error("Export failure:", err);
        showToast("Failed to compile system database parameters.", "error");
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
        showToast("Success! System state restored. Rebooting client variables.", "success");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const errData = await res.json();
        showToast(`Import failed: ${errData.error || "Server rejected package."}`, "error");
      }
    } catch (err) {
      showToast("Failure transmitting database backup file.", "error");
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
          showToast("Invalid backup file: missing core tasks/habits/goals collections.", "error");
          return;
        }
        setImportData(parsed);
        setShowImportConfirm(true);
      } catch (err) {
        showToast("Failure parsing database backup file.", "error");
      }
    };
    reader.readAsText(file);
  };
  
  // Local state form fields
  const [name, setName] = useState(initialProfile.name);
  const [email, setEmail] = useState(initialProfile.email);
  const [personality, setPersonality] = useState(initialProfile.aiPersonality);
  const [activationWord, setActivationWord] = useState(initialProfile.activationWord || "piggy");
  const [serverIpUrl, setServerIpUrl] = useState(() => (typeof window !== "undefined" && window.localStorage ? localStorage.getItem("bios_server_url") || "" : ""));

  const handleSaveServerIpUrl = () => {
    setCustomServerUrl(serverIpUrl);
    connectionMonitor.checkServerHealth();
    showToast("Server Host IP parameters updated. Triggered health check.", "success");
  };

  // New J.A.R.V.I.S states
  const [listeningMode, setListeningMode] = useState<'always-listening' | 'push-to-talk' | 'text-only'>(initialProfile.listeningMode || "push-to-talk");
  const [proactiveEnabled, setProactiveEnabled] = useState<boolean>(initialProfile.proactiveModeEnabled ?? true);
  const [maxNudges, setMaxNudges] = useState<number>(initialProfile.maxProactiveNudges ?? 2);
  const [reviewTime, setReviewTime] = useState<string>(initialProfile.dailyReviewTime || "21:30");
  const [patterns, setPatterns] = useState<string[]>(initialProfile.learnedPatterns || [
    "Peak cognitive focus observed between 19:00 - 22:00 hours for coding studies.",
    "Skipping morning cardio blocks exhibits an 18% average reduction in task consistency index.",
    "Late-night eating category shows high susceptibility to emotional impulse buys (average Rs 3,100/spend).",
    "Goal streak consistency rises by 42% when tasks are completed prior to 20:00 hours."
  ]);

  // Toggle Switches settings map
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    proactiveSuggestions: initialProfile.proactiveModeEnabled ?? true,
    dailyBriefing: true,
    taskReminders: true,
    habitNudges: true,
    goalMilestones: true,
    missedAlerts: false,
    biometrics: true,
    faceUnlock: false,
    darkMode: false,
    highContrast: false
  });

  // Sync toggle states from backend config / initialProfile when loaded
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
      setToggles({
        proactiveSuggestions: sourceConfig.proactiveModeEnabled ?? true,
        dailyBriefing: true,
        taskReminders: (sourceConfig as any).taskReminders ?? true,
        habitNudges: (sourceConfig as any).habitNudges ?? true,
        goalMilestones: (sourceConfig as any).goalMilestones ?? true,
        missedAlerts: (sourceConfig as any).missedAlerts ?? false,
        biometrics: (sourceConfig as any).biometrics ?? true,
        faceUnlock: (sourceConfig as any).faceUnlock ?? false,
        darkMode: (sourceConfig as any).darkMode ?? false,
        highContrast: (sourceConfig as any).highContrast ?? false,
      });

      if ((sourceConfig as any).darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [systemConfig, initialProfile]);

  const handleToggle = (key: string) => {
    setToggles(prev => {
      const next = { ...prev, [key]: !prev[key] };
      
      // If it's the dark mode toggle, apply/remove the CSS class globally
      if (key === "darkMode") {
        if (next.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      
      return next;
    });

    if (key === "proactiveSuggestions") {
      setProactiveEnabled(!toggles.proactiveSuggestions);
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
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
    showToast("Sir, personal parameters and brain mapping successfully committed to database layers.", "success");
  };

  const deletePattern = (idx: number) => {
    const updated = patterns.filter((_, i) => i !== idx);
    setPatterns(updated);
  };

  // Nav menu items definition
  const menuItems = [
    { key: "personal", label: "Personal Credentials", icon: User },
    { key: "ai", label: "AI Core & Piggy Settings", icon: Cpu },
    { key: "notifications", label: "Nudge Notifications", icon: Bell },
    { key: "security", label: "Systems Security", icon: Shield },
    { key: "appearance", label: "Visual Aesthetics", icon: Palette }
  ] as const;

  // Custom switch toggle element
  const renderToggle = (key: string) => {
    const isActive = toggles[key];
    return (
      <button
        type="button"
        onClick={() => handleToggle(key)}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:ring-offset-2 bg-slate-250 inline-block align-middle"
        style={{ backgroundColor: isActive ? "#F5A623" : "#CBD5E1" }}
      >
        <span
          className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out"
          style={{ transform: isActive ? "translateX(20px)" : "translateX(0px)" }}
        />
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
      
      {/* Left Menu Selection Card (3 cols) */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-1 font-display">
        {menuItems.map((item) => {
          const IconComp = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === item.key
                  ? "bg-amber-500 text-slate-950 font-black"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <IconComp className="w-4.5 h-4.5 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Right Tab workspace content card (8 cols) */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs min-h-[480px]">
        
        {/* Personal Form Tab */}
        {activeTab === "personal" && (
          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div>
              <h3 className="font-display font-black text-slate-800 text-base">Personal Credentials</h3>
              <p className="text-xs text-slate-400 mt-0.5">Edit core parameters linked to your client node.</p>
            </div>

            {/* Simulated Avatar Preview */}
            <div className="flex items-center gap-4 py-2">
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"
                alt="Alex Mercer"
                className="w-16 h-16 rounded-full border-2 border-amber-500 object-cover"
              />
              <button 
                type="button" 
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                onClick={() => showToast("Simulated: Local file system camera capture triggered.", "info")}
              >
                Deploy Profile Photo
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase">Profile Identifier</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 bg-slate-50/50 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase">Communication Relay Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 bg-slate-50/50 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Cross-Device Server Uplink Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 font-mono">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase font-display">
                <Server className="w-4 h-4 text-amber-500" />
                Cross-Device Server Host IP (Mobile Uplink)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
                When using the Android mobile app, enter your Windows PC local Wi-Fi IP address (e.g. <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-amber-500 font-mono">http://192.168.1.15:5000</code>) to connect to your PC database.
              </p>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="http://192.168.x.x:5000"
                  value={serverIpUrl}
                  onChange={(e) => setServerIpUrl(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleSaveServerIpUrl}
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-display font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Server IP
                </button>
              </div>
              <div className="text-[10px] text-slate-400 font-mono pt-1">
                Active Endpoint: <span className="text-slate-700 dark:text-slate-300 font-bold">{getApiBaseUrl()}</span>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="pt-4 border-t border-slate-50 font-display">
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4 text-slate-950 stroke-2" />
                Commit Specifications
              </button>
            </div>
          </form>
        )}

        {/* AI & Piggy settings */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-display font-black text-slate-800 text-base">AI Core & Piggy Settings</h3>
              <p className="text-xs text-slate-400 mt-0.5">Model parameters of J.A.R.V.I.S client transceivers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase font-mono">Piggy Vocalizer Synthesis</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 text-xs bg-slate-50/50">
                  <option value="pulse">Pulse Dynamic British Voice (Default)</option>
                  <option value="nova">Nova Core Frequency</option>
                  <option value="echo">Echo Synth Voice</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase font-mono">Cognitive Personality</label>
                <select 
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 text-xs bg-slate-50/50"
                >
                  <option value="Logical">Logical Heuristics</option>
                  <option value="Calm">Calm Zen alignment</option>
                  <option value="Energetic">Energetic Support agent</option>
                  <option value="Cynical">Cynical ironist</option>
                </select>
              </div>
            </div>

            {/* Listening Modes */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase font-mono mb-1">Wake Word &amp; Listening Mode</label>
                <p className="text-[10px] text-slate-400">Choose how Piggy captures your spoken tactical requests.</p>
              </div>
              <div className="flex gap-2">
                {[
                  { key: "push-to-talk", label: "Push to Talk", desc: "Default microphone trigger" },
                  { key: "always-listening", label: "Always Listening", desc: "Monitors 'Piggy' wake word" },
                  { key: "text-only", label: "Text Only", desc: "Disables mic captures completely" }
                ].map((mode) => (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => setListeningMode(mode.key as any)}
                    className={`flex-1 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      listeningMode === mode.key
                        ? "bg-amber-500 border-amber-500 text-white shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block text-xs font-bold leading-tight">{mode.label}</span>
                    <span className={`block text-[8px] mt-0.5 ${listeningMode === mode.key ? "text-amber-100" : "text-slate-400"}`}>
                      {mode.desc}
                    </span>
                  </button>
                ))}
              </div>
              {listeningMode === "always-listening" && (
                <div className="p-2.5 bg-red-50 rounded-xl border border-red-100 text-[10px] text-red-800 flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping shrink-0" />
                  <span>Always Listening is active. Standard micro-node channels will continuously index audio cues. See browser permissions.</span>
                </div>
              )}
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-4 mt-2">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Custom Piggy Activation Word</span>
                  <span className="text-[9px] font-mono text-slate-400">Specify the word used to wake Piggy or trigger actions. (Default: piggy)</span>
                </div>
                <input
                  type="text"
                  required
                  value={activationWord}
                  onChange={(e) => setActivationWord(e.target.value.toLowerCase().trim())}
                  placeholder="e.g. piggy, assistant, jarvis"
                  className="w-36 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-mono text-amber-600 focus:outline-none focus:border-amber-500 text-center"
                />
              </div>
            </div>

            {/* Config Limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase font-mono">Max Daily Proactive Nudges</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    value={maxNudges}
                    onChange={(e) => setMaxNudges(parseInt(e.target.value))}
                    className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none" 
                  />
                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-150 px-2 py-1 rounded w-8 text-center">{maxNudges}</span>
                </div>
                <p className="text-[10px] text-slate-400">Controls the upper boundary of J.A.R.V.I.S-initiated contact prompts.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase font-mono">Daily Review Trigger</label>
                <input 
                  type="text" 
                  value={reviewTime}
                  onChange={(e) => setReviewTime(e.target.value)}
                  placeholder="e.g. 21:30"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-slate-700 text-xs bg-slate-50/50 font-mono" 
                />
                <p className="text-[10px] text-slate-400">Specifies when J.A.R.V.I.S prompts for tactical night reflections.</p>
              </div>
            </div>

            {/* Long-Term Memory Transparency */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div>
                <h4 className="font-display font-bold text-xs text-slate-800 uppercase tracking-wider">What Piggy Knows (Long-Term Memory Vault)</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                  The semantic model extracts and indexes behavioral patterns below to deliver personalized guidance. You may delete any pattern to force complete memory erasure.
                </p>
              </div>

              <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                {patterns.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-mono italic">
                    All learned brain-pattern structures have been erased.
                  </div>
                ) : (
                  patterns.map((pat, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-start justify-between gap-3 group animate-in fade-in duration-200">
                      <p className="text-[11px] text-slate-600 font-sans leading-relaxed">
                        &bull; {pat}
                      </p>
                      <button
                        type="button"
                        onClick={() => deletePattern(idx)}
                        className="text-[9px] font-mono text-slate-400 hover:text-rose-500 px-1.5 py-0.5 rounded border border-slate-200 hover:border-rose-200 bg-white hover:bg-rose-50 cursor-pointer shadow-2xs opacity-60 group-hover:opacity-100 transition-all shrink-0"
                      >
                        Erase
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Commit Form Block Actions */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleProfileSubmit}
                className="px-5 py-2.5 bg-slate-900 border border-transparent hover:bg-slate-800 text-white font-display font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer max-w-fit active:scale-[0.98]"
              >
                <Check className="w-4 h-4 text-amber-500 stroke-3" />
                Commit J.A.R.V.I.S Parameters
              </button>
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-display font-black text-slate-800 text-base">Nudge Notifications</h3>
              <p className="text-xs text-slate-400 mt-0.5">Control telemetries delivered to {initialProfile.name} client nodes.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Task Reminders</span>
                  <p className="text-[11px] text-slate-400">Receive alerts 15 minutes prior to scheduling blocks.</p>
                </div>
                {renderToggle("taskReminders")}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Habit Consistency Nudges</span>
                  <p className="text-[11px] text-slate-400">Transmit reminders to log streaks before 21:00 thresholds.</p>
                </div>
                {renderToggle("habitNudges")}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Strategic Goal Milestones</span>
                  <p className="text-[11px] text-slate-400">Celebrate milestone achievements and outcome progress.</p>
                </div>
                {renderToggle("goalMilestones")}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Overdue Warnings</span>
                  <p className="text-[11px] text-slate-400">Nudges when skipping standard scheduled tasks.</p>
                </div>
                {renderToggle("missedAlerts")}
              </div>
            </div>
          </div>
        )}

        {/* Security */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-display font-black text-slate-800 text-base">Systems Security</h3>
              <p className="text-xs text-slate-400 mt-0.5">Secure cryptography locks surrounding personal databases.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Biometric Fingerprint Authentication</span>
                  <p className="text-[11px] text-slate-400">Unlock LifeOS client nodes using Touch ID.</p>
                </div>
                {renderToggle("biometrics")}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Face Recognition Access</span>
                  <p className="text-[11px] text-slate-400">Authenticate commands via camera capture checks.</p>
                </div>
                {renderToggle("faceUnlock")}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Relay Password Lockout</span>
                  <p className="text-[11px] text-slate-400">Secure entry with custom alphanumeric keys.</p>
                </div>
                <button
                  type="button"
                  onClick={() => showToast("Simulated passcode sync flow initialized.", "info")}
                  className="text-xs font-bold font-mono text-amber-600 hover:text-amber-700 shrink-0"
                >
                  Update &rarr;
                </button>
              </div>
            </div>

            {/* Backup Systems */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">Database Backup & Portability</h4>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4">Export full state backups as JSON files or restore database collections from a saved workspace file.</p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleBackupExport}
                  className="px-4 py-2 border border-amber-500/30 dark:border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold font-display text-[11px] rounded-xl cursor-pointer transition-all"
                >
                  Export System Backup
                </button>
                <label className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-655 dark:text-slate-400 font-bold font-display text-[11px] rounded-xl cursor-pointer inline-block transition-all">
                  Import System Backup
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
              <h3 className="font-display font-black text-slate-800 text-base">Visual Aesthetics</h3>
              <p className="text-xs text-slate-400 mt-0.5">Customize layouts matching preferred focus environments.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Charcoal Dark Mode theme</span>
                  <p className="text-[11px] text-slate-400">Switch visual styling to premium low-light parameters.</p>
                </div>
                {renderToggle("darkMode")}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">High Contrast Typography</span>
                  <p className="text-[11px] text-slate-400">Increase background definitions for maximum legibility.</p>
                </div>
                {renderToggle("highContrast")}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Database Backup Overwrite Confirmation Modal */}
      {showImportConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-450 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-display font-black text-base text-slate-900 dark:text-white">
                Overwrite Database State
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-sans mb-5">
              Warning: importing a backup package will completely overwrite all existing tasks, habits, and goals data. This operation cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowImportConfirm(false);
                  setImportData(null);
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/60 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-display font-bold text-[10px] uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  executeBackupImport(importData);
                  setShowImportConfirm(false);
                  setImportData(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-display font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-sm cursor-pointer"
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


