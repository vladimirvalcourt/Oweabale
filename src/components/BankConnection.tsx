import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePlaidLink, type PlaidLinkOnSuccess } from 'react-plaid-link';
import { Lock, Loader2, RefreshCw, Unplug, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';
import { createPlaidLinkToken, exchangePlaidPublicToken } from '../lib/plaid';
import { isPlaidLinkUiEnabled } from '../lib/featureFlags';

/** When Plaid UI is off, show coming-soon; still allow disconnect if a link exists from earlier testing. */
function BankConnectionGated() {
  const { bankConnected, plaidInstitutionName, disconnectBank } = useStore();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectBank();
      toast.success('Bank connection removed.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="bg-surface-elevated rounded-sm border border-surface-border p-6">
      <h3 className="text-sm font-sans font-semibold text-content-primary">Bank connections</h3>
      <p className="mt-2 text-sm text-content-tertiary leading-relaxed">
        Automatic bank linking isn&apos;t available yet. We&apos;re finishing the integration and will enable it here when
        it&apos;s ready.
      </p>
      {bankConnected && (
        <div className="mt-4 rounded-sm border border-surface-border bg-surface-base p-4">
          <p className="text-sm text-content-secondary">
            A bank was linked previously:{' '}
            <span className="font-medium text-content-primary">{plaidInstitutionName?.trim() || 'Unknown institution'}</span>
          </p>
          <p className="mt-2 text-xs text-content-tertiary">You can disconnect to clear the stored connection.</p>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="mt-3 inline-flex items-center gap-2 rounded-sm border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-sans font-medium text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-60"
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
    platformSettings,
  } = useStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const linkIntentRef = useRef<'create' | 'update'>('create');
  const [activeLinkFlow, setActiveLinkFlow] = useState<'idle' | 'create' | 'update'>('idle');
  const openedRef = useRef(false);

  const plaidGloballyEnabled = platformSettings?.plaidEnabled !== false;

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (public_token, metadata) => {
      setIsConnecting(true);
      try {
        const result = await exchangePlaidPublicToken(public_token, metadata);
        if ('error' in result) {
          toast.error(result.error);
          return;
        }
        await connectBank();
        const synced = await syncPlaidTransactions({ quiet: true });
        const intent = linkIntentRef.current;
        toast.success(intent === 'update' ? 'Bank connection updated.' : 'Bank connected successfully.');
        if (!synced) {
          toast.error('Connection saved, but initial sync failed — try Sync now in a moment.');
        }
      } finally {
        setIsConnecting(false);
        setLinkToken(null);
        linkIntentRef.current = 'create';
        setActiveLinkFlow('idle');
        openedRef.current = false;
      }
    },
    [connectBank, syncPlaidTransactions],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => {
      setLinkToken(null);
      linkIntentRef.current = 'create';
      setActiveLinkFlow('idle');
      openedRef.current = false;
    },
  });

  useEffect(() => {
    if (linkToken && ready && !openedRef.current) {
      openedRef.current = true;
      open();
    }
    if (!linkToken) openedRef.current = false;
  }, [linkToken, ready, open]);

  const handleConnectClick = async () => {
    if (!plaidGloballyEnabled) {
      toast.error('Bank linking is temporarily unavailable.');
      return;
    }
    setIsConnecting(true);
    setActiveLinkFlow('create');
    linkIntentRef.current = 'create';
    const res = await createPlaidLinkToken();
    if ('error' in res) {
      toast.error(res.error);
      setIsConnecting(false);
      return;
    }
    setLinkToken(res.link_token);
    setIsConnecting(false);
  };

  const handleFixConnectionClick = async () => {
    if (!plaidGloballyEnabled) {
      toast.error('Bank linking is temporarily unavailable.');
      return;
    }
    setIsConnecting(true);
    setActiveLinkFlow('update');
    linkIntentRef.current = 'update';
    const res = await createPlaidLinkToken({ mode: 'update' });
    if ('error' in res) {
      toast.error(res.error);
      setIsConnecting(false);
      linkIntentRef.current = 'create';
      setActiveLinkFlow('idle');
      return;
    }
    setLinkToken(res.link_token);
    setIsConnecting(false);
  };

  const handleSyncClick = async () => {
    setIsSyncing(true);
    try {
      await syncPlaidTransactions();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectClick = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectBank();
    } finally {
      setIsDisconnecting(false);
    }
  };

  const displayName = plaidInstitutionName?.trim() || 'Connected bank';
  const lastSyncLabel = plaidLastSyncAt ? new Date(plaidLastSyncAt).toLocaleString() : null;

  return (
    <div className="bg-surface-elevated rounded-sm border border-surface-border p-6">
      <div className="mb-6">
        <h3 className="text-xs font-mono uppercase tracking-widest text-content-primary">Data Sources</h3>
        <p className="mt-1 text-sm text-content-tertiary">
          Connect your bank with Plaid. Credentials stay with Plaid; we store a secure access token on the server only.
          Transactions sync automatically and you can refresh on demand.
        </p>
      </div>

      {!bankConnected ? (
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={handleConnectClick}
            disabled={isConnecting || !plaidGloballyEnabled}
            className="bg-content-primary text-black hover:bg-zinc-200 font-bold px-6 py-3 rounded-sm flex items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-mono text-sm tracking-widest">PREPARING SECURE LINK…</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span className="font-mono text-sm tracking-widest">CONNECT WITH PLAID</span>
              </>
            )}
          </button>
          {!plaidGloballyEnabled && (
            <p className="text-xs font-mono text-amber-500/90">Bank linking is disabled by the platform.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {plaidNeedsRelink && (
            <div className="flex items-start gap-3 rounded-sm border border-amber-500/40 bg-amber-500/10 p-4">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
              <div className="min-w-0">
                <p className="text-sm font-mono text-amber-200">Bank needs attention</p>
                <p className="mt-1 text-xs text-content-tertiary">
                  Your institution requires you to sign in again. Use Fix connection to complete Plaid Link update mode.
                </p>
                <button
                  type="button"
                  onClick={handleFixConnectionClick}
                  disabled={isConnecting || !plaidGloballyEnabled}
                  className="mt-3 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-sm border border-amber-500/30 disabled:opacity-60"
                >
                  {isConnecting && activeLinkFlow === 'update' ? 'Opening…' : 'Fix connection'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-surface-base border border-surface-border rounded-sm p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-mono text-sm text-content-primary">
                [STATUS: <span className="text-emerald-400 animate-pulse">ACTIVE</span>] {displayName}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSyncClick}
                  disabled={isSyncing || !plaidGloballyEnabled}
                  className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-surface-border text-content-primary font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-sm disabled:opacity-60"
                >
                  {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Sync now
                </button>
                <button
                  type="button"
                  onClick={handleFixConnectionClick}
                  disabled={isConnecting || !plaidGloballyEnabled}
                  className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-surface-border text-content-secondary font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-sm disabled:opacity-60"
                >
                  Reconnect
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectClick}
                  disabled={isDisconnecting}
                  className="inline-flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-sm disabled:opacity-60"
                >
                  {isDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}
                  Disconnect
                </button>
              </div>
            </div>
            <div className="mt-3 text-xs font-mono text-content-tertiary">
              {lastSyncLabel
                ? `Last transaction sync: ${lastSyncLabel}`
                : 'No sync yet — use Sync now or wait for automatic updates.'}
            </div>
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
