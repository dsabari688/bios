import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Send, Trash2 } from "lucide-react";
import { ChatMessage } from "../../types";
import { useStore } from "../../store/useStore";
import { formatTimestamp12Hour } from "../../lib/timeUtils";

interface PiggyChatViewProps {
  chatHistory: ChatMessage[]; // <-- Kept as chatHistory here!
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  token?: string | null;
}

const SHORTCUT_CHIPS = [
  "What are my tasks?",
  "Create a task",
  "Show my habits",
  "Plan tomorrow",
  "Motivate me",
  "Weekly review"
];

export const PiggyChatView: React.FC<PiggyChatViewProps> = ({
  chatHistory, // <-- Kept as chatHistory here!
  onSendMessage,
  isLoading,
  token
}) => {
  const { showToast, osData, saveProfile, clearChatHistory } = useStore();
  // 👇 THE MAGIC LINK: Uses global data if it exists, falls back to local if not
  const activeHistory = osData?.chatHistory || chatHistory; 
  const activationWord = (osData?.profile?.activationWord || "piggy").toLowerCase();

  const [inputText, setInputText] = useState("");
  const [piggyState, setPiggyState] = useState<"IDLE" | "PASSIVE_LISTENING" | "LISTENING" | "THINKING" | "SPEAKING">("IDLE");
  const [isWakeWordMode, setIsWakeWordMode] = useState(false);
  const [micGranted, setMicGranted] = useState<boolean | null>(null);
  const [memoriesCount, setMemoriesCount] = useState<number | null>(null);
  const [customWordInput, setCustomWordInput] = useState(activationWord);

  useEffect(() => {
    setCustomWordInput(activationWord);
  }, [activationWord]);

  useEffect(() => {
    if (token) {
      fetch("/api/piggy/dashboard", {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.aiMemory) {
            setMemoriesCount(data.aiMemory.length);
          }
        })
        .catch(err => console.error("Error fetching memory facts count:", err));
    }
  }, [token]);

  const isWakeWordModeRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activationWordRef = useRef(activationWord);

  useEffect(() => {
    activationWordRef.current = activationWord;
  }, [activationWord]);
  
  const handleSendMessage = useCallback(async (text: string) => {
    await onSendMessage(text);
  }, [onSendMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeHistory, isLoading]); 

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const cleanText = text.replace(/\[TRIGGER_ACTION:[^\]]+\]/g, "").replace(/[*#_`~]/g, "").trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-GB";
    
    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v => v.lang.startsWith("en-GB") || v.name.toLowerCase().includes("google uk") || v.name.toLowerCase().includes("natural"));
    if (premiumVoice) utterance.voice = premiumVoice;
    
    utterance.onstart = () => setPiggyState("SPEAKING");
    utterance.onend = () => {
      setPiggyState(isWakeWordModeRef.current ? "PASSIVE_LISTENING" : "IDLE");
    };
    utterance.onerror = () => {
      setPiggyState(isWakeWordModeRef.current ? "PASSIVE_LISTENING" : "IDLE");
    };
    
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (activeHistory.length > 0) {
      const lastMsg = activeHistory[activeHistory.length - 1];
      if (lastMsg.role === "assistant") {
        speakText(lastMsg.content);
      }
    }
  }, [activeHistory]);

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
      showToast(`Activation word updated to "${trimmed}".`, "success");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setPiggyState("THINKING");
    const textToSend = inputText.trim();
    setInputText("");
    
    await handleSendMessage(textToSend);
  };

  const handleChipClick = async (chip: string) => {
    if (isLoading) return;
    
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    // Use chips as-is — they're already natural language
    setPiggyState("THINKING");
    await handleSendMessage(chip);
  };

  useEffect(() => {
    if (navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices) {
      navigator.permissions?.query({ name: "microphone" as any }).then((permissionStatus) => {
        setMicGranted(permissionStatus.state === "granted");
        permissionStatus.onchange = () => {
          setMicGranted(permissionStatus.state === "granted");
        };
      }).catch(() => {});
    }
    
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const startListening = (continuous: boolean) => {
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Speech Recognition API is not supported in this browser.", "error");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = continuous;
    recognition.lang = "en-US";

    recognition.onresult = async (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }

      const text = (finalTranscript || interimTranscript).toLowerCase();

      const actWord = activationWordRef.current;
      if (continuous) {
        if (text.includes(actWord)) {
          setPiggyState("LISTENING");
          const parts = text.split(actWord);
          const command = parts[parts.length - 1].trim();
          
          if (finalTranscript && command.length > 2) {
            recognition.stop();
            setPiggyState("THINKING");
            await handleSendMessage(command);
          }
        }
      } else {
        if (finalTranscript) {
          recognition.stop();
          setPiggyState("THINKING");
          await handleSendMessage(finalTranscript);
        }
      }
    };

    recognition.onend = () => {
      if (continuous && isWakeWordModeRef.current) {
        try { recognition.start(); } catch (e) {}
      } else if (!continuous) {
        setPiggyState(isWakeWordModeRef.current ? "PASSIVE_LISTENING" : "IDLE");
      }
    };

    recognition.onerror = (err: any) => {
      if (err.error === 'not-allowed') setMicGranted(false);
      if (continuous && isWakeWordModeRef.current && err.error !== 'not-allowed') {
         setTimeout(() => {
             try { recognition.start(); } catch (e) {}
         }, 1000);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) {}
  };

  const toggleWakeWordMode = async () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    
    if (isWakeWordModeRef.current) {
      isWakeWordModeRef.current = false;
      setIsWakeWordMode(false);
      if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch(e) {}
      }
      setPiggyState("IDLE");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicGranted(true);
      isWakeWordModeRef.current = true;
      setIsWakeWordMode(true);
      setPiggyState("PASSIVE_LISTENING");
      startListening(true);
    } catch (err) {
      setMicGranted(false);
    }
  };

  const requestMicAndStart = async () => {
    if (piggyState === "SPEAKING") {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setPiggyState(isWakeWordModeRef.current ? "PASSIVE_LISTENING" : "IDLE");
      return;
    }
    if (isLoading) return;

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicGranted(true);
      if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch(e) {}
      }
      setPiggyState("LISTENING");
      startListening(false);
    } catch (err) {
      setMicGranted(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px]">
      
      {/* Left Column = Pulsing Orb Stage */}
      <div className="lg:col-span-5 bg-slate-950 rounded-2xl p-6 text-white flex flex-col justify-between items-center relative overflow-hidden shadow-xl border border-slate-900">
        
        {/* Background stars / patterns */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(245,166,35,0.06)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="text-center space-y-1 z-10 w-full flex justify-between items-center pb-2 border-b border-white/5">
          <div className="flex flex-col items-start gap-0.5">
            <span className="font-mono text-[9px] font-bold text-amber-500 uppercase tracking-widest">Cognitive Transceiver</span>
            {memoriesCount !== null && (
              <span className="font-mono text-[7px] text-slate-450 uppercase tracking-wider">
                Memory Vault: {memoriesCount} facts stored
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {micGranted === true ? (
              <span className="font-mono text-[8px] text-emerald-500 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">MIC UPLINK</span>
            ) : micGranted === false ? (
              <span className="font-mono text-[8px] text-rose-500 bg-rose-500/10 px-1 rounded border border-rose-500/20">MIC BLOCKED</span>
            ) : (
              <span className="font-mono text-[8px] text-slate-500">MIC UNAUTHORIZED</span>
            )}
            <span className="font-mono text-[9px] text-slate-500">STAGE ID: 01A</span>
          </div>
        </div>

        {/* Big Breathing Pulsing Orb structure */}
        <div className="my-10 flex flex-col items-center justify-center relative z-10">
          
          {/* Animated concentric pulse rings */}
          <div className="absolute w-44 h-44 rounded-full bg-amber-500/5 border border-amber-500/10 animate-ping duration-3000" />
          <div className="absolute w-36 h-36 rounded-full bg-amber-500/5 animate-jarvis-pulse-ring" />
          
          {/* The main core orb */}
          <div 
            onClick={requestMicAndStart}
            className={`w-28 h-28 rounded-full bg-radial p-0.5 flex items-center justify-center cursor-pointer hover:scale-[1.03] transition-all duration-300 ${
              piggyState === "LISTENING" 
                ? "from-rose-400 to-rose-600 shadow-[0_0_45px_rgba(239,68,68,0.5)] animate-ping" 
                : piggyState === "PASSIVE_LISTENING"
                ? "from-blue-400 to-indigo-600 shadow-[0_0_35px_rgba(99,102,241,0.4)] animate-pulse"
                : piggyState === "THINKING"
                ? "from-amber-400 to-yellow-600 shadow-[0_0_40px_rgba(245,166,35,0.4)] animate-pulse"
                : piggyState === "SPEAKING"
                ? "from-emerald-400 to-teal-600 shadow-[0_0_40px_rgba(16,185,129,0.4)] animate-bounce"
                : "from-amber-400 to-amber-600 shadow-[0_0_35px_rgba(245,166,35,0.3)] animate-jarvis-breath"
            }`}
          >
            <Mic className="w-10 h-10 text-slate-950 stroke-2 opacity-80" />
          </div>

          <span className="font-display font-black text-xl text-white tracking-widest mt-6 uppercase">{activationWord} AI</span>
          
          {/* Dynamic state label */}
          <span className="font-mono text-[10px] font-bold text-amber-400 uppercase tracking-widest mt-1 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            &bull; {piggyState} &bull;
          </span>
        </div>

        {/* Audio Frequency Equalizer Waves */}
        <div className="w-full flex justify-center gap-1 h-8 items-center">
          {piggyState === "SPEAKING" || piggyState === "LISTENING" || piggyState === "PASSIVE_LISTENING" || isLoading ? (
            <>
              <div className="w-1 bg-amber-500 h-6 rounded-xs animate-jarvis-wave-1" />
              <div className="w-1 bg-amber-400 h-4 rounded-xs animate-jarvis-wave-2" />
              <div className="w-1 bg-yellow-400 h-8 rounded-xs animate-jarvis-wave-3" />
              <div className="w-1 bg-amber-500 h-5 rounded-xs animate-jarvis-wave-4" />
              <div className="w-1 bg-amber-600 h-7 rounded-xs animate-jarvis-wave-5" />
            </>
          ) : (
            <div className="h-0.5 w-24 bg-white/20 rounded-xs" />
          )}
        </div>

        {/* Voice Trigger controls */}
        <div className="w-full space-y-4 z-10">
          <div className="flex gap-3 w-full font-display">
            <button
              onClick={toggleWakeWordMode}
              className={`flex-1 py-2.5 border text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                isWakeWordMode 
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,166,35,0.2)]" 
                  : "border-white/15 hover:bg-white/5 text-white"
              }`}
            >
              {isWakeWordMode ? "Wake Word: ON" : "Enable Wake Word"}
            </button>
            <button
              onClick={requestMicAndStart}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              Voice Input
            </button>
          </div>

          <p className="text-center text-[9px] text-slate-400 font-mono italic">
            "Sir, click the Main Orb or say '{activationWord.charAt(0).toUpperCase() + activationWord.slice(1)}' to request cognitive dictation fields."
          </p>

          {/* Quick inline Activation Word configurator */}
          <div className="border-t border-b border-white/5 py-2.5 flex items-center justify-between gap-3">
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Trigger Phrase</span>
              <span className="text-[8px] text-slate-500 font-mono">Current wake word</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={customWordInput}
                onChange={(e) => setCustomWordInput(e.target.value)}
                placeholder="e.g. piggy"
                className="w-24 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-amber-400 font-mono focus:outline-none focus:border-amber-500/50 text-center"
              />
              <button
                type="button"
                onClick={handleSaveCustomWord}
                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono font-bold text-[9px] rounded-lg cursor-pointer transition-all active:scale-95 shadow-xs"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Preset trigger Chips */}
          <div className="border-t border-white/5 pt-4">
            <span className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">Preset macro indicators</span>
            <div className="grid grid-cols-2 gap-2">
              {SHORTCUT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  className="px-2 py-2 border border-white/5 bg-white/2 hover:border-amber-500/40 hover:bg-amber-500/5 text-left text-[10px] text-slate-300 hover:text-white rounded-lg transition-all truncate cursor-pointer"
                >
                  &rarr; {chip}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Right Column = Chat bubble Panel */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-lg p-5 flex flex-col justify-between h-[650px]">
        
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-display font-bold text-slate-800 text-sm">Chat with Piggy</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => clearChatHistory()}
              title="Clear chat history / New conversation"
              className="group flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-rose-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-rose-50/50 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500 transition-colors" />
              <span>Clear Chat</span>
            </button>
            <span className="font-mono text-[9px] font-bold text-emerald-600">● Online</span>
          </div>
        </div>

        {/* Scroll message core area */}
        <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1 font-sans">
          {activeHistory.map((msg) => {
            const isPiggy = msg.role === "assistant";
            return (
              <div 
                key={msg.id}
                className={`flex flex-col ${isPiggy ? "items-start" : "items-end"}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs text-slate-800 leading-relaxed ${
                  isPiggy 
                    ? "bg-slate-50 border border-slate-100 rounded-tl-none font-medium text-slate-800" 
                    : "bg-amber-500/10 border border-amber-500/20 rounded-tr-none font-semibold text-amber-900"
                }`}>
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
                <span className="text-[8px] text-slate-400 font-mono block mt-1.5 px-1 uppercase">
                  {formatTimestamp12Hour(msg.timestamp, { includeSeconds: true })}
                </span>
              </div>
            );
          })}
          
          {isLoading && (
            <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px]">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Thinking...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Submission Form */}
        <form onSubmit={handleSubmit} className="border-t border-slate-50 pt-4 flex gap-2 font-display">
          <input
            type="text"
            required
            disabled={isLoading}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="h-10 w-10 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-400 text-slate-900 font-bold rounded-xl flex items-center justify-center cursor-pointer hover:shadow-xs transition-shadow"
          >
            <Send className="w-4 h-4 shrink-0" />
          </button>
        </form>

      </div>
    </div>
  );
};

