import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  /** React component stack from componentDidCatch (helps debug intermittent crashes). */
  errorInfo?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: undefined };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, error, info.componentStack);
    this.setState({ errorInfo: info.componentStack ?? undefined });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
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
            <p className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest mb-3">
              A screen crashed while rendering. Details below also appear in the browser console as{' '}
              <span className="text-content-muted">[ErrorBoundary]</span>.
            </p>

            {this.state.error && (
              <pre className="text-left text-[9px] font-mono text-amber-200/90 bg-black/50 border border-surface-border p-3 mb-3 overflow-auto max-h-28 text-wrap break-words">
                {this.state.error.message}
              </pre>
            )}

            {import.meta.env.DEV && this.state.errorInfo && (
              <pre className="text-left text-[8px] font-mono text-content-muted bg-black/30 border border-surface-border/80 p-3 mb-4 overflow-auto max-h-24 text-wrap opacity-90">
                {this.state.errorInfo}
              </pre>
            )}

            {this.state.error && (
              <button
                type="button"
                onClick={() => {
                  const lines = [
                    this.state.error?.message,
                    this.state.errorInfo,
                  ].filter(Boolean);
                  void navigator.clipboard.writeText(lines.join('\n\n'));
                }}
                className="px-4 py-2 border border-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest text-content-secondary hover:bg-surface-elevated hover:text-white transition-all mb-4"
              >
                Copy error details
              </button>
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
