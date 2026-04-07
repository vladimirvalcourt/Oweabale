import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Camera, CheckCircle2, AlertCircle, Loader2,
  ShieldCheck, Zap, RefreshCw, X, ArrowRight,
  Sun, Maximize, MousePointer2, Smartphone, FolderOpen
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { validateIngestionFile } from '../lib/security';

export default function MobileCapture() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('id');
  const token = searchParams.get('t');
  
  const [status, setStatus] = useState<'idle' | 'capturing' | 'uploading' | 'completed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [guidanceText, setGuidanceText] = useState('Position document within the guides');

  useEffect(() => {
    // Use sessionStorage (not localStorage) so captured images
    // are not persisted beyond the browser tab's lifetime.
    const cached = sessionStorage.getItem(`pending_upload_${sessionId}`);
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

    // Validate token against the DB before doing anything.
    // The query includes .eq('token', token) so if the token in the URL
    // doesn't match what's stored, the row returns null and we abort.
    const signalActiveScan = async () => {
      const { data: sessionRow, error: tokenErr } = await supabase
        .from('document_capture_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('token', token)
        .single();

      if (tokenErr || !sessionRow) {
        setStatus('error');
        setError('Session not found or token is invalid. Please scan a new QR code.');
        return;
      }

      await supabase
        .from('document_capture_sessions')
        .update({ status: 'active' })
        .eq('id', sessionId)
        .eq('token', token);
    };
    signalActiveScan();
    
    // Simulate dynamic guidance
    if (status === 'capturing' && !previewUrl) {
      const tips = [
        "Looking for document edges...",
        "Hold still... focusing.",
        "Ensure good lighting for OCR",
        "Avoid glares on the surface"
      ];
      let i = 0;
      const interval = setInterval(() => {
        setGuidanceText(tips[i % tips.length]);
        i++;
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [sessionId, token, status, previewUrl]);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateIngestionFile(file);
      if (!validation.ok) {
        toast.error(validation.error);
        e.target.value = '';
        return;
      }
      setCapturedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreviewUrl(base64);
        sessionStorage.setItem(`pending_upload_${sessionId}`, base64);
      };
      reader.readAsDataURL(file);
      setStatus('capturing');
      setGuidanceText('Clear scan captured!');
    }
  };

  const handeUpload = async () => {
    const activeImage = capturedImage || (previewUrl ? dataURLtoFile(previewUrl, 'recovered_scan.jpg') : null);
    if (!activeImage || !sessionId || !token) return;

    setStatus('uploading');
    try {
      // Re-validate token on upload — prevents forged requests
      const { data: session, error: sessionErr } = await supabase
        .from('document_capture_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .eq('token', token)
        .single();

      if (sessionErr || !session) throw new Error('Session not found or token is invalid.');

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

      await supabase.from('pending_ingestions').insert({
        user_id: userId,
        status: 'uploading',
        source: 'mobile',
        storage_path: filePath,
        type: 'bill'
      });

      sessionStorage.removeItem(`pending_upload_${sessionId}`);
      setStatus('completed');
    } catch (err: unknown) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : 'Transmission failed. Ensure you are online.';
      setError(msg);
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
      <div className="min-h-screen bg-[#08090A] flex flex-col items-center justify-center p-8 text-center font-sans">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-6" />
        <h1 className="text-xl font-bold text-white mb-3 uppercase tracking-widest font-mono">Uplink Error</h1>
        <p className="text-zinc-500 text-xs mb-10 uppercase tracking-widest leading-relaxed">
          {error || 'The session has reached its lifecycle limit. Please refresh the QR code on your desktop.'}
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="w-full py-4 bg-zinc-900 border border-white/10 text-white font-mono text-[10px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <RefreshCw className="w-4 h-4" /> [Restart_Session]
        </button>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="min-h-screen bg-[#08090A] flex flex-col items-center justify-center p-8 text-center font-sans">
        <div className="relative mb-8">
           <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
           <CheckCircle2 className="w-24 h-24 text-emerald-500 relative" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 uppercase tracking-tighter">✅ Sent!</h1>
        <p className="text-zinc-500 text-[11px] font-mono mb-12 uppercase tracking-[0.2em] leading-relaxed max-w-[280px]">
          Your document is now being processed in your Review Inbox.<br/><br/>
          You can put your phone away; your desktop dashboard has been updated.
        </p>
        
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={() => { setPreviewUrl(null); setStatus('idle'); }}
            className="w-full py-5 bg-brand-violet text-white font-mono text-[10px] font-bold uppercase tracking-[0.3em] shadow-lg shadow-brand-violet/20 active:scale-95 transition-all"
          >
            Capture Another
          </button>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 text-zinc-500 hover:text-white font-mono text-[9px] font-bold uppercase tracking-[0.4em] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090A] flex flex-col font-sans">
      {/* Dynamic Header */}
      <div className="shrink-0 h-20 border-b border-white/[0.05] px-6 flex items-center justify-between bg-surface-base">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-white uppercase tracking-tight">Syncing to Oweable Desktop</span>
          <div className="flex items-center gap-1.5">
             <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-glow-emerald animate-pulse" />
             <span className="text-[8px] font-mono text-emerald-500/80 font-bold uppercase tracking-widest">Secure Connection Active</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5">
           <Smartphone className="w-4 h-4 text-zinc-500" />
        </div>
      </div>

      <main className="flex-1 flex flex-col p-6 sm:p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        <div className="w-full max-w-sm mx-auto flex flex-col h-full">
          {!previewUrl ? (
            <div className="flex flex-col h-full">
              {/* Instructions Section */}
              <div className="space-y-8 mt-4">
                 <div className="flex gap-5 group">
                    <div className="shrink-0 w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-brand-violet/50 transition-colors">
                       <Sun className="w-4 h-4 text-zinc-500 group-hover:text-brand-violet" />
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">1. Position</p>
                       <p className="text-[9px] font-mono text-zinc-600 uppercase leading-relaxed">Place document on a flat, dark surface with good lighting.</p>
                    </div>
                 </div>
                 <div className="flex gap-5 group text-left">
                    <div className="shrink-0 w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-brand-violet/50 transition-colors">
                       <Maximize className="w-4 h-4 text-zinc-500 group-hover:text-brand-violet" />
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">2. Align</p>
                       <p className="text-[9px] font-mono text-zinc-600 uppercase leading-relaxed">Frame the document within the onscreen guides.</p>
                    </div>
                 </div>
                 <div className="flex gap-5 group text-left">
                    <div className="shrink-0 w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-brand-violet/50 transition-colors">
                       <MousePointer2 className="w-4 h-4 text-zinc-500 group-hover:text-brand-violet" />
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">3. Capture</p>
                       <p className="text-[9px] font-mono text-zinc-600 uppercase leading-relaxed">System snaps automatically when aligned, or you can tap.</p>
                    </div>
                 </div>
              </div>

              {/* Capture Options */}
              <div className="mt-auto mb-8 flex flex-col gap-4">
                {/* Option 1: Take Photo with Camera */}
                <div className="relative p-10 bg-surface-base border border-dashed border-white/[0.1] rounded-sm group active:scale-[0.98] transition-all overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCapture}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex items-center gap-5 relative z-1">
                    <div className="w-14 h-14 rounded-full bg-brand-indigo/5 border border-brand-violet/20 flex items-center justify-center group-hover:border-brand-violet/40 transition-all shrink-0">
                      <Camera className="w-6 h-6 text-brand-violet" />
                    </div>
                    <div>
                      <p className="text-[11px] font-mono font-bold text-white uppercase tracking-widest">Take Photo</p>
                      <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mt-1">Open camera and snap the document</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-violet/[0.03] to-transparent animate-scan-y opacity-50 pointer-events-none" />
                </div>

                {/* Option 2: Upload from Gallery or Files */}
                <div className="relative p-10 bg-surface-base border border-dashed border-white/[0.1] rounded-sm group active:scale-[0.98] transition-all overflow-hidden">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    onChange={handleCapture}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex items-center gap-5 relative z-1">
                    <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-all shrink-0">
                      <FolderOpen className="w-6 h-6 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-[11px] font-mono font-bold text-white uppercase tracking-widest">Upload from Device</p>
                      <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mt-1">Choose from gallery, files, or PDFs</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700 h-full flex flex-col py-4">
              {/* Guidance HUD */}
              <div className="text-center">
                 <p className="text-[10px] font-mono text-brand-violet font-bold uppercase tracking-[0.3em] animate-pulse">
                    [ {guidanceText} ]
                 </p>
              </div>

               <div className="relative aspect-[3/4] w-full bg-surface-raised border border-white/[0.12] p-1.5 rounded-sm overflow-hidden shadow-2xl flex-1">
                 <img src={previewUrl} alt="Preview" className="w-full h-full object-cover grayscale brightness-110 contrast-125" />
                 
                 {/* Visual Viewfinder Overlay */}
                 <div className="absolute inset-8 border border-white/20 pointer-events-none">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-violet"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand-violet"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-brand-violet"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand-violet"></div>
                 </div>

                 {status === 'uploading' && (
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-violet shadow-[0_0_20px_#7c3aed] animate-scan-y z-20"></div>
                 )}
               </div>

               <div className="flex flex-col gap-4 mt-auto">
                  <button 
                    onClick={handeUpload}
                    disabled={status === 'uploading'}
                    className="w-full bg-brand-violet hover:bg-indigo-500 disabled:bg-zinc-900 text-white py-5 rounded-none font-mono font-bold uppercase tracking-widest text-[11px] shadow-xl shadow-brand-violet/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                  >
                    {status === 'uploading' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Transmitting...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Send to Dashboard
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
                    className="w-full py-4 bg-white/5 border border-white/5 text-zinc-500 hover:text-white transition-all text-[9px] font-mono font-bold uppercase tracking-[0.4em]"
                  >
                    [ Retake ]
                  </button>
               </div>
            </div>
          )}
        </div>
      </main>

      <div className="shrink-0 p-8 border-t border-white/[0.03] text-center bg-surface-base">
        <span className="text-[7px] font-mono text-zinc-700 uppercase tracking-[0.8em]">Secure Uplink Core 4.02</span>
      </div>
    </div>
  );
}
