import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  Camera, CheckCircle2, AlertCircle, Loader2, 
  ShieldCheck, Zap, WifiOff, RefreshCw 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export default function MobileCapture() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('id');
  const token = searchParams.get('t');
  
  const [status, setStatus] = useState<'idle' | 'capturing' | 'uploading' | 'completed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem(`pending_upload_${sessionId}`);
    if (cached) {
      setPreviewUrl(cached);
      setStatus('capturing');
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !token) {
       setStatus('error');
       setError('Invalid or missing capture session.');
       return;
    }
  }, [sessionId, token]);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreviewUrl(base64);
        localStorage.setItem(`pending_upload_${sessionId}`, base64);
      };
      reader.readAsDataURL(file);
      setStatus('capturing');
    }
  };

  const handeUpload = async () => {
    const activeImage = capturedImage || (previewUrl ? dataURLtoFile(previewUrl, 'recovered_scan.jpg') : null);
    if (!activeImage || !sessionId) return;
    
    setStatus('uploading');
    try {
      const { data: session, error: sessionErr } = await supabase
        .from('document_capture_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single();
        
      if (sessionErr || !session) throw new Error('Session not found or expired.');

      const userId = session.user_id;
      const fileName = `mobile_scan_${Date.now()}.jpg`;
      const filePath = `incoming/${sessionId}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('scans')
        .upload(filePath, activeImage, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadErr) throw uploadErr;

      const { error: updateErr } = await supabase
        .from('document_capture_sessions')
        .update({ 
          status: 'completed',
          uploaded_file_url: filePath 
        })
        .eq('id', sessionId);

      if (updateErr) throw updateErr;

      // New persistable Ingestion Inbox entry
      await supabase.from('pending_ingestions').insert({
        user_id: userId,
        status: 'uploading',
        source: 'mobile',
        storage_path: filePath,
        type: 'bill'
      });

      localStorage.removeItem(`pending_upload_${sessionId}`);
      setStatus('completed');
      toast.success('Document uploaded to your dashboard.');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setError(err.message || 'Transmission failed. Ensure you are online.');
    }
  };

  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#08090A] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2 uppercase font-mono tracking-widest">Capture Failed</h1>
        <p className="text-zinc-500 text-[10px] font-mono mb-8 uppercase tracking-[0.1em]">{error || 'Network error or session expired.'}</p>
        <button onClick={() => window.location.reload()} className="w-full max-w-xs py-4 bg-zinc-800 text-white rounded-none text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
           <RefreshCw className="w-4 h-4" /> [Retry_Sync]
        </button>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="min-h-screen bg-[#08090A] flex flex-col items-center justify-center p-8 text-center">
        <div className="relative mb-8">
           <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
           <CheckCircle2 className="w-20 h-20 text-emerald-500 relative" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 uppercase tracking-tighter">Uplink Successful</h1>
        <p className="text-zinc-500 text-[11px] font-mono mb-10 uppercase tracking-[0.2em] leading-relaxed">
          Document packet transmitted.<br/>Verification active on desktop.
        </p>
        <div className="w-full max-w-xs h-1 bg-surface-border rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 w-full animate-progress-once" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090A] flex flex-col font-sans">
      <div className="shrink-0 h-16 border-b border-white/[0.05] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-violet animate-pulse shadow-glow-indigo" />
          <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-[0.2em]">Live Mobile Uplink</span>
        </div>
        <div className="text-[9px] font-mono text-zinc-700 uppercase">SYS_LOG: {sessionId?.slice(0, 8)}</div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        <div className="w-full max-w-sm flex flex-col text-center">
          {!previewUrl ? (
            <div className="space-y-10">
              <div className="p-14 bg-surface-base border border-dashed border-white/[0.1] rounded-sm relative group active:scale-[0.98] transition-all">
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handleCapture}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-brand-indigo/5 border border-brand-violet/20 flex items-center justify-center group-hover:scale-110 group-hover:border-brand-violet/40 transition-all relative">
                      <div className="absolute -top-3 -left-3 w-6 h-6 border-t border-l border-brand-violet/40"></div>
                      <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b border-r border-brand-violet/40"></div>
                      <Camera className="w-10 h-10 text-brand-violet" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-white font-bold text-xl uppercase tracking-tighter">Capture Protocol</p>
                    <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-[0.3em]">Ready for visual ingestion</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-px bg-white/[0.05] border border-white/[0.05]">
                 <div className="flex items-center gap-4 p-4 bg-surface-base">
                    <ShieldCheck className="w-4 h-4 text-brand-indigo" />
                    <div className="text-left">
                       <p className="text-[10px] font-mono font-bold text-zinc-300 uppercase">Edge Alignment</p>
                       <p className="text-[9px] font-mono text-zinc-600 uppercase">Active scanning enabled</p>
                    </div>
                 </div>
              </div>

              <div className="text-[8px] font-mono text-zinc-700 uppercase tracking-[0.5em] flex items-center justify-center gap-4">
                <div className="w-8 h-[1px] bg-zinc-800"></div>
                UPLINK_READY_4.0
                <div className="w-8 h-[1px] bg-zinc-800"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
               <div className="relative aspect-[3/4] w-full bg-surface-raised border border-white/[0.1] p-1.5 rounded-sm overflow-hidden shadow-2xl">
                 <img src={previewUrl} alt="Preview" className="w-full h-full object-cover grayscale brightness-110 contrast-125" />
                 
                 <div className="absolute inset-6 border border-brand-violet/30 pointer-events-none">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-brand-violet"></div>
                    <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-brand-violet"></div>
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-brand-violet"></div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-brand-violet"></div>
                    <div className="absolute top-3 left-3 text-[7px] font-mono text-brand-violet uppercase bg-black/60 px-1 font-bold">GRID_ALIGN_FIX</div>
                 </div>

                 {status === 'uploading' && (
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-brand-violet shadow-[0_0_15px_#8b5cf6] animate-scan-y z-20"></div>
                 )}
               </div>

               <div className="flex flex-col gap-3">
                  <button 
                    onClick={handeUpload}
                    disabled={status === 'uploading'}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 text-white py-5 rounded-none font-mono font-bold uppercase tracking-widest text-[12px] shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-3 group transition-all"
                  >
                    {status === 'uploading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        INITIATING UPLINK...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 group-hover:animate-pulse" />
                        Execute Sync
                      </>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => { 
                        localStorage.removeItem(`pending_upload_${sessionId}`);
                        setPreviewUrl(null); 
                        setStatus('idle'); 
                    }}
                    disabled={status === 'uploading'}
                    className="w-full py-4 text-zinc-600 hover:text-white transition-colors text-[9px] font-mono font-bold uppercase tracking-[0.4em]"
                  >
                    [Cancel_Packet]
                  </button>
               </div>
            </div>
          )}
        </div>
      </main>

      <div className="shrink-0 p-10 border-t border-white/[0.03] text-center opacity-40">
        <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-[0.6em]">Encrypted Data Stream // Oweable Financial Core</span>
      </div>
    </div>
  );
}
