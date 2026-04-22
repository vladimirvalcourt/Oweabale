import React, { useState, useEffect, useMemo, startTransition } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Camera, CheckCircle2, AlertCircle, Loader2,
  ShieldCheck, Zap, RefreshCw, X, ArrowRight,
  Sun, Maximize, MousePointer2, Smartphone, FolderOpen
} from 'lucide-react';
import { createCaptureSupabaseClient } from '../lib/supabaseCaptureClient';
import { toast } from 'sonner';
import { validateIngestionFile, safeExtFromMime } from '../lib/security';
import { yieldForPaint } from '../lib/interaction';

export default function MobileCapture() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('id');
  const token = searchParams.get('t');

  /** Anon client + `x-session-token` header so RLS can authorize capture rows without USING(true). */
  const captureDb = useMemo(
    () => (token ? createCaptureSupabaseClient(token) : null),
    [token]
  );
  
  const [status, setStatus] = useState<'idle' | 'capturing' | 'uploading' | 'completed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [guidanceText, setGuidanceText] = useState('Position document within the guides');
  const [capturedFileType, setCapturedFileType] = useState<string>('image/jpeg');

  useEffect(() => {
    // Use sessionStorage (not localStorage) so captured images
    // are not persisted beyond the browser tab's lifetime.
    const cached = sessionStorage.getItem(`pending_upload_${sessionId}`);
    if (cached) {
      setPreviewUrl(cached);
      // Derive MIME type from the stored data URL so the upload uses the correct content type
      const mime = cached.match(/^data:([^;]+);/)?.[1] ?? 'image/jpeg';
      setCapturedFileType(mime);
      setStatus('capturing');
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !token || !captureDb) {
       setStatus('error');
       setError('Invalid or missing capture session.');
       return;
    }

    // Validate token against the DB before doing anything.
    // RLS matches `x-session-token` header to row token; .eq filters are defense in depth.
    const signalActiveScan = async () => {
      const { data: sessionRow, error: tokenErr } = await captureDb
        .from('document_capture_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('token', token)
        .single();

      if (tokenErr || !sessionRow) {
        setStatus('error');
        setError('This link is invalid or expired. Please scan a new QR code from your computer.');
        return;
      }

      await captureDb
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
  }, [sessionId, token, captureDb, status, previewUrl]);

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
      setCapturedFileType(file.type);
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

  const handleUpload = async () => {
    const activeImage = capturedImage || (previewUrl ? dataURLtoFile(previewUrl) : null);
    if (!activeImage || !sessionId || !token || !captureDb) return;

    setStatus('uploading');
    await yieldForPaint();
    try {
      // Re-validate token on upload — prevents forged requests
      const { data: session, error: sessionErr } = await captureDb
        .from('document_capture_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .eq('token', token)
        .single();

      if (sessionErr || !session) throw new Error('Session not found or token is invalid.');

      const userId = session.user_id;
      const ext = safeExtFromMime(activeImage.type);
      const fileName = `mobile_scan_${Date.now()}.${ext}`;
      const filePath = `incoming/${sessionId}/${fileName}`;

      // Use capture-scoped client so `x-session-token` is sent; storage RLS can match the QR session.
      const { error: uploadErr } = await captureDb.storage
        .from('scans')
        .upload(filePath, activeImage, {
          contentType: activeImage.type,
          upsert: true
        });

      if (uploadErr) throw uploadErr;

      // MUST insert before marking the session `completed`. Anon RLS on `pending_ingestions`
      // requires `document_capture_sessions.status IN ('idle','pending','active')`.
      const { error: insertErr } = await captureDb.from('pending_ingestions').insert({
        user_id: userId,
        token,
        status: 'uploading',
        source: 'mobile',
        storage_path: filePath,
        type: 'bill'
      });

      if (insertErr) throw insertErr;

      const { error: updateErr } = await captureDb
        .from('document_capture_sessions')
        .update({
          status: 'completed',
          uploaded_file_url: filePath
        })
        .eq('id', sessionId);

      if (updateErr) throw updateErr;

      sessionStorage.removeItem(`pending_upload_${sessionId}`);
      setStatus('completed');
    } catch (err: unknown) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : 'Upload failed. Ensure you are online.';
      setError(msg);
    }
  };

  const dataURLtoFile = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const ext = safeExtFromMime(mime);
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], `recovered_scan.${ext}`, { type: mime });
  };

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base p-8 text-center font-sans">
        <AlertCircle className="mb-6 h-12 w-12 text-rose-500" />
        <h1 className="mb-2 text-2xl font-medium tracking-tight text-content-primary">Connection error</h1>
        <p className="mb-10 max-w-sm text-sm font-medium leading-relaxed text-content-secondary">
          {error || 'This session has expired. Please refresh the QR code on your desktop.'}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex w-full max-w-xs items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-raised py-3.5 text-sm font-medium text-content-primary transition-colors hover:bg-surface-elevated active:scale-[0.99]"
        >
          <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
          Restart session
        </button>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base p-8 text-center font-sans">
        <div className="relative mb-8">
           <div className="absolute inset-0 animate-pulse rounded-full bg-emerald-500/20 blur-2xl" />
           <CheckCircle2 className="relative h-24 w-24 text-emerald-500" />
        </div>
        <h1 className="mb-2 text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">Sent</h1>
        <p className="mb-12 max-w-[280px] text-sm font-medium leading-relaxed text-content-secondary">
          Your document is now being processed in your Review Inbox.<br /><br />
          You can put your phone away; your desktop dashboard has been updated.
        </p>
        
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button 
            type="button"
            onClick={() => { setPreviewUrl(null); setStatus('idle'); }}
            className="w-full rounded-lg bg-brand-cta py-3.5 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover active:scale-[0.99]"
          >
            Capture another
          </button>
          <button 
            type="button"
            onClick={() => startTransition(() => navigate('/'))}
            className="w-full py-3 text-sm font-medium text-content-tertiary transition-colors hover:text-content-primary"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col bg-surface-base font-sans">
      {/* Dynamic Header */}
      <div className="flex h-20 shrink-0 items-center justify-between border-b border-surface-border bg-surface-base px-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-content-primary">Syncing to Oweable desktop</span>
          <div className="flex items-center gap-1.5">
             <div className="h-1 w-1 animate-pulse rounded-full bg-emerald-500 shadow-glow-emerald" />
             <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400/90">Secure connection active</span>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised">
           <Smartphone className="h-4 w-4 text-content-tertiary" aria-hidden />
        </div>
      </div>

      <main className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain scrollbar-hide px-6 py-6 sm:px-12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative mx-auto flex w-full max-w-sm flex-col">
          {!previewUrl ? (
            <div className="flex flex-col h-full">
              {/* Instructions Section */}
              <div className="space-y-8 mt-4">
                 <div className="flex gap-5 group">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-content-primary/5 border border-content-primary/10 flex items-center justify-center group-hover:border-content-primary/50 transition-colors">
                       <Sun className="w-4 h-4 text-content-tertiary group-hover:text-content-primary" />
                    </div>
                    <div className="space-y-1">
                       <p className="text-xs font-medium text-content-primary">1. Position</p>
                       <p className="text-xs leading-relaxed text-content-secondary">Place document on a flat, dark surface with good lighting.</p>
                    </div>
                 </div>
                 <div className="flex gap-5 group text-left">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-content-primary/5 border border-content-primary/10 flex items-center justify-center group-hover:border-content-primary/50 transition-colors">
                       <Maximize className="w-4 h-4 text-content-tertiary group-hover:text-content-primary" />
                    </div>
                    <div className="space-y-1">
                       <p className="text-xs font-medium text-content-primary">2. Align</p>
                       <p className="text-xs leading-relaxed text-content-secondary">Frame the document within the onscreen guides.</p>
                    </div>
                 </div>
                 <div className="flex gap-5 group text-left">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-content-primary/5 border border-content-primary/10 flex items-center justify-center group-hover:border-content-primary/50 transition-colors">
                       <MousePointer2 className="w-4 h-4 text-content-tertiary group-hover:text-content-primary" />
                    </div>
                    <div className="space-y-1">
                       <p className="text-xs font-medium text-content-primary">3. Capture</p>
                       <p className="text-xs leading-relaxed text-content-secondary">System snaps automatically when aligned, or you can tap.</p>
                    </div>
                 </div>
              </div>

              {/* Capture Options */}
              <div className="mt-auto mb-8 flex flex-col gap-4">
                {/* Option 1: Take Photo with Camera */}
                <div className="relative p-10 bg-surface-base border border-dashed border-content-primary/[0.1] rounded-lg group active:scale-[0.98] transition-all overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCapture}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex items-center gap-5 relative z-1">
                    <div className="w-14 h-14 rounded-full bg-content-primary/[0.05] border border-content-primary/20 flex items-center justify-center group-hover:border-content-primary/35 transition-all shrink-0">
                      <Camera className="w-6 h-6 text-content-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-content-primary">Take photo</p>
                      <p className="mt-1 text-xs text-content-secondary">Open camera and snap the document</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-content-primary/[0.03] to-transparent animate-scan-y opacity-50 pointer-events-none" />
                </div>

                {/* Option 2: Upload from Gallery or Files */}
                <div className="relative p-10 bg-surface-base border border-dashed border-content-primary/[0.1] rounded-lg group active:scale-[0.98] transition-all overflow-hidden">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    onChange={handleCapture}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex items-center gap-5 relative z-1">
                    <div className="w-14 h-14 rounded-full bg-content-primary/[0.03] border border-content-primary/10 flex items-center justify-center group-hover:border-content-primary/20 transition-all shrink-0">
                      <FolderOpen className="w-6 h-6 text-content-tertiary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-content-primary">Upload from device</p>
                      <p className="mt-1 text-xs text-content-secondary">Choose from gallery, files, or PDFs</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col space-y-6 py-2 animate-in slide-in-from-bottom-8 duration-700">
              {/* Guidance HUD */}
              <div className="text-center">
                 <p className="animate-pulse text-xs font-medium text-content-secondary">
                    {guidanceText}
                 </p>
              </div>

               <div className="relative flex min-h-[min(52vh,22rem)] w-full flex-1 flex-col overflow-hidden rounded-lg border border-content-primary/[0.12] bg-surface-base shadow-2xl">
                 {capturedFileType === 'application/pdf' ? (
                   <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 bg-surface-base p-6">
                     <div className="w-20 h-20 rounded-lg border border-content-primary/30 bg-content-primary/5 flex items-center justify-center">
                       <FolderOpen className="w-10 h-10 text-content-primary" />
                     </div>
                     <p className="text-xs font-medium text-content-secondary">PDF ready to send</p>
                   </div>
                 ) : (
                   <div className="flex min-h-0 flex-1 items-center justify-center p-2 sm:p-3">
                     <img
                       src={previewUrl!}
                       alt="Preview"
                       className="max-h-[min(52vh,26rem)] w-full object-contain object-center contrast-[1.03]"
                     />
                   </div>
                 )}

                 {/* Light frame — inset so it does not cover document text */}
                 <div className="pointer-events-none absolute inset-2 rounded-md border border-content-primary/25 sm:inset-3" aria-hidden />

                 {status === 'uploading' && (
                    <div className="absolute top-0 left-0 z-20 h-[2px] w-full bg-brand-cta shadow-[0_0_20px_rgba(255,255,255,0.2)] animate-scan-y" />
                 )}
               </div>

               <div className="flex flex-col gap-4 mt-auto">
                  <button 
                    onClick={handleUpload}
                    disabled={status === 'uploading'}
                    className="flex w-full items-center justify-center gap-3 rounded-lg bg-brand-cta py-4 text-sm font-medium text-surface-base shadow-none transition-all hover:bg-brand-cta-hover active:scale-[0.98] disabled:bg-surface-raised disabled:text-content-tertiary"
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
                        sessionStorage.removeItem(`pending_upload_${sessionId}`);
                        setPreviewUrl(null);
                        setStatus('idle');
                    }}
                    disabled={status === 'uploading'}
                    className="w-full rounded-lg border border-surface-border bg-surface-raised py-3.5 text-sm font-medium text-content-secondary transition-colors hover:border-content-muted hover:text-content-primary"
                  >
                    Retake Photo
                  </button>
               </div>
            </div>
          )}
        </div>
      </main>

      <div className="shrink-0 border-t border-surface-border bg-surface-base p-6 text-center">
        <span className="text-xs font-medium text-content-tertiary">Secure capture session</span>
      </div>
    </div>
  );
}
