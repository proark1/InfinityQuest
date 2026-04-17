import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-200">
          <div className="max-w-md w-full bg-slate-900 border border-red-900/50 rounded-2xl p-8 shadow-2xl text-center">
            <AlertTriangle className="text-red-500 w-16 h-16 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2 fantasy-font">The fates have unraveled</h1>
            <p className="text-slate-400 mb-6 text-sm">
              An unexpected error broke the weave. Reload to continue your quest — your progress is preserved.
            </p>
            <details className="text-left text-xs text-slate-500 mb-6 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <summary className="cursor-pointer">Error details</summary>
              <pre className="whitespace-pre-wrap mt-2">{this.state.error.message}</pre>
            </details>
            <button
              onClick={this.handleReload}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-all"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
