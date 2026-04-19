import React, { Suspense, lazy, memo, useState, useCallback } from 'react';
import { Loader2, Mail, Unplug, RefreshCw, Shield, ExternalLink } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store/useStore';
import { toast } from 'sonner';
import { buildGmailConnectUrl } from '../../lib/googleEmailOAuth';
import { TransitionLink } from '../../components/TransitionLink';
import { yieldForPaint } from '../../lib/interaction';

const BankConnection = lazy(() => import('../../components/BankConnection'));

function IntegrationsPanelInner() {
  const {
    emailConnections,
    emailScanFindings,
    runEmailIntelligenceScan,
    disconnectGmail,
  } = useStore(
    useShallow((s) => ({
      emailConnections: s.emailConnections,
      emailScanFindings: s.emailScanFindings,
      runEmailIntelligenceScan: s.runEmailIntelligenceScan,
      disconnectGmail: s.disconnectGmail,
    })),
  );

  const [consentOpen, setConsentOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);

  const pendingCount = emailScanFindings.filter((f) => f.reviewStatus === 'pending').length;

  const startGmailOAuth = useCallback(() => {
    try {
      const url = buildGmailConnectUrl();
      window.location.assign(url);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Google client ID missing. Add VITE_GOOGLE_GMAIL_CLIENT_ID.',
      );
    }
  }, []);

  const onScanNow = async () => {
    setScanBusy(true);
    await yieldForPaint();
    try {
      const r = await runEmailIntelligenceScan();
      if (r.ok) {
        toast.success('Scan finished — check New from email.');
      } else {
        toast.error(r.message || 'Scan failed');
      }
    } finally {
      setScanBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <p className="text-sm font-medium text-content-secondary">
        Connect accounts for automatic transaction sync. Full Suite is required when bank linking is enabled.
      </p>
      <Suspense
        fallback={
          <div
            className="flex min-h-[10rem] items-center justify-center rounded-lg border border-surface-border bg-surface-raised p-8"
            aria-busy="true"
            aria-label="Loading integrations"
          >
            <Loader2 className="h-5 w-5 animate-spin text-content-tertiary" aria-hidden />
          </div>
        }
      >
        <BankConnection />
      </Suspense>

      <div className="rounded-xl border border-surface-border bg-surface-raised p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-surface-base">
            <Mail className="w-5 h-5 text-content-muted" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-content-primary">Email Intelligence (Gmail)</h3>
            <p className="mt-1 text-xs text-content-tertiary leading-relaxed max-w-xl">
              Read-only Gmail access to surface bills, renewals, toll notices, and collections in Oweable. You review
              every item before it is saved.
            </p>
          </div>
        </div>

        {emailConnections.length === 0 ? (
          <button
            type="button"
            onClick={() => setConsentOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-content-primary px-4 py-2.5 text-sm font-medium text-surface-base hover:opacity-95"
          >
            <Mail className="w-4 h-4 shrink-0" aria-hidden />
            Connect Gmail
          </button>
        ) : (
          <div className="space-y-4">
            {emailConnections.map((c) => (
              <div
                key={c.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface-base p-4"
              >
                <div>
                  <p className="text-sm font-medium text-content-primary">{c.emailAddress}</p>
                  <p className="text-[11px] text-content-muted mt-1">
                    Last scan:{' '}
                    {c.lastScanAt
                      ? new Date(c.lastScanAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                      : '—'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={scanBusy}
                    onClick={() => void onScanNow()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-2 text-xs font-medium text-content-secondary hover:bg-surface-elevated disabled:opacity-50"
                  >
                    {scanBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" aria-hidden />
                    )}
                    Scan now
                  </button>
                  {pendingCount > 0 && (
                    <TransitionLink
                      to="/email-inbox"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-cta/90 px-3 py-2 text-xs font-semibold text-surface-base"
                    >
                      Review ({pendingCount})
                    </TransitionLink>
                  )}
                  <button
                    type="button"
                    onClick={() => void disconnectGmail(c.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10"
                  >
                    <Unplug className="w-3.5 h-3.5" aria-hidden />
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-content-muted">
              Daily background scans can be scheduled with Supabase cron calling{' '}
              <code className="text-content-tertiary">email-intelligence-scan</code> using{' '}
              <code className="text-content-tertiary">x-email-scan-cron</code> — see project docs.
            </p>
          </div>
        )}
      </div>

      <Dialog open={consentOpen} onClose={() => setConsentOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/70" aria-hidden />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-xl border border-surface-border bg-surface-raised p-6 shadow-xl">
            <div className="flex items-center gap-2 text-amber-400 mb-3">
              <Shield className="w-5 h-5 shrink-0" aria-hidden />
              <Dialog.Title className="text-base font-semibold text-content-primary">Connect Gmail</Dialog.Title>
            </div>
            <p className="text-sm text-content-secondary leading-relaxed">
              Oweable requests <strong className="text-content-primary font-medium">read-only</strong> Gmail access (
              <code className="text-[11px] text-content-tertiary">gmail.readonly</code>). We use it only to detect
              financial messages such as bills, statements, debt notices, and payment reminders.
            </p>
            <p className="text-sm text-content-secondary leading-relaxed mt-3">
              We <strong className="text-content-primary font-medium">do not</strong> read personal conversations for
              advertising or profiling. We <strong className="text-content-primary font-medium">never</strong> store
              full email bodies — only structured fields you confirm in review.
            </p>
            <p className="text-xs text-content-muted mt-4 flex items-start gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
              Production Gmail access requires Google API verification (typically a few weeks). Until verified, use
              test users in Google Cloud Console.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConsentOpen(false)}
                className="rounded-lg border border-surface-border px-4 py-2 text-sm text-content-secondary hover:bg-surface-elevated"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConsentOpen(false);
                  startGmailOAuth();
                }}
                className="rounded-lg bg-brand-cta px-4 py-2 text-sm font-semibold text-surface-base hover:bg-brand-cta-hover"
              >
                Continue to Google
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}

export const IntegrationsPanel = memo(IntegrationsPanelInner);
