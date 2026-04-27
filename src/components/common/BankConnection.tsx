import React, { useMemo, useState } from 'react';
import { Lock, Loader2, RefreshCw, Unplug, AlertTriangle, ShieldCheck, ShieldAlert, Clock3 } from 'lucide-react';
import { useStore } from '../../store';
import { toast } from 'sonner';
import { isPlaidLinkUiEnabled } from '../../app/constants';
import { usePlaidFlow } from '../../hooks';
import { createStripeCheckoutSession } from '../../lib/api/stripe';
import { useFullSuiteAccess } from '../../hooks';
import { yieldForPaint } from '../../lib/utils';

const CONNECTION_TIMELINE_STORAGE_KEY = 'oweable_connection_timeline_v1';

type ConnectionTimelineEvent = {
  id: string;
  at: string;
  type: 'sync_success' | 'sync_failure' | 'relink_requested' | 'disconnected' | 'connected';
  detail: string;
};

function loadTimeline(): ConnectionTimelineEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CONNECTION_TIMELINE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConnectionTimelineEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[BankConnection] Failed to parse connection timeline from localStorage:', err);
    return [];
  }
}

function saveTimeline(events: ConnectionTimelineEvent[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONNECTION_TIMELINE_STORAGE_KEY, JSON.stringify(events.slice(0, 20)));
  } catch (err) {
    console.warn('[BankConnection] Failed to save connection timeline to localStorage:', err);
  }
}

/** When Plaid UI is off, manual-first copy; still allow disconnect if a link exists from earlier testing. */
function BankConnectionGated() {
  const { bankConnected, plaidInstitutionName, disconnectBank } = useStore();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    await yieldForPaint();
    try {
      await disconnectBank();
      toast.success('Bank connection removed.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-6">
      <h3 className="text-base font-medium tracking-tight text-content-primary">Bank connections</h3>
      <p className="mt-2 text-sm font-medium leading-relaxed text-content-secondary">
        Oweable works without linking a bank: add bills and debts manually, import transactions via CSV, and use document uploads
        where you need them. Automatic bank sync may appear here when it is available for your account.
      </p>
      {bankConnected && (
        <div className="mt-4 rounded-lg border border-surface-border bg-surface-base p-4">
          <p className="text-sm font-medium text-content-secondary">
            A bank was linked previously:{' '}
            <span className="text-content-primary">{plaidInstitutionName?.trim() || 'Unknown institution'}</span>
          </p>
          <p className="mt-2 text-xs font-medium text-content-tertiary">You can disconnect to clear the stored connection.</p>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-500/20 disabled:opacity-60 dark:text-rose-300"
          >
            {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden /> : <Unplug className="h-4 w-4 shrink-0" aria-hidden />}
            Disconnect bank
          </button>
        </div>
      )}
    </div>
  );
}

function BankConnectionPlaid() {
  const {
    bankConnected,
    connectBank,
    disconnectBank,
    syncPlaidTransactions,
    plaidInstitutionName,
    plaidLastSyncAt,
    plaidNeedsRelink,
    plaidAccounts,
    platformSettings,
  } = useStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [incidentTimeline, setIncidentTimeline] = useState<ConnectionTimelineEvent[]>(() => loadTimeline());
  const { hasFullSuite, isLoading: checkingAccess } = useFullSuiteAccess();

  const plaidGloballyEnabled = platformSettings?.plaidEnabled !== false;
  const plaidEnabledForUser = plaidGloballyEnabled && hasFullSuite;
  const plaidFlow = usePlaidFlow({
    enabled: plaidEnabledForUser,
    onConnected: connectBank,
    onInitialSync: () => syncPlaidTransactions({ quiet: true }),
  });

  const handleConnectClick = async () => {
    await yieldForPaint();
    await plaidFlow.startConnect();
    const next: ConnectionTimelineEvent[] = [
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        type: 'connected',
        detail: 'Bank connection flow started.',
      },
      ...incidentTimeline,
    ];
    setIncidentTimeline(next);
    saveTimeline(next);
  };

  const handleFixConnectionClick = async () => {
    await yieldForPaint();
    await plaidFlow.startReconnect();
    const next: ConnectionTimelineEvent[] = [
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        type: 'relink_requested',
        detail: 'User initiated reconnect flow.',
      },
      ...incidentTimeline,
    ];
    setIncidentTimeline(next);
    saveTimeline(next);
  };

  const handleSyncClick = async () => {
    setIsSyncing(true);
    await yieldForPaint();
    try {
      const ok = await syncPlaidTransactions();
      const next: ConnectionTimelineEvent[] = [
        {
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          type: ok ? 'sync_success' : 'sync_failure',
          detail: ok ? 'Manual sync completed successfully.' : 'Manual sync failed or returned no updates.',
        },
        ...incidentTimeline,
      ];
      setIncidentTimeline(next);
      saveTimeline(next);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectClick = async () => {
    setIsDisconnecting(true);
    await yieldForPaint();
    try {
      await disconnectBank();
      const next: ConnectionTimelineEvent[] = [
        {
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          type: 'disconnected',
          detail: 'Bank connection was disconnected.',
        },
        ...incidentTimeline,
      ];
      setIncidentTimeline(next);
      saveTimeline(next);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleUpgradeClick = async () => {
    setIsUpgrading(true);
    await yieldForPaint();
    try {
      const checkout = await createStripeCheckoutSession('pro_monthly');
      if ('error' in checkout) {
        toast.error(checkout.error || 'Unable to start checkout');
        setIsUpgrading(false);
        return;
      }
      // Redirect to Stripe Checkout
      window.location.href = checkout.checkoutUrl;
    } catch (err) {
      console.error('[BankConnection] Upgrade error:', err);
      toast.error('Unable to start checkout. Please try again.');
      setIsUpgrading(false);
    }
  };

  const displayName = plaidInstitutionName?.trim() || 'Connected bank';
  const lastSyncLabel = plaidLastSyncAt ? new Date(plaidLastSyncAt).toLocaleString() : null;
  const syncHealth = useMemo(() => {
    if (!bankConnected) return { score: 0, state: 'disconnected' as const, detail: 'No bank connected yet.' };
    if (plaidNeedsRelink) {
      return {
        score: 25,
        state: 'needs_attention' as const,
        detail: 'Institution sign-in expired. Reconnect to restore syncing.',
      };
    }
    if (!plaidLastSyncAt) {
      return { score: 60, state: 'warming' as const, detail: 'Connected, waiting for first successful sync.' };
    }
    const ageMs = Date.now() - new Date(plaidLastSyncAt).getTime();
    const hours = ageMs / 3600000;
    if (hours <= 24) {
      return { score: 95, state: 'healthy' as const, detail: 'Recent sync in the last 24 hours.' };
    }
    if (hours <= 72) {
      return { score: 75, state: 'stale' as const, detail: 'Sync is older than one day. Run Sync now.' };
    }
    return {
      score: 45,
      state: 'stale' as const,
      detail: 'No recent sync for 3+ days. Sync now, then reconnect if needed.',
    };
  }, [bankConnected, plaidNeedsRelink, plaidLastSyncAt]);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-6">
      <div className="mb-6">
        <h3 className="text-base font-medium tracking-tight text-content-primary">Bank connections</h3>
        <p className="mt-1 text-sm font-medium leading-relaxed text-content-secondary">
          Connect your bank through our partner Plaid. You sign in at your bank; we only keep what is needed to sync transactions.
          Sync runs automatically and you can refresh on demand.
        </p>
      </div>
      {bankConnected && plaidEnabledForUser && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => void handleConnectClick()}
            disabled={plaidFlow.isBusy}
            className="inline-flex items-center gap-2 rounded-lg border border-content-primary/20 bg-content-primary/[0.06] px-4 py-2 text-sm font-medium text-content-primary transition-colors hover:bg-content-primary/10 disabled:opacity-60"
          >
            {plaidFlow.isBusy ? <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden /> : null}
            + Add bank account
          </button>
          <p className="mt-2 text-xs text-content-tertiary">Link another institution; each connection stays on this list.</p>
        </div>
      )}
      {bankConnected && (
        <div className="mb-4 rounded-lg border border-surface-border bg-surface-base p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {syncHealth.state === 'healthy' ? (
                <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden />
              ) : syncHealth.state === 'needs_attention' ? (
                <ShieldAlert className="h-4 w-4 text-amber-400" aria-hidden />
              ) : (
                <Clock3 className="h-4 w-4 text-content-tertiary" aria-hidden />
              )}
              <p className="text-sm font-medium text-content-primary">Connection resilience center</p>
            </div>
            <span className="rounded-full border border-surface-border bg-surface-raised px-2.5 py-0.5 text-xs font-medium text-content-secondary">
              Health score: {syncHealth.score}/100
            </span>
          </div>
          <p className="mt-2 text-xs font-medium text-content-secondary">{syncHealth.detail}</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full border border-surface-border bg-surface-raised">
            <div
              className={`h-full transition-all ${
                syncHealth.score >= 90 ? 'bg-emerald-500' : syncHealth.score >= 70 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.max(8, syncHealth.score)}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-content-tertiary sm:grid-cols-3">
            <div className="rounded border border-surface-border bg-surface-raised px-2.5 py-2">
              1. Sync now to refresh balances and transactions.
            </div>
            <div className="rounded border border-surface-border bg-surface-raised px-2.5 py-2">
              2. If stale or failing, use Reconnect for bank MFA re-auth.
            </div>
            <div className="rounded border border-surface-border bg-surface-raised px-2.5 py-2">
              3. If still failing, disconnect and relink cleanly.
            </div>
          </div>
        </div>
      )}
      <div className="mb-4 rounded-lg border border-surface-border bg-surface-base p-4">
        <p className="text-sm font-medium text-content-primary">Connection incident timeline</p>
        <p className="mt-1 text-xs text-content-tertiary">
          Recent connection events for faster troubleshooting.
        </p>
        {incidentTimeline.length === 0 ? (
          <p className="mt-3 text-xs text-content-muted">No incidents logged yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {incidentTimeline.slice(0, 5).map((event) => (
              <li key={event.id} className="rounded border border-surface-border bg-surface-raised px-2.5 py-2 text-xs">
                <p className="font-medium text-content-secondary">{event.detail}</p>
                <p className="mt-0.5 text-content-tertiary">{new Date(event.at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!bankConnected ? (
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={handleConnectClick}
            disabled={plaidFlow.isBusy || !plaidEnabledForUser}
            className="flex items-center gap-2 rounded-lg bg-brand-cta px-6 py-2.5 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {plaidFlow.isBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                <span>
                  {plaidFlow.stage === 'oauth_redirect' ? 'Awaiting bank…' : 'Preparing secure link…'}
                </span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 shrink-0" aria-hidden />
                <span>Connect with Plaid</span>
              </>
            )}
          </button>
          {!plaidGloballyEnabled && (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400/90">Bank linking is disabled by the platform.</p>
          )}
          {plaidGloballyEnabled && !checkingAccess && !hasFullSuite && (
            <div className="rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs font-medium text-content-secondary">
              Plaid bank linking is available on Full Suite.
              <button
                type="button"
                onClick={() => void handleUpgradeClick()}
                disabled={isUpgrading}
                className="ml-3 underline underline-offset-2 disabled:opacity-60"
              >
                {isUpgrading ? 'Opening checkout…' : 'Upgrade'}
              </button>
            </div>
          )}
          {plaidFlow.stage === 'error' && plaidFlow.errorMessage && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-800 dark:text-rose-200">
              {plaidFlow.errorMessage}
              <button
                type="button"
                onClick={() => void plaidFlow.retryLastIntent()}
                className="ml-3 underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {plaidNeedsRelink && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Bank needs attention</p>
                <p className="mt-1 text-xs font-medium text-content-secondary">
                  Your institution needs you to sign in again. Use Fix connection to reconnect securely.
                </p>
                <button
                  type="button"
                  onClick={handleFixConnectionClick}
                  disabled={plaidFlow.isBusy || !plaidEnabledForUser}
                  className="mt-3 rounded-lg border border-amber-500/35 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-500/25 disabled:opacity-60 dark:text-amber-100"
                >
                  {plaidFlow.isBusy && plaidFlow.activeIntent === 'update' ? 'Opening…' : 'Fix connection'}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-surface-border bg-surface-base p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Active
                </span>
                <span className="truncate text-sm font-medium text-content-primary">{displayName}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSyncClick}
                  disabled={isSyncing || !plaidEnabledForUser}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-cta px-4 py-2 text-sm font-medium text-surface-base transition-colors hover:bg-brand-cta-hover disabled:opacity-60"
                >
                  {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                  Sync now
                </button>
                <button
                  type="button"
                  onClick={handleFixConnectionClick}
                  disabled={plaidFlow.isBusy || !plaidEnabledForUser}
                  className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-raised px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:border-content-muted hover:text-content-primary disabled:opacity-60"
                >
                  Reconnect
                </button>
              </div>
            </div>
            <div className="mt-3 text-xs font-medium text-content-tertiary">
              {lastSyncLabel
                ? `Last transaction sync: ${lastSyncLabel}`
                : 'No sync yet — use Sync now or wait for automatic updates.'}
            </div>
            {/* E-08: Per-account last-synced timestamps */}
            {plaidAccounts.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[11px] font-medium text-content-tertiary">Linked accounts</p>
                <ul className="space-y-1">
                  {plaidAccounts.map((acct) => (
                    <li
                      key={acct.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border border-surface-border bg-surface-raised px-2.5 py-1.5 text-xs"
                    >
                      <span className="font-medium text-content-primary">
                        {acct.name}
                        {acct.mask ? ` ···${acct.mask}` : ''}
                      </span>
                      <span className="text-content-muted capitalize">
                        {acct.lastSyncAt
                          ? `Synced ${new Date(acct.lastSyncAt).toLocaleString()}`
                          : lastSyncLabel
                          ? `Synced ${lastSyncLabel}`
                          : 'Not yet synced'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => void handleDisconnectClick()}
                disabled={isDisconnecting}
                className="text-xs font-medium text-content-muted underline-offset-2 hover:text-rose-400 hover:underline disabled:opacity-60"
              >
                {isDisconnecting ? 'Disconnecting…' : 'Disconnect this bank'}
              </button>
            </div>
            {plaidFlow.stage === 'error' && plaidFlow.errorMessage && (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-800 dark:text-rose-200">
                {plaidFlow.errorMessage}
                <button
                  type="button"
                  onClick={() => void plaidFlow.retryLastIntent()}
                  className="ml-3 underline underline-offset-2"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BankConnection() {
  if (!isPlaidLinkUiEnabled()) {
    return <BankConnectionGated />;
  }
  return <BankConnectionPlaid />;
}
