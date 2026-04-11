import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePlaidLink, type PlaidLinkOnSuccess } from 'react-plaid-link';
import { Lock, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';
import { createPlaidLinkToken, exchangePlaidPublicToken } from '../lib/plaid';

export default function BankConnection() {
  const { bankConnected, connectBank, plaidInstitutionName, platformSettings } = useStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncTime, setSyncTime] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
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
        setSyncTime(new Date().toLocaleString());
        toast.success('Bank connected successfully.');
      } finally {
        setIsConnecting(false);
        setLinkToken(null);
        openedRef.current = false;
      }
    },
    [connectBank],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => {
      setLinkToken(null);
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
    const res = await createPlaidLinkToken();
    if ('error' in res) {
      toast.error(res.error);
      setIsConnecting(false);
      return;
    }
    setLinkToken(res.link_token);
    setIsConnecting(false);
  };

  const displayName = plaidInstitutionName?.trim() || 'Connected bank';

  return (
    <div className="bg-surface-elevated rounded-sm border border-surface-border p-6">
      <div className="mb-6">
        <h3 className="text-xs font-mono uppercase tracking-widest text-content-primary">Data Sources</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Connect your bank with Plaid. Credentials stay with Plaid; we store a secure access token on the server
          only.
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
        <div className="bg-surface-base border border-surface-border rounded-sm p-4">
          <div className="flex items-center justify-between">
            <div className="font-mono text-sm text-content-primary">
              [STATUS: <span className="text-emerald-400 animate-pulse">ACTIVE</span>] {displayName}
            </div>
          </div>
          <div className="mt-2 text-xs font-mono text-zinc-500">
            {syncTime ? `LAST SYNC: ${syncTime}` : 'Linked — automatic transaction import can be enabled in a future update.'}
          </div>
        </div>
      )}
    </div>
  );
}
