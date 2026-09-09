import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Bot, Send, Trash2, Mic, MicOff, Sparkles, Check, 
  Brain, ListTodo, Flame, Target, MessageSquare, Zap, RefreshCw
} from "lucide-react";
import { ChatMessage } from "../../types";
import { useStore } from "../../store/useStore";
import { formatTimestamp12Hour } from "../../lib/timeUtils";
import { getApiBaseUrl } from "../../api/client";

interface PiggyChatViewProps {
  chatHistory: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  token?: string | null;
}

const SHORTCUT_CHIPS = [
  { label: "What are my tasks today?", icon: ListTodo },
  { label: "Create a task for tomorrow", icon: ListTodo },
  { label: "Show my active habits", icon: Flame },
  { label: "Check my milestone goals", icon: Target },
  { label: "Motivate me for deep focus", icon: Zap },
  { label: "Review today's schedule", icon: Sparkles }
];

export const PiggyChatView: React.FC<PiggyChatViewProps> = ({
  chatHistory,
  onSendMessage,
  isLoading,
  token
}) => {
  const { showToast, osData, saveProfile, clearChatHistory } = useStore();
  
  const activeHistory = osData?.chatHistory || chatHistory;
  const activationWord = osData?.profile?.activationWord || "piggy";

  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [memoriesCount, setMemoriesCount] = useState<number>(0);
  const [customWordInput, setCustomWordInput] = useState(activationWord);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Clean up any stray speech synthesis on mount & unmount (no auto voice reading)
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    setCustomWordInput(activationWord);
  }, [activationWord]);

  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/piggy/dashboard`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.aiMemory) {
          setMemoriesCount(data.aiMemory.length);
        }
      })
      .catch((err) => console.warn("Memory count fallback:", err));
  }, [token]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeHistory, isLoading, isSending]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isSending || isLoading) return;
    setIsSending(true);
    try {
      await onSendMessage(text.trim());
    } finally {
      setIsSending(false);
    }
  }, [onSendMessage, isSending, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending || isLoading) return;
    const textToSend = inputText.trim();
    setInputText("");
    await handleSendMessage(textToSend);
  };

  const handleChipClick = async (chipText: string) => {
    if (isSending || isLoading) return;
    await handleSendMessage(chipText);
  };

  const handleSaveCustomWord = async () => {
    const trimmed = customWordInput.trim().toLowerCase();
    if (!trimmed) {
      showToast("Activation word cannot be empty.", "error");
      return;
    }
    if (saveProfile && osData?.profile) {
      await saveProfile({
        name: osData.profile.name,
        email: osData.profile.email,
        budgetLimit: osData.profile.budgetLimit,
        aiPersonality: osData.profile.aiPersonality,
        dailyPlanningReminderTime: osData.profile.dailyPlanningReminderTime,
        dailyReviewTime: osData.profile.dailyReviewTime || "21:30",
        listeningMode: osData.profile.listeningMode || "push-to-talk",
        proactiveModeEnabled: osData.profile.proactiveModeEnabled ?? true,
        maxProactiveNudges: osData.profile.maxProactiveNudges ?? 2,
        activationWord: trimmed
      });
      showToast(`Activation word set to "${trimmed}".`, "success");
    }
  };

  // Optional Voice Dictation (Speech-to-Text input only)
  const toggleVoiceDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Speech Recognition is not supported in this browser.", "error");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        showToast("Voice input ended.", "info");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
      showToast("Unable to start microphone.", "error");
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const pendingTasksCount = (osData?.tasks || []).filter(t => t.date === todayStr && t.status === "pending").length;
  const activeHabitsCount = (osData?.habits || []).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px] max-w-7xl mx-auto">
      
      {/* Left Column: AI Assistant Profile & Quick Commands */}
      <div className="lg:col-span-4 flex flex-col gap-5">
        
        {/* Assistant Status Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
                <Bot className="w-7 h-7 stroke-2" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-black text-slate-900 dark:text-white text-lg truncate">
                  Piggy Copilot
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {osData?.profile?.aiPersonality || "Logical"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online & Synchronized</span>
              </p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Today</span>
              <span className="font-display font-bold text-sm text-slate-800 dark:text-slate-100 mt-0.5 block">
                {pendingTasksCount} Tasks
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Habits</span>
              <span className="font-display font-bold text-sm text-slate-800 dark:text-slate-100 mt-0.5 block">
                {activeHabitsCount} Active
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Memory</span>
              <span className="font-display font-bold text-sm text-slate-800 dark:text-slate-100 mt-0.5 block">
                {memoriesCount} Facts
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Prompt Chips */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="font-display font-bold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Quick Prompts
              </h3>
            </div>
            <div className="space-y-2">
              {SHORTCUT_CHIPS.map((chip, idx) => {
                const IconComponent = chip.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isSending || isLoading}
                    onClick={() => handleChipClick(chip.label)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-amber-50 dark:hover:bg-amber-500/10 border border-slate-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-500/30 transition-all flex items-center gap-2.5 group cursor-pointer text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  >
                    <IconComponent className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 shrink-0 transition-colors" />
                    <span className="truncate">{chip.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trigger Phrase Settings */}
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <div className="text-left">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">Wake Word</span>
                <span className="text-[10px] text-slate-400">Assistant trigger phrase</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customWordInput}
                  onChange={(e) => setCustomWordInput(e.target.value)}
                  placeholder="e.g. piggy"
                  className="w-24 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleSaveCustomWord}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-all active:scale-95 shadow-xs cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Right Column: Sleek Modern Chat Window */}
      <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between h-[640px]">
        
        {/* Chat Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">
                Direct Cognitive Feed
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Ask tasks, habits, expenses or planning advice
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => clearChatHistory()}
              title="Clear chat history"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-800 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold rounded-full">
              Live
            </span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto my-3.5 space-y-4 pr-1.5 scrollbar-thin">
          {activeHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                <Bot className="w-6 h-6" />
              </div>
              <p className="font-display font-bold text-slate-700 dark:text-slate-300 text-sm">How can I help you today?</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Ask about your daily schedule, log a quick habit, add an expense, or type "hi" to chat with Piggy.
              </p>
            </div>
          ) : (
            activeHistory.map((msg) => {
              const isAssistant = msg.role === "assistant";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAssistant ? "items-start" : "items-end"}`}
                >
                  <div className="flex items-start gap-2 max-w-[85%]">
                    {isAssistant && (
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    
                    <div>
                      <div
                        className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                          isAssistant
                            ? "bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-tl-xs text-slate-800 dark:text-slate-100 shadow-2xs font-normal"
                            : "bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-medium rounded-tr-xs shadow-xs"
                        }`}
                      >
                        <p className="whitespace-pre-line break-words">{msg.content}</p>
                      </div>
                      
                      <span className="text-[9px] text-slate-400 font-mono block mt-1 px-1">
                        {formatTimestamp12Hour(msg.timestamp, { includeSeconds: false })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Thinking / Loading Bubble */}
          {(isLoading || isSending) && (
            <div className="flex items-start gap-2 max-w-[85%]">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="font-mono text-[11px] ml-1">Piggy is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form Bar */}
        <form onSubmit={handleSubmit} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
          
          {/* Optional Voice Dictation button (Speech-to-Text) */}
          <button
            type="button"
            onClick={toggleVoiceDictation}
            title={isListening ? "Listening... click to stop" : "Speak message"}
            className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
              isListening
                ? "bg-rose-500 text-white border-rose-600 animate-pulse"
                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            required
            disabled={isLoading || isSending}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isListening ? "Listening to your voice..." : "Ask Piggy anything or give a command..."}
            className="flex-1 h-11 px-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400"
          />

          <button
            type="submit"
            disabled={isLoading || isSending || !inputText.trim()}
            className="h-11 px-5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:shadow-none cursor-pointer disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isSending || isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span className="text-xs font-display font-bold hidden sm:inline">Send</span>
                <Send className="w-3.5 h-3.5 shrink-0" />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
