import React, { useState } from "react";
import { Sparkles, LayoutDashboard, Target, Zap, Activity, Info, ChevronRight, Check } from "lucide-react";

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose, userName }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      title: `Welcome to LifeOS, ${(userName || "User").split(" ")[0]}!`,
      description: "I am Piggy (and J.A.R.V.I.S.), your cognitive assistant. Let's take a quick tour of your new command center.",
      icon: Sparkles,
      color: "text-amber-500 bg-amber-50",
      accent: "from-amber-400 to-amber-500",
    },
    {
      title: "Mission Control Dashboard",
      description: "Your daily overview. Here you can see your Life Score, track today's schedules, get notifications from Piggy, and view real-time diagnostics.",
      icon: LayoutDashboard,
      color: "text-indigo-500 bg-indigo-50",
      accent: "from-indigo-400 to-indigo-500",
    },
    {
      title: "Strategic Goals Vault",
      description: "Set multi-week macro directives. Predict outcomes, analyze progress, and coordinate tasks toward achieving your goals.",
      icon: Target,
      color: "text-rose-500 bg-rose-50",
      accent: "from-rose-400 to-rose-500",
    },
    {
      title: "Piggy AI Cockpit",
      description: "Chat with me directly to log habits, edit schedule matrix vectors, or request a morning briefing. The AI adapts to your schedule preferences automatically.",
      icon: Zap,
      color: "text-amber-600 bg-amber-100",
      accent: "from-amber-500 to-amber-600",
    }
  ];

  const currentStep = tourSteps[step];
  const IconComponent = currentStep.icon;

  const handleNext = () => {
    if (step < tourSteps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Step Indicator */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
            PROTOCOL ONBOARDING — STEP {step + 1} OF {tourSteps.length}
          </span>
          <button 
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium font-mono"
          >
            Skip
          </button>
        </div>

        {/* Core Visual Orb */}
        <div className="flex justify-center mb-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800 ${currentStep.color} animate-bounce`}>
            <IconComponent className="w-8 h-8" />
          </div>
        </div>

        {/* Text Area */}
        <div className="text-center space-y-3 mb-8">
          <h3 className="font-display font-black text-xl text-slate-900 dark:text-white leading-snug">
            {currentStep.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans leading-relaxed px-2">
            {currentStep.description}
          </p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {tourSteps.map((_, idx) => (
            <div 
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-350 ${
                idx === step ? "w-6 bg-amber-500" : "w-1.5 bg-slate-200 dark:bg-slate-800"
              }`}
            />
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={handleNext}
          className={`w-full py-3 bg-linear-to-r ${currentStep.accent} text-slate-950 text-xs font-bold font-display rounded-xl shadow-md hover:brightness-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer`}
        >
          {step === tourSteps.length - 1 ? (
            <>
              Engage Systems <Check className="w-4 h-4 text-slate-950 stroke-3" />
            </>
          ) : (
            <>
              Next Directive <ChevronRight className="w-4 h-4 text-slate-950 stroke-3" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

