import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  props: Props;
  state: State = { hasError: false };

  constructor(props: Props) {
    super(props);
    this.props = props;
  }
  
  static getDerivedStateFromError() { 
    return { hasError: true }; 
  }
  
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("LifeOS render crash:", error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-3 bg-slate-900">
          <p className="text-slate-400 font-semibold">Something went wrong loading this view.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg font-bold transition-colors"
          >
            Reload LifeOS
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}