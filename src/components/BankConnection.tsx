import React, { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Lock, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';

export default function BankConnection() {
  const { bankConnected, connectBank } = useStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncTime, setSyncTime] = useState<string | null>(null);
  const [institutionName, setInstitutionName] = useState<string>('Connected Bank');

  const onSuccess = async (public_token: string, metadata: any) => {
    setIsConnecting(true);
    const name = metadata?.institution?.name;
    if (name) setInstitutionName(name);
    await connectBank(); // Hydrates global state and persists to Supabase
    setSyncTime('JUST NOW');
    toast.success('Bank connected successfully. Data hydrated.');
    setIsConnecting(false);
  };

  // In a production environment, you would retrieve a real link token from the backend
  const { open, ready } = usePlaidLink({
    token: 'link-token-placeholder', // Replace with real token
    onSuccess,
  });

  const handleConnectClick = () => {
    // Normally, this calls pure `open()` from usePlaidLink. 
    // We will simulate success for the demo flow until the token service is online.
    setIsConnecting(true);
    setTimeout(() => {
      onSuccess('public-token', { institution: { name: 'Bank' } });
    }, 500);
  };

  return (
    <div className="bg-surface-elevated rounded-sm border border-surface-border p-6">
      <div className="mb-6">
        <h3 className="text-xs font-mono uppercase tracking-widest text-content-primary">Data Sources</h3>
        <p className="mt-1 text-sm text-zinc-400">Connect your financial institutions for live data sync.</p>
      </div>

      {!bankConnected ? (
        <div className="flex flex-col items-start">
          <button
            onClick={handleConnectClick}
            disabled={isConnecting}
            className="bg-content-primary text-black hover:bg-zinc-200 font-bold px-6 py-3 rounded-sm flex items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-mono text-sm tracking-widest">INITIALIZING SECURE HANDSHAKE...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span className="font-mono text-sm tracking-widest">SECURE CONNECTION VIA PLAID</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="bg-surface-base border border-surface-border rounded-sm p-4">
          <div className="flex items-center justify-between">
            <div className="font-mono text-sm text-content-primary">
              [STATUS: <span className="text-emerald-400 animate-pulse">ACTIVE</span>] {institutionName}
            </div>
          </div>
          <div className="mt-2 text-xs font-mono text-zinc-500">
            LAST SYNC: {syncTime}
          </div>
        </div>
      )}
    </div>
  );
}
