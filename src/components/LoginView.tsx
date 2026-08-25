import React, { useState } from "react";
import { Terminal, ChevronRight, Info, Eye, EyeOff, KeyRound } from "lucide-react";

type AuthStep = "login" | "register" | "otp";

interface LoginViewProps {
  onLoginSuccess: (token: string, user: { name: string; email: string; avatarUrl: string | null; id: string }) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [step, setStep] = useState<AuthStep>("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", otp: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  // Step 1: Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    // Simulate network delay for authentication
    setTimeout(() => {
      const mockUser = {
        id: "usr_mock_01",
        name: form.email.split("@")[0].charAt(0).toUpperCase() + form.email.split("@")[0].slice(1),
        email: form.email,
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120",
      };
      onLoginSuccess("mock_jwt_token_lifeos_dashboard", mockUser);
      setLoading(false);
    }, 800);
  };

  // Step 2: Submit Registration (Sends OTP)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.confirm) {
      setError("All fields are required.");
      return;
    }

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    // Simulate OTP generation and email dispatch
    setTimeout(() => {
      setMessage("Verification code sent to your email!");
      setStep("otp");
      setLoading(false);
    }, 800);
  };

  // Step 3: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.otp || form.otp.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError(null);

    // Simulate OTP validation
    setTimeout(() => {
      const mockUser = {
        id: "usr_mock_01",
        name: form.name || form.email.split("@")[0],
        email: form.email,
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120",
      };
      onLoginSuccess("mock_jwt_token_lifeos_dashboard", mockUser);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Visual Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 mx-auto flex items-center justify-center text-amber-500 border border-amber-500/20">
            {step === "otp" ? <KeyRound className="w-7 h-7" /> : <Terminal className="w-7 h-7" />}
          </div>
          <h2 className="font-display font-black text-2xl text-slate-100 leading-tight tracking-wide uppercase">
            {step === "otp" ? "Verify Security Port" : "Welcome to LifeOS"}
          </h2>
          <p className="text-xs text-slate-400 font-sans tracking-wide">
            {step === "otp"
              ? "A 6-digit verification code has been dispatched."
              : "Your personal command cockpit awaits."}
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-sans leading-relaxed text-left">
            {error}
          </div>
        )}
        {message && !error && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-sans leading-relaxed text-left">
            {message}
          </div>
        )}

        {/* Step 1: Login Form */}
        {step === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Email Identity</label>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                placeholder="alex.mercer@stark.corp"
              />
            </div>

            <div className="space-y-1.5 text-left relative">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Access Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={form.password}
                  onChange={handleInputChange}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-950 font-display font-bold text-xs uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? "Decrypting Port..." : "Authenticate Node"}
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep("register");
                  setError(null);
                  setMessage(null);
                }}
                className="text-xs text-amber-500 hover:underline cursor-pointer tracking-wide"
              >
                Need a command cockpit? Create Account
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Register Form */}
        {step === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                placeholder="Alex Mercer"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                placeholder="alex@stark.corp"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
              <input
                type="password"
                name="password"
                required
                value={form.password}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Confirm Password</label>
              <input
                type="password"
                name="confirm"
                required
                value={form.confirm}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-950 font-display font-bold text-xs uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? "Dispatching OTP..." : "Register Account"}
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep("login");
                  setError(null);
                  setMessage(null);
                }}
                className="text-xs text-amber-500 hover:underline cursor-pointer tracking-wide"
              >
                Already registered? Sign In
              </button>
            </div>
          </form>
        )}

        {/* Step 3: OTP Code Form */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex gap-2 items-start text-left">
              <Info className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                Check your email. We have dispatched a 6-digit confirmation security token. Enter it below to unlock access.
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Verification Code</label>
              <input
                type="text"
                name="otp"
                maxLength={6}
                required
                value={form.otp}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-center text-xl font-mono tracking-widest focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                placeholder="123456"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-950 font-display font-bold text-xs uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? "Authenticating OTP..." : "Verify Code & Access"}
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep("register");
                  setError(null);
                  setMessage(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer tracking-wide"
              >
                Incorrect details? Re-enter Registration Form
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
