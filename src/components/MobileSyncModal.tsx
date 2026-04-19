import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import {
  X, Smartphone, Loader2, CheckCircle2,
  AlertTriangle, ShieldCheck, Zap
} from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface MobileSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MobileSyncModal({ isOpen, onClose, onSuccess }: MobileSyncModalProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'generating' | 'waiting' | 'active' | 'completed' | 'expired'>('generating');
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      createSession();
    } else {
      setSessionId(null);
      setToken(null);
      setQrDataUrl(null);
      setStatus('generating');
      setError(null);
    }
  }, [isOpen]);

  // Generate QR code locally (no external requests — CSP safe)
  useEffect(() => {
    if (!sessionId || !token) return;
    const syncUrl = `${window.location.origin}/capture?id=${sessionId}&t=${token}`;
    QRCode.toDataURL(syncUrl, {
      width: 220,
      margin: 2,
      color: { dark: '#ffffff', light: '#09090b' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl).catch(() => setStatus('expired'));
  }, [sessionId, token]);

  // Listen for session updates
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`sync-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'document_capture_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          const newStatus = payload.new.status;
          if (newStatus === 'completed') {
            setStatus('completed');
            toast.success('Mobile Sync Pulse: New Document Received');
            setTimeout(() => {
              onSuccess?.();
              onClose();
            }, 2000);
          } else if (newStatus === 'active') {
            setStatus('active');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, onSuccess, onClose]);

  const createSession = async () => {
    setStatus('generating');
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const newToken = crypto.randomUUID();
      const { data, error: insertErr } = await supabase
        .from('document_capture_sessions')
        .insert({
          user_id: user.id,
          token: newToken,
          status: 'pending'
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      setSessionId(data.id);
      setToken(newToken);
      setStatus('waiting');
    } catch (err: any) {
      setError(err.message);
      setStatus('expired');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[60]">
      <div className="fixed inset-0 bg-black/95" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-xl w-full bg-surface-raised border border-surface-border rounded-lg shadow-2xl overflow-hidden relative group">
          <div className="flex h-full flex-col md:flex-row">
            {/* Left Panel: Instructions */}
            <div className="w-full md:w-2/5 p-8 border-r border-surface-border bg-surface-base flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full border border-content-primary/15 flex items-center justify-center bg-content-primary/[0.05]">
                    <Smartphone className="w-4 h-4 text-content-secondary" />
                  </div>
                  <Dialog.Title className="text-sm font-bold text-content-primary uppercase tracking-widest font-mono">Mobile Sync</Dialog.Title>
                </div>
                
                <h2 className="text-2xl font-bold text-content-primary mb-4 uppercase tracking-tighter leading-tight font-sans">
                  Handoff to Phone
                </h2>
                
                <div className="space-y-6">
                   <div className="flex gap-4">
                      <div className="shrink-0 w-5 h-5 rounded-full border border-surface-border flex items-center justify-center text-[10px] font-mono text-content-tertiary">1</div>
                      <p className="text-[11px] text-content-tertiary font-sans leading-relaxed uppercase tracking-wider">Open phone camera</p>
                   </div>
                   <div className="flex gap-4">
                      <div className="shrink-0 w-5 h-5 rounded-full border border-surface-border flex items-center justify-center text-[10px] font-mono text-content-tertiary">2</div>
                      <p className="text-[11px] text-content-tertiary font-sans leading-relaxed uppercase tracking-wider">Scan QR to bridge link</p>
                   </div>
                   <div className="flex gap-4">
                      <div className="shrink-0 w-5 h-5 rounded-full border border-surface-border flex items-center justify-center text-[10px] font-mono text-content-tertiary">3</div>
                      <p className="text-[11px] text-content-tertiary font-sans leading-relaxed uppercase tracking-wider">Upload to Review Inbox</p>
                   </div>
                </div>
              </div>

              <div className="mt-8">
                 <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span className="text-[9px] font-mono text-content-muted uppercase tracking-widest">Secure connection</span>
                 </div>
                 <div className="w-full h-0.5 bg-surface-border rounded-full overflow-hidden">
                    <div className={cn("h-full bg-content-primary/60 transition-all duration-300", status === 'waiting' ? 'w-1/3' : status === 'active' ? 'w-2/3' : status === 'completed' ? 'w-full' : 'w-0')} />
                 </div>
              </div>
            </div>

            {/* Right Panel: QR Display */}
            <div className="flex-1 p-10 flex flex-col items-center justify-center bg-surface-raised relative">
               <button type="button" aria-label="Close mobile sync" onClick={onClose} className="focus-app absolute right-4 top-4 rounded text-content-muted transition-colors hover:text-content-primary">
                 <X className="w-5 h-5" />
               </button>

               <AnimatePresence mode="wait">
                  {status === 'generating' ? (
                    <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
                      <Loader2 className="w-8 h-8 text-content-secondary animate-spin" />
                      <p className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest">Preparing secure link…</p>
                    </motion.div>
                  ) : (
                    <motion.div key="ready" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center max-w-[250px] w-full">
                       <div className="relative group/qr p-3 bg-surface-raised border border-surface-border shadow-2xl">
                          {status === 'waiting' ? (
                             qrDataUrl
                               ? <img src={qrDataUrl} alt="QR Code" className="w-[200px] h-[200px] rounded-lg" />
                               : <div className="w-[200px] h-[200px] flex items-center justify-center"><Loader2 className="w-6 h-6 text-content-secondary animate-spin" /></div>
                          ) : (
                             <div className="w-[200px] h-[200px] flex flex-col items-center justify-center bg-content-primary/[0.04] gap-3 border-4 border-content-primary/15 animate-pulse">
                                <Zap className={`w-8 h-8 ${status === 'completed' ? 'text-content-primary' : 'text-emerald-400'}`} />
                                <span className={`text-[9px] font-mono font-bold uppercase tracking-widest text-center ${status === 'completed' ? 'text-content-primary' : 'text-emerald-400'}`}>
                                   {status === 'completed' ? 'RECEIVING DATA' : 'SESSION ACTIVE'}
                                </span>
                             </div>
                          )}
                          
                          <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-content-primary/40"></div>
                          <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-content-primary/40"></div>
                       </div>
                       
                       <div className="mt-8 text-center min-h-[50px] flex flex-col items-center justify-center">
                          {status === 'waiting' && <p className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest leading-relaxed">Scan to upload document.</p>}
                          {status === 'active' && <p className="text-[10px] font-mono text-emerald-400 animate-pulse uppercase tracking-[0.2em] leading-relaxed">📱 Phone connected... waiting for photo.</p>}
                          {status === 'completed' && <p className="text-[10px] font-mono text-content-secondary animate-pulse uppercase tracking-[0.2em] leading-relaxed">Receiving document...</p>}
                       </div>
                    </motion.div>
                  )}
               </AnimatePresence>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
