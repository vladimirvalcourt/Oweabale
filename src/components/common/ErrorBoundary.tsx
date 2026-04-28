import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useStore } from '../../store';
import { isStaleDynamicImportError } from '../../lib/utils';

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
          <div className="min-h-screen flex items-center justify-center p-8 bg-surface-base">
            <p className="text-sm font-mono text-content-secondary uppercase tracking-widest">
              Refreshing session…
            </p>
          </div>
        );
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="relative max-w-md w-full border border-[var(--color-status-rose-border)] bg-surface-base p-8 text-center">
            {/* Corner markers */}
            <div className="absolute left-0 top-0 h-2 w-2 border-l border-t border-[var(--color-status-rose-border)]" />
            <div className="absolute right-0 top-0 h-2 w-2 border-r border-t border-[var(--color-status-rose-border)]" />

            <div className="flex justify-center mb-5">
              <div className="flex h-12 w-12 items-center justify-center border border-[var(--color-status-rose-border)] bg-[var(--color-status-rose-bg)]">
                <AlertTriangle className="h-5 w-5 text-[var(--color-status-rose-text)]" />
              </div>
            </div>

            <h2 className="mb-2 text-[11px] font-mono font-bold uppercase tracking-[0.3em] text-[var(--color-status-rose-text)]">
              {import.meta.env.DEV ? 'Render fault detected' : 'Something went wrong'}
            </h2>
            <p className="text-sm text-content-tertiary mb-3 leading-relaxed">
              {import.meta.env.DEV
                ? 'This screen crashed while rendering. Technical details are below for debugging.'
                : 'This screen hit an unexpected problem. Try again, or refresh the page. If it keeps happening, contact support.'}
            </p>

            {import.meta.env.DEV && this.state.error && (
              <pre className="mb-3 max-h-28 overflow-auto border border-surface-border bg-surface-elevated p-3 text-left text-[9px] font-mono text-[var(--color-status-amber-text)] text-wrap break-words">
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
                className="px-4 py-2 border border-content-muted text-[10px] font-mono font-bold uppercase tracking-widest text-content-secondary hover:bg-surface-elevated hover:text-content-primary transition-all mb-4"
              >
                Copy error details
              </button>
            )}

            <button
              onClick={this.handleReset}
              className="px-6 py-2 border border-surface-border text-[10px] font-mono font-bold uppercase tracking-widest text-content-secondary hover:bg-surface-elevated hover:text-content-primary transition-all flex items-center gap-2 mx-auto"
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
