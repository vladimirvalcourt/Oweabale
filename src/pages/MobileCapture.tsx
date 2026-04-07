import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Camera, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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
      setPreviewUrl(URL.createObjectURL(file));
      setStatus('capturing');
    }
  };

  const handeUpload = async () => {
    if (!capturedImage || !sessionId) return;
    
    setStatus('uploading');
    try {
      // 1. Get Session Info to find user_id
      const { data: session, error: sessionErr } = await supabase
        .from('document_capture_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single();
        
      if (sessionErr || !session) throw new Error('Session not found or expired.');

      const userId = session.user_id;
      const fileName = `mobile_scan_${Date.now()}.jpg`;
      const filePath = `incoming/${sessionId}/${fileName}`;

      // 2. Upload to Storage
      // For this handoff, we use the 'incoming' folder which has a public INSERT policy
      // but is only readable by the session owner.
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('scans')
        .upload(filePath, capturedImage, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadErr) throw uploadErr;

      // 3. Update Session Status
      const { error: updateErr } = await supabase
        .from('document_capture_sessions')
        .update({ 
          status: 'completed',
          uploaded_file_url: filePath 
        })
        .eq('id', sessionId);

      if (updateErr) throw updateErr;

      // 4. Also insert into Review Inbox immediately (implied by the spec)
      await supabase.from('transactions').insert({
        user_id: userId,
        name: 'Mobile Scan Upload',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        category: 'Uncategorized',
        status: 'pending',
        type: 'expense'
      });

      setStatus('completed');
      toast.success('Document uploaded to your dashboard.');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setError(err.message || 'Failed to upload document.');
    }
  };

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#08090A] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Sync Error</h1>
        <p className="text-zinc-500 text-sm mb-6">{error || 'The session is invalid or has expired.'}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-zinc-800 text-white rounded-sm text-sm uppercase tracking-widest font-bold">Try Again</button>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="min-h-screen bg-[#08090A] flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-6" />
        <h1 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight">Sync Successful</h1>
        <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
          The document has been securely transferred to your Oweable dashboard. 
          You can now close this tab on your phone.
        </p>
        <div className="w-full h-1 bg-surface-border rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 w-full animate-progress-once" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090A] flex flex-col font-sans">
      {/* HUD Header */}
      <div className="shrink-0 h-16 border-b border-surface-border px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-brand-violet animate-pulse shadow-glow-indigo" />
          <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-[0.2em]">Live Mobile Uplink</span>
        </div>
        <div className="text-[9px] font-mono text-zinc-600">ID: {sessionId?.slice(0, 8)}...</div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Background Grids */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        
        <div className="w-full max-w-sm flex flex-col text-center">
          {!previewUrl ? (
            <>
              <div className="mb-8 p-12 bg-surface-raised border border-dashed border-surface-border rounded-sm relative group active:scale-95 transition-transform">
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handleCapture}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-brand-indigo/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-8 h-8 text-brand-violet" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-bold text-lg uppercase tracking-tight">Capture Document</p>
                    <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.1em]">Tap to start camera scan</p>
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest leading-relaxed">
                Ensure document is well lit<br />
                Avoid glare on glossy paper
              </div>
            </>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="relative aspect-[3/4] w-full bg-surface-raised border border-surface-border p-2 rounded-sm overflow-hidden shadow-2xl">
                 <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-sm grayscale contrast-125" />
                 <div className="absolute inset-0 border-[2px] border-emerald-500/30 pointer-events-none"></div>
                 {/* Scanning Line UI */}
                 {status === 'uploading' && (
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-emerald-500 shadow-glow-emerald animate-scan-y"></div>
                 )}
               </div>

               <div className="flex flex-col gap-3">
                  <button 
                    onClick={handeUpload}
                    disabled={status === 'uploading'}
                    className="w-full bg-brand-indigo hover:bg-brand-violet disabled:bg-zinc-800 text-white py-4 rounded-sm font-mono font-bold uppercase tracking-widest text-[12px] btn-tactile flex items-center justify-center gap-2"
                  >
                    {status === 'uploading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Transmitting...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Confirm & Send
                      </>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => { setPreviewUrl(null); setStatus('idle'); }}
                    disabled={status === 'uploading'}
                    className="w-full py-3 text-zinc-500 hover:text-white transition-colors text-[10px] font-mono font-bold uppercase tracking-[0.2em]"
                  >
                    [Retake_Photo]
                  </button>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Branded HUD */}
      <div className="shrink-0 p-8 border-t border-surface-border/50 text-center flex flex-col items-center">
        <span className="text-[8px] font-mono text-zinc-700 uppercase tracking-[0.5em] mb-1">Oweable Secure Mobile Link</span>
        <div className="w-24 h-[1px] bg-brand-violet/20"></div>
      </div>
    </div>
  );
}
