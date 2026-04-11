import React, { useState } from 'react';
import {
  Inbox,
  Check,
  Trash2,
  FileText,
  AlertCircle,
  Loader2,
  FileCheck,
  Eye,
  X,
  UploadCloud,
  CloudUpload,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import MobileSyncModal from '../components/MobileSyncModal';
import { toast } from 'sonner';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { validateIngestionFile } from '../lib/security';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// Upload rate limiter — max 5 files per 60 seconds
const uploadTimestamps: number[] = [];
const MAX_UPLOADS_PER_MINUTE = 5;
const MAX_CONCURRENT_UPLOADS = 2;
let activeUploads = 0;

function isRateLimited(): boolean {
  const now = Date.now();
  // Evict entries older than 60 s
  while (uploadTimestamps.length > 0 && now - uploadTimestamps[0] > 60_000) {
    uploadTimestamps.shift();
  }
  return uploadTimestamps.length >= MAX_UPLOADS_PER_MINUTE || activeUploads >= MAX_CONCURRENT_UPLOADS;
}

export default function Ingestion() {
  const { pendingIngestions, commitIngestion, removePendingIngestion, updatePendingIngestion, addPendingIngestion } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const processFile = async (uploadedFile: File) => {
    // ── Security: validate file before anything else ──────────
    const validation = validateIngestionFile(uploadedFile);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    // ── Rate limiting ─────────────────────────────────────────
    if (isRateLimited()) {
      toast.error('Too many uploads. Please wait a moment before adding more files.');
      return;
    }
    uploadTimestamps.push(Date.now());
    activeUploads++;

    setIsExtracting(true);
    const ingestionId = addPendingIngestion({
      type: 'bill',
      status: 'uploading',
      extractedData: {},
      originalFile: {
        name: uploadedFile.name,
        size: uploadedFile.size,
        type: uploadedFile.type,
        url: URL.createObjectURL(uploadedFile)  // always set local blob for instant preview
      }
    });

    // ── Step 1: Upload to Supabase Storage (optional — skipped if no auth) ──
    let storagePath: string | undefined;
    let storageUrl: string | undefined;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const ext = uploadedFile.name.split('.').pop() ?? 'bin';
        const path = `${user.id}/${ingestionId}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('ingestion-files')
          .upload(path, uploadedFile, { contentType: uploadedFile.type, upsert: false });

        if (uploadError) {
          console.warn('[Ingestion] Storage upload failed:', uploadError.message);
          toast.warning('File upload skipped — parsing will still run.');
        } else {
          storagePath = path;
          // Generate a 1-hour signed URL for preview
          const { data: signedData } = await supabase.storage
            .from('ingestion-files')
            .createSignedUrl(path, 3600);
          storageUrl = signedData?.signedUrl;

          // Persist storage path to the ingestion record
          updatePendingIngestion(ingestionId, { storagePath, storageUrl });
          toast.success(`Uploaded to secure vault`, { duration: 2000 });
        }
      }
    } catch (uploadErr) {
      console.warn('[Ingestion] Auth/upload check failed silently:', uploadErr);
    }

    // ── Step 2: OCR / PDF text extraction ──
    try {
      let fullText = '';

      if (uploadedFile.type.startsWith('image/')) {
        updatePendingIngestion(ingestionId, { status: 'scanning' });
        const result = await Tesseract.recognize(uploadedFile, 'eng');
        fullText = result.data.text;
      } else if (uploadedFile.type === 'application/pdf') {
        try {
          const arrayBuffer = await uploadedFile.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

          for (let i = 1; i <= pdf.numPages; i++) {
            updatePendingIngestion(ingestionId, { status: `scanning [P${i}/${pdf.numPages}]` });
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
          }
        } catch {
          throw new Error('Failed to scan document binary.');
        }
      }

      // ── Step 3: Entity extraction ──
      const lines = fullText.split('\n').filter(line => line.trim().length > 0);
      const biller = lines.length > 0
        ? (lines[0].trim().length > 3 ? lines[0].trim() : (lines[1]?.trim() || 'Unknown Payee'))
        : 'Unknown Payee';

      const amountMatches = fullText.match(/\$?\s*\d+\.\d{2}/g);
      let maxAmount = 0;
      if (amountMatches) {
        const amounts = amountMatches
          .map(m => parseFloat(m.replace(/[^0-9.]/g, '')))
          .filter(n => !isNaN(n) && isFinite(n));
        if (amounts.length > 0) maxAmount = Math.max(...amounts);
      }

      const dateMatch = fullText.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
      let dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      if (dateMatch) {
        try {
          const parsed = new Date(dateMatch[0]);
          if (!isNaN(parsed.getTime())) dueDate = parsed.toISOString().split('T')[0];
        } catch (_) {}
      }

      updatePendingIngestion(ingestionId, {
        status: 'ready',
        extractedData: {
          biller: biller.substring(0, 50),
          amount: maxAmount,
          dueDate,
          category: 'Utilities'
        }
      });

      toast.success(`${uploadedFile.name.substring(0, 20)}... scanned`);
    } catch (error) {
      updatePendingIngestion(ingestionId, { status: 'error' });
      toast.error(`Scan failed: ${uploadedFile.name}`);
    } finally {
      activeUploads = Math.max(0, activeUploads - 1);
      setIsExtracting(false);
    }
  };

  // ── Auto-OCR and Signed URLs ──────────────────────────────────
  React.useEffect(() => {
    // 1. Generate Signed URLs for mobile syncs if missing
    pendingIngestions.forEach(async (pi) => {
      if (pi.storagePath && !pi.storageUrl) {
        const { data } = await supabase.storage
          .from('scans')
          .createSignedUrl(pi.storagePath, 3600);
        if (data?.signedUrl) {
          updatePendingIngestion(pi.id, { storageUrl: data.signedUrl });
        }
      }
    });

    // 2. Trigger OCR for new mobile syncs
    const pendingMobile = pendingIngestions.find(pi => pi.source === 'mobile' && pi.status === 'uploading');
    if (pendingMobile && pendingMobile.storageUrl) {
       // Derive the MIME type from the storage path extension so PDFs are handled correctly
       const extMatch = pendingMobile.storagePath?.split('.').pop()?.toLowerCase() ?? 'jpg';
       const mimeMap: Record<string, string> = {
         pdf: 'application/pdf',
         jpg: 'image/jpeg',
         jpeg: 'image/jpeg',
         png: 'image/png',
         webp: 'image/webp',
         gif: 'image/gif',
       };
       const mimeType = mimeMap[extMatch] ?? 'image/jpeg';
       fetch(pendingMobile.storageUrl)
         .then(res => res.blob())
         .then(blob => {
           const file = new File([blob], `mobile_scan.${extMatch}`, { type: mimeType });
           triggerManualScan(pendingMobile.id, file);
         });
    }
  }, [pendingIngestions]);

  const triggerManualScan = async (id: string, file: File) => {
     updatePendingIngestion(id, { status: 'scanning' });
     try {
       let fullText = '';
       if (file.type === 'application/pdf') {
         const arrayBuffer = await file.arrayBuffer();
         const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
         const pages = Math.min(pdf.numPages, 3);
         for (let i = 1; i <= pages; i++) {
           const page = await pdf.getPage(i);
           const textContent = await page.getTextContent();
           fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
         }
       } else {
         const result = await Tesseract.recognize(file, 'eng');
         fullText = result.data.text;
       }
       
       const lines = fullText.split('\n').filter(line => line.trim().length > 0);
       const biller = lines.length > 0
         ? (lines[0].trim().length > 3 ? lines[0].trim() : (lines[1]?.trim() || 'Unknown Payee'))
         : 'Unknown Payee';

       const amountMatches = fullText.match(/\$?\s*\d+\.\d{2}/g);
       let maxAmount = 0;
       if (amountMatches) {
         const amounts = amountMatches
           .map(m => parseFloat(m.replace(/[^0-9.]/g, '')))
           .filter(n => !isNaN(n) && isFinite(n));
         if (amounts.length > 0) maxAmount = Math.max(...amounts);
       }

       updatePendingIngestion(id, {
         status: 'ready',
         extractedData: {
           biller: biller.substring(0, 50),
           amount: maxAmount,
           dueDate: new Date().toISOString().split('T')[0],
           category: 'Utilities'
         }
       });
     } catch (err) {
       updatePendingIngestion(id, { status: 'error' });
     }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(processFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(processFile);
    }
  };

  const handleCommit = (id: string) => {
    commitIngestion(id);
    if (selectedId === id) setSelectedId(null);
  };

  const handleBulkCommit = () => {
    const readyItems = pendingIngestions.filter(pi => pi.status === 'ready');
    readyItems.forEach(item => commitIngestion(item.id));
    toast.success(`Saved ${readyItems.length} items to history`);
  };

  const [recentlyAddedId, setRecentlyAddedId] = React.useState<string | null>(null);

  // ── Realtime Ingestion Sync ───────────────────────────────────
  React.useEffect(() => {
    const channel = supabase
      .channel('ingestion-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pending_ingestions'
        },
        (payload) => {
          if (payload.new.source === 'mobile') {
            const newId = payload.new.id;
            setRecentlyAddedId(newId);
            
            toast.success('Document Received Successfully', {
               description: `Mobile scan processed. Added to Review Inbox.`,
               action: {
                 label: 'View Now',
                 onClick: () => {
                   setSelectedId(newId);
                   const element = document.getElementById(`ingestion-${newId}`);
                   element?.scrollIntoView({ behavior: 'smooth' });
                 }
               }
            });
            
            useStore.getState().fetchData(undefined, { background: true });
            
            // Clear highlight after 5 seconds
            setTimeout(() => setRecentlyAddedId(null), 5000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-sans font-medium tracking-tight text-content-primary">
            Review <span className="text-indigo-500">Inbox</span>
          </h1>
          <p className="text-[14px] font-sans text-content-tertiary mt-2">
            Review and confirm pending documents to save them to your permanent history.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            accept=".pdf,image/*" 
            onChange={handleFileSelect} 
          />
          <button 
            onClick={() => setIsSyncOpen(true)}
            className="px-6 py-2.5 bg-brand-violet/10 border border-brand-violet/30 hover:bg-brand-violet/20 text-brand-violet rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-colors flex items-center gap-2 btn-tactile"
          >
            <Smartphone className="w-4 h-4" /> SCAN VIA PHONE
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 bg-surface-raised border border-surface-border hover:bg-surface-elevated text-zinc-300 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-colors flex items-center gap-2 btn-tactile"
          >
            <UploadCloud className="w-4 h-4" /> UPLOAD DOCUMENTS
          </button>

          {pendingIngestions.some(pi => pi.status === 'ready') && (
            <button 
              onClick={handleBulkCommit}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/10 btn-tactile"
            >
              <FileCheck className="w-4 h-4" /> SAVE ALL READY
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {pendingIngestions.length === 0 ? (
          <div 
            className={`border-2 border-dashed rounded-sm p-20 text-center transition-all cursor-pointer ${
              dragActive ? 'border-indigo-500 bg-indigo-500/5' : 'border-surface-border bg-surface-raised hover:bg-surface-elevated'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className={`w-12 h-12 mx-auto mb-6 transition-colors ${dragActive ? 'text-indigo-500' : 'text-zinc-700'}`} />
            <h3 className="text-lg font-mono font-bold text-zinc-500 uppercase tracking-widest">Empty Inbox</h3>
            <p className="text-xs font-mono text-zinc-600 mt-2 uppercase tracking-widest">Drag and drop receipts or bills to start reading them</p>
            <div className="mt-8 inline-block px-10 py-3 bg-indigo-600 text-white text-[10px] font-mono font-bold uppercase tracking-[0.3em] shadow-lg shadow-indigo-500/20 btn-tactile">
              IMPORT FILES
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-px bg-surface-border border border-surface-border rounded-sm overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 bg-surface-elevated px-6 py-3 border-b border-surface-border">
              <div className="col-span-4 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-[0.2em]">Document</div>
              <div className="col-span-2 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-[0.2em]">Status</div>
              <div className="col-span-2 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-[0.2em]">Amount</div>
              <div className="col-span-2 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-[0.2em]">Type</div>
              <div className="col-span-2 text-right text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-[0.2em]">Action</div>
            </div>

            {pendingIngestions.map((item) => (
              <div key={item.id} className="bg-surface-base">
                <motion.div 
                  layout
                  id={`ingestion-${item.id}`}
                  className={`grid grid-cols-12 items-center px-6 py-4 hover:bg-surface-elevated/50 transition-colors group ${selectedId === item.id ? 'bg-surface-elevated/40 ring-1 ring-inset ring-indigo-500/30' : ''} ${recentlyAddedId === item.id ? 'bg-brand-violet/10 animate-pulse-highlight' : ''}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="col-span-8 md:col-span-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-surface-raised border border-surface-border rounded-sm flex items-center justify-center shrink-0">
                      {item.originalFile?.type?.includes('image') ? <FileText className="w-5 h-5 text-indigo-400" /> : <FileText className="w-5 h-5 text-zinc-500" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-mono font-bold text-content-primary truncate">{item.extractedData.biller || item.extractedData.name || item.originalFile?.name || 'Uploaded File'}</p>
                        {item.source === 'mobile' && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-brand-violet/10 border border-brand-violet/20" title="Source: Mobile Capture">
                             <Smartphone className="w-2.5 h-2.5 text-brand-violet" />
                             <span className="text-[7px] font-mono font-bold text-brand-violet uppercase">Sync</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-1">
                        {item.originalFile?.size ? (item.originalFile.size / 1024).toFixed(1) + ' KB' : 'SCANNED'}
                      </p>
                    </div>
                  </div>

                  <div className="hidden md:block md:col-span-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {item.status === 'uploading' ? (
                          <>
                            <CloudUpload className="w-3 h-3 text-sky-400 animate-pulse" />
                            <span className="text-[9px] font-mono font-black text-sky-400 uppercase tracking-widest leading-none">Uploading...</span>
                          </>
                        ) : item.status.includes('scanning') ? (
                          <>
                            <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
                            <span className="text-[9px] font-mono font-black text-indigo-500 uppercase tracking-widest leading-none">
                              {item.status.replace('scanning', '').trim() || 'Reading...'}
                            </span>
                          </>
                        ) : item.status === 'ready' ? (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-glow-emerald" />
                            <span className="text-[9px] font-mono font-black text-emerald-500 uppercase tracking-widest">Verified</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            <span className="text-[9px] font-mono font-black text-rose-500 uppercase tracking-widest">Needs Review</span>
                          </>
                        )}
                      </div>
                      {item.storagePath && (
                        <span className="text-[8px] font-mono text-sky-600 uppercase tracking-widest flex items-center gap-1">
                          <CloudUpload className="w-2.5 h-2.5" /> Backed Up
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden md:block md:col-span-2">
                    <p className="text-sm font-mono font-bold text-content-primary">
                      ${item.extractedData.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </p>
                  </div>

                  <div className="hidden md:block md:col-span-2">
                    <select 
                      value={item.type}
                      onChange={(e) => updatePendingIngestion(item.id, { type: e.target.value as 'transaction' | 'bill' | 'income' | 'debt' })}
                      className="bg-surface-raised border border-surface-border text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400 rounded-sm px-2 py-1 outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="transaction">Transaction</option>
                      <option value="bill">Bill</option>
                      <option value="income">Income</option>
                    </select>
                  </div>

                  <div className="col-span-4 md:col-span-2 flex items-center justify-end gap-2">
                    <button 
                      onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                      className={`p-2 transition-all rounded-sm ${selectedId === item.id ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500 hover:text-white hover:bg-surface-highlight'}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleCommit(item.id)}
                      disabled={item.status !== 'ready'}
                      className={`p-2 rounded-sm transition-all ${item.status === 'ready' ? 'text-emerald-500 hover:bg-emerald-500/10 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'text-zinc-800 cursor-not-allowed opacity-30'}`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => removePendingIngestion(item.id)}
                      className="p-2 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-sm transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>

                {/* Expanded Verification Node */}
                <AnimatePresence>
                  {selectedId === item.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-surface-border bg-surface-base"
                    >
                      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Digital Asset Preview */}
                        <div className="bg-surface-raised border border-surface-border flex flex-col min-h-[400px]">
                          <div className="px-4 py-2 border-b border-surface-border flex justify-between items-center bg-surface-elevated/50">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-2">
                              <FileText className="w-3 h-3" /> Document Preview
                              {item.storagePath && (
                                <span className="text-[8px] text-sky-500 flex items-center gap-1">
                                <CloudUpload className="w-2.5 h-2.5" /> Saved
                              </span>
                              )}
                            </span>
                            {item.storageUrl && (
                              <a
                                href={item.storageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] font-mono text-zinc-600 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" /> Open
                              </a>
                            )}
                          </div>
                          <div className="flex-1 flex items-center justify-center p-4">
                            {item.storageUrl && item.originalFile?.type === 'application/pdf' ? (
                              <iframe
                                src={item.storageUrl}
                                className="w-full h-[380px] border-0"
                                title={item.originalFile?.name}
                                sandbox="allow-same-origin"
                              />
                            ) : item.storageUrl || item.originalFile?.url ? (
                              <img
                                src={item.storageUrl || item.originalFile?.url}
                                className="max-w-full max-h-[380px] object-contain opacity-70 hover:opacity-100 transition-opacity"
                                alt="Asset Preview"
                              />
                            ) : (
                              <div className="text-center p-12">
                                <FileText className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">No Preview Available</p>
                                <p className="text-[9px] font-mono text-zinc-700 mt-2 select-none uppercase">ID: {item.id}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Verification Form */}
                        <div className="flex flex-col">
                          <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-500 rounded-none inline-block" /> Document Review
                          </h3>
                          <div className="space-y-8 flex-1">
                            <div className="grid grid-cols-2 gap-8">
                              <div>
                                <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.2em] block mb-3 font-black">Merchant / Payee</label>
                                <input 
                                  value={item.extractedData.biller || ''} 
                                  onChange={(e) => updatePendingIngestion(item.id, { extractedData: { ...item.extractedData, biller: e.target.value, name: e.target.value } })}
                                  className="w-full bg-surface-raised border border-surface-border rounded-sm px-4 py-3 text-xs font-mono text-content-primary focus:outline-none focus:border-indigo-500 transition-colors uppercase tracking-widest"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.2em] block mb-3 font-black">Category</label>
                                <select 
                                  value={item.extractedData.category || ''}
                                  onChange={(e) => updatePendingIngestion(item.id, { extractedData: { ...item.extractedData, category: e.target.value } })}
                                  className="w-full bg-surface-raised border border-surface-border rounded-sm px-4 py-3 text-xs font-mono text-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors uppercase tracking-widest"
                                >
                                  <option value="Utilities">Utilities</option>
                                  <option value="Food & Dining">Food & Dining</option>
                                  <option value="Housing">Housing</option>
                                  <option value="Transportation">Transportation</option>
                                  <option value="Subscriptions">Subscriptions</option>
                                  <option value="Health">Health</option>
                                  <option value="Shopping">Shopping</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                              <div>
                                <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.2em] block mb-3 font-black">Amount ($)</label>
                                <input 
                                  type="number"
                                  value={item.extractedData.amount || ''} 
                                  onChange={(e) => updatePendingIngestion(item.id, { extractedData: { ...item.extractedData, amount: parseFloat(e.target.value) } })}
                                  className="w-full bg-surface-raised border border-surface-border rounded-sm px-4 py-3 text-xl font-mono text-[#4ade80] focus:outline-none focus:border-[#4ade80] transition-colors font-bold"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.2em] block mb-3 font-black">Due Date</label>
                                <input 
                                  type="date"
                                  value={item.extractedData.dueDate || item.extractedData.date || ''} 
                                  onChange={(e) => updatePendingIngestion(item.id, { extractedData: { ...item.extractedData, dueDate: e.target.value, date: e.target.value } })}
                                  className="w-full bg-surface-raised border border-surface-border rounded-sm px-4 py-3 text-xs font-mono text-content-primary focus:outline-none focus:border-indigo-500 transition-colors"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="pt-8 border-t border-surface-border mt-12 flex justify-end gap-6 items-center">
                            <button 
                              onClick={() => removePendingIngestion(item.id)}
                              className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 hover:text-rose-500 transition-colors"
                            >
                              Delete
                            </button>
                            <button 
                              onClick={() => handleCommit(item.id)}
                              className="px-10 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-colors shadow-lg shadow-indigo-500/20"
                            >
                              Approve & Save
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
      <MobileSyncModal 
        isOpen={isSyncOpen} 
        onClose={() => setIsSyncOpen(false)} 
        onSuccess={() => {
           // Mobile upload already inserted the record, 
           // but we might need to refresh local state if store doesn't auto-poll
           // In Oweable, fetchData() usually handles this.
           useStore.getState().fetchData(undefined, { background: true });
        }}
      />
    </div>
  );
}
