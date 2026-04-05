import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function DeviceGuard({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      // Standard mobile breakpoint: 768px
      setIsMobile(window.innerWidth < 768);
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center p-6 text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        </div>

        <div className="relative z-10 max-w-sm w-full border border-surface-border bg-surface-raised p-8 rounded-sm shadow-2xl">
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 border border-surface-border rounded-sm flex items-center justify-center bg-surface-base">
              <Smartphone className="w-8 h-8 text-rose-500 animate-pulse" />
            </div>
          </div>

          <h1 className="text-xl font-mono font-bold tracking-[0.2em] text-content-primary uppercase mb-4">
            Interface Restricted
          </h1>
          
          <div className="text-left bg-surface-base border border-surface-border p-4 mb-6">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-amber-500" /> Screen Warning
            </p>
            <p className="text-xs font-mono text-zinc-300 leading-relaxed uppercase">
              The Oweable Web Interface is currently optimized for wide-format displays only. 
            </p>
          </div>

          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.15em] leading-loose mb-8">
            Access from mobile devices is locked while the dedicated native application is in final development phase.
          </p>

          <div className="pt-6 border-t border-surface-border">
            <div className="flex items-center gap-3 justify-center text-emerald-400">
              <Monitor className="w-4 h-4" />
              <span className="text-[9px] font-mono font-extrabold uppercase tracking-[0.3em]">Desktop Authorized</span>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-[9px] font-mono text-zinc-700 uppercase tracking-widest">
          Oweable Core v1.4.0 — Vault Status: Secure
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
