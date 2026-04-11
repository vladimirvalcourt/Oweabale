import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="relative max-w-md w-full border border-red-900/50 bg-[#0C0D0E] p-8 text-center">
            {/* Corner markers */}
            <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-red-500" />
            <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-red-500" />

            <div className="flex justify-center mb-5">
              <div className="w-12 h-12 border border-red-900 flex items-center justify-center bg-red-950/30">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
            </div>

            <h2 className="text-[11px] font-mono font-bold text-red-400 uppercase tracking-[0.3em] mb-2">
              Render Fault Detected
            </h2>
            <p className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest mb-6">
              This component encountered an unrecoverable error.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-[9px] font-mono text-content-muted bg-black/50 border border-surface-border p-3 mb-6 overflow-auto max-h-32 text-wrap">
                {this.state.error.message}
              </pre>
            )}

            <button
              onClick={this.handleReset}
              className="px-6 py-2 border border-zinc-700 text-[10px] font-mono font-bold uppercase tracking-widest text-content-secondary hover:bg-surface-elevated hover:text-white transition-all flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-3 h-3" />
              Attempt Recovery
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
