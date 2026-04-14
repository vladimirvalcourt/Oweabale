import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { isStaleDynamicImportError } from '../lib/dynamicImportErrors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  /** React component stack from componentDidCatch (helps debug intermittent crashes). */
  errorInfo?: string;
  /** Stale or missing JS chunk — sign out and hard-navigate instead of showing a crash UI. */
  recoveringStaleAssets?: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    if (isStaleDynamicImportError(error)) {
      return { hasError: true, error, errorInfo: undefined, recoveringStaleAssets: true };
    }
    return { hasError: true, error, errorInfo: undefined };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, error, info.componentStack);
    if (isStaleDynamicImportError(error)) {
      void this.recoverFromStaleAssets();
      return;
    }
    this.setState({ errorInfo: info.componentStack ?? undefined });
  }

  /** Full navigation loads a fresh index + chunk URLs; sign-out clears session and local app state. */
  private recoverFromStaleAssets = async () => {
    try {
      await Promise.race([
        useStore.getState().signOut(),
        new Promise<void>((resolve) => {
          setTimeout(resolve, 4000);
        }),
      ]);
    } catch (e) {
      console.error('[ErrorBoundary] signOut during stale chunk recovery failed', e);
    }
    const url = new URL('/auth', window.location.origin);
    url.searchParams.set('reason', 'stale');
    window.location.assign(url.toString());
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      if (this.state.recoveringStaleAssets) {
        return (
          <div className="min-h-screen flex items-center justify-center p-8 bg-[#09090b]">
            <p className="text-sm font-mono text-content-secondary uppercase tracking-widest">
              Refreshing session…
            </p>
          </div>
        );
      }

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
              {import.meta.env.DEV ? 'Render fault detected' : 'Something went wrong'}
            </h2>
            <p className="text-sm text-content-tertiary mb-3 leading-relaxed">
              {import.meta.env.DEV
                ? 'This screen crashed while rendering. Technical details are below for debugging.'
                : 'This screen hit an unexpected problem. Try again, or refresh the page. If it keeps happening, contact support.'}
            </p>

            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-[9px] font-mono text-amber-200/90 bg-black/50 border border-surface-border p-3 mb-3 overflow-auto max-h-28 text-wrap break-words">
                {this.state.error.message}
              </pre>
            )}

            {import.meta.env.DEV && this.state.errorInfo && (
              <pre className="text-left text-[8px] font-mono text-content-muted bg-black/30 border border-surface-border/80 p-3 mb-4 overflow-auto max-h-24 text-wrap opacity-90">
                {this.state.errorInfo}
              </pre>
            )}

            {import.meta.env.DEV && this.state.error && (
              <button
                type="button"
                onClick={() => {
                  const lines = [
                    this.state.error?.message,
                    this.state.errorInfo,
                  ].filter(Boolean);
                  void navigator.clipboard.writeText(lines.join('\n\n'));
                }}
                className="px-4 py-2 border border-content-muted text-[10px] font-mono font-bold uppercase tracking-widest text-content-secondary hover:bg-surface-elevated hover:text-white transition-all mb-4"
              >
                Copy error details
              </button>
            )}

            <button
              onClick={this.handleReset}
              className="px-6 py-2 border border-surface-border text-[10px] font-mono font-bold uppercase tracking-widest text-content-secondary hover:bg-surface-elevated hover:text-white transition-all flex items-center gap-2 mx-auto"
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
