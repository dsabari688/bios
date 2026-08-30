import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  props: Props;
  state: State = { hasError: false, error: null };

  constructor(props: Props) {
    super(props);
    this.props = props;
  }
  
  static getDerivedStateFromError(error: Error) { 
    return { hasError: true, error }; 
  }
  
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("LifeOS render crash:", error, info);
  }
  
  handleResetApp = () => {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.clear();
      }
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.clear();
      }
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-slate-950 text-white">
          <div className="max-w-md space-y-4">
            <h2 className="text-xl font-bold text-amber-500 font-display">SYSTEM RECOVERY</h2>
            <p className="text-xs text-slate-300 font-mono">LifeOS encountered a visual render parameter error.</p>
            {this.state.error?.message && (
              <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-left text-xs font-mono text-rose-400 overflow-x-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Reload LifeOS
              </button>
              <button 
                onClick={this.handleResetApp} 
                className="px-4 py-2 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Clear Storage & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


