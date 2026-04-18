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
  Smartphone,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import MobileSyncModal from '../components/MobileSyncModal';
import { toast } from 'sonner';
import { validateIngestionFile, sanitizeUrl } from '../lib/security';
import { buildScanExtraction } from '../lib/ingestionExtraction';
import { extractDocumentText } from '../lib/ingestionScan';
import type { PendingIngestion } from '../store/useStore';
import { yieldForPaint } from '../lib/interaction';

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
  const { pendingIngestions, removePendingIngestion, updatePendingIngestion, addPendingIngestion } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

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

    // ── Step 2: OCR / PDF text (+ raster fallback for scanned PDFs) ──
    try {
      const { text: fullText, usedRasterPdfOcr } = await extractDocumentText(uploadedFile, {
        onStatus: (label) => updatePendingIngestion(ingestionId, { status: label }),
      });

      // ── Step 3: Entity extraction + auto-save when valid ──
      const { type: ingestionType, extractedData } = buildScanExtraction(fullText);
      const trimmed = fullText.trim();
      const noAmount = !extractedData.amount || extractedData.amount <= 0;

      updatePendingIngestion(ingestionId, {
        status: 'ready',
        type: ingestionType,
        extractedData,
      });

      if (trimmed.length < 35 && noAmount) {
        toast.warning(
          'Could not read amounts or text from this file. It may be a scanned PDF, very dark, or low resolution — enter details manually, or retake as a brighter photo.',
          { duration: 8000 }
        );
      } else if (usedRasterPdfOcr) {
        toast.info('This PDF had no selectable text, so we read it page-by-page. Confirm amounts before saving.', {
          duration: 5000,
        });
      }

      const committed = await useStore.getState().commitIngestion(ingestionId);
      if (!committed) {
        const stillNeedConfirm = trimmed.length < 35 && noAmount;
        if (!stillNeedConfirm) {
          toast.success(`${uploadedFile.name.substring(0, 20)}... scanned`);
        }
        if (useStore.getState().pendingIngestions.some((p) => p.id === ingestionId)) {
          toast.info('Confirm amount and details, then save — or delete the row.');
        }
      }
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
       const signedUrl = sanitizeUrl(pendingMobile.storageUrl);
       if (!signedUrl) return;
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
       fetch(signedUrl)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Signed URL fetch failed: ${res.status}`);
          }
          return res.blob();
        })
         .then(blob => {
           const file = new File([blob], `mobile_scan.${extMatch}`, { type: mimeType });
           triggerManualScan(pendingMobile.id, file);
        })
        .catch((err) => {
          console.warn('[Ingestion] Mobile scan fetch failed:', err);
          updatePendingIngestion(pendingMobile.id, { status: 'error' });
          toast.error('Failed to download mobile scan. Please retry from phone.');
        });
    }
  }, [pendingIngestions]);

  const triggerManualScan = async (id: string, file: File) => {
     updatePendingIngestion(id, { status: 'scanning' });
     try {
       const { text: fullText, usedRasterPdfOcr } = await extractDocumentText(file, {
         onStatus: (label) => updatePendingIngestion(id, { status: label }),
       });
       const { type: ingestionType, extractedData } = buildScanExtraction(fullText);
       const trimmed = fullText.trim();
       const noAmount = !extractedData.amount || extractedData.amount <= 0;
       updatePendingIngestion(id, {
         status: 'ready',
         type: ingestionType,
         extractedData,
       });
       if (trimmed.length < 35 && noAmount) {
         toast.warning(
           'Could not read much from this document — you may need to enter details manually.',
           { duration: 7000 }
         );
       } else if (usedRasterPdfOcr) {
         toast.info('PDF read from page images — confirm amounts before saving.', { duration: 4000 });
       }
       const committed = await useStore.getState().commitIngestion(id);
       if (!committed && useStore.getState().pendingIngestions.some((p) => p.id === id)) {
         toast.info('Confirm amount and details, then save — or delete the row.');
       }
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

  const handleCommit = async (id: string) => {
    await yieldForPaint();
    const ok = await useStore.getState().commitIngestion(id);
    if (ok && selectedId === id) setSelectedId(null);
  };

  const handleBulkCommit = async () => {
    const readyItems = pendingIngestions.filter(pi => pi.status === 'ready');
    let n = 0;
    await yieldForPaint();
    for (const item of readyItems) {
      if (await useStore.getState().commitIngestion(item.id)) n++;
    }
    if (n > 0) toast.success(`Saved ${n} item${n === 1 ? '' : 's'} to history`);
    else if (readyItems.length > 0) toast.error('Nothing saved — check amounts and fields.');
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
          const row = payload.new as { id?: string; source?: string };
          if (!row?.id) return;
          useStore.getState().fetchData(undefined, { background: true });
          if (row.source === 'mobile') {
            setRecentlyAddedId(row.id);
            toast.success('Document received', {
              description: 'Refreshing Review Inbox.',
              action: {
                label: 'View',
                onClick: () => {
                  setSelectedId(row.id!);
                  document.getElementById(`ingestion-${row.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                },
              },
            });
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
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">
            Review <span className="text-content-secondary">Inbox</span>
          </h1>
          <p className="mt-2 max-w-2xl font-sans text-sm font-medium leading-relaxed text-content-secondary">
            Uploads are read automatically and saved when amounts are detected. Scanned PDFs (photos of paper) are OCR&apos;d page-by-page; if nothing is found, fill fields manually.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 md:max-w-2xl md:items-end">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            accept=".pdf,image/*" 
            onChange={handleFileSelect} 
          />
          <input
            type="file"
            ref={cameraInputRef}
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
          />
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            <button 
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-raised px-4 py-2.5 text-xs font-sans font-semibold text-content-secondary transition-colors hover:bg-surface-elevated btn-tactile"
            >
              <Camera className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-center leading-tight">Camera</span>
            </button>
            <button 
              type="button"
              onClick={() => setIsSyncOpen(true)}
              className="flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-lg border border-content-primary/20 bg-content-primary/[0.06] px-4 py-2.5 text-xs font-sans font-semibold text-content-primary transition-colors hover:bg-content-primary/[0.1] btn-tactile"
            >
              <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-center leading-tight">Scan via phone</span>
            </button>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-raised px-4 py-2.5 text-xs font-sans font-semibold text-content-secondary transition-colors hover:bg-surface-elevated btn-tactile"
            >
              <UploadCloud className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-center leading-tight">Upload documents</span>
            </button>
          </div>

          {pendingIngestions.some(pi => pi.status === 'ready') && (
            <button 
              type="button"
              onClick={handleBulkCommit}
              className="flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-lg bg-brand-cta px-4 py-2.5 text-xs font-sans font-semibold text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover btn-tactile sm:ml-auto sm:w-auto sm:min-w-[12rem]"
            >
              <FileCheck className="h-4 w-4 shrink-0" aria-hidden />
              Save all ready
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {pendingIngestions.length === 0 ? (
          <div 
            className={`border-2 border-dashed rounded-lg p-20 text-center transition-all cursor-pointer ${
              dragActive ? 'border-content-primary bg-content-primary/[0.03]' : 'border-surface-border bg-surface-raised hover:bg-surface-elevated'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className={`w-12 h-12 mx-auto mb-6 transition-colors ${dragActive ? 'text-content-secondary' : 'text-content-muted'}`} />
            <h3 className="text-lg font-sans font-semibold text-content-primary">Inbox is empty</h3>
            <p className="text-sm text-content-tertiary mt-2 max-w-md mx-auto">Drop a PDF or photo, or upload from your computer. Scanned PDFs are read page-by-page when needed; very blurry shots may still need manual entry.</p>
            <div className="mt-8 inline-block px-8 py-3 rounded-lg bg-brand-cta text-surface-base text-sm font-sans font-semibold shadow-sm btn-tactile">
              Choose files
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-px bg-surface-border border border-surface-border rounded-lg overflow-hidden shadow-none">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 bg-surface-elevated px-6 py-3 border-b border-surface-border">
              <div className="col-span-4 section-label normal-case text-[10px]">Document</div>
              <div className="col-span-2 section-label normal-case text-[10px]">Status</div>
              <div className="col-span-2 section-label normal-case text-[10px]">Amount</div>
              <div className="col-span-2 section-label normal-case text-[10px]">Type</div>
              <div className="col-span-2 text-right section-label normal-case text-[10px]">Action</div>
            </div>

            {pendingIngestions.map((item) => {
              const safeStorage = sanitizeUrl(item.storageUrl);
              const preview =
                safeStorage ||
                (item.originalFile?.url?.startsWith('blob:') ? item.originalFile.url : null);
              return (
              <div key={item.id} className="bg-surface-base">
                <motion.div 
                  layout
                  id={`ingestion-${item.id}`}
                  className={`grid grid-cols-12 items-center px-6 py-4 hover:bg-surface-elevated/50 transition-colors group ${selectedId === item.id ? 'bg-surface-elevated/40 ring-1 ring-inset ring-content-primary/20' : ''} ${recentlyAddedId === item.id ? 'bg-content-primary/[0.06] animate-pulse-highlight' : ''}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="col-span-8 md:col-span-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-surface-raised border border-surface-border rounded-lg flex items-center justify-center shrink-0">
                      {item.originalFile?.type?.includes('image') ? <FileText className="w-5 h-5 text-content-primary" /> : <FileText className="w-5 h-5 text-content-tertiary" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-mono font-bold text-content-primary truncate">{item.extractedData.biller || item.extractedData.name || item.originalFile?.name || 'Uploaded File'}</p>
                        {item.source === 'mobile' && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-content-primary/[0.06] border border-content-primary/15" title="Source: Mobile Capture">
                             <Smartphone className="w-2.5 h-2.5 text-content-secondary" />
                             <span className="text-[7px] font-mono font-bold text-content-secondary uppercase">Sync</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-content-muted uppercase tracking-widest mt-1">
                        {item.originalFile?.size ? (item.originalFile.size / 1024).toFixed(1) + ' KB' : 'SCANNED'}
                      </p>
                      <div className="mt-2 md:hidden">
                        <label className="sr-only">Document type</label>
                        <select
                          value={item.type}
                          onChange={(e) =>
                            updatePendingIngestion(item.id, {
                              type: e.target.value as PendingIngestion['type'],
                            })
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="w-full max-w-[200px] bg-surface-raised border border-surface-border text-[9px] font-mono font-bold uppercase tracking-widest text-content-tertiary rounded-lg px-2 py-1 focus-app-field"
                        >
                          <option value="transaction">Transaction</option>
                          <option value="bill">Bill</option>
                          <option value="income">Income</option>
                          <option value="debt">Debt</option>
                          <option value="citation">Ticket / Fine</option>
                        </select>
                      </div>
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
                            <Loader2 className="w-3 h-3 text-content-secondary animate-spin" />
                            <span className="text-[9px] font-mono font-black text-content-secondary uppercase tracking-widest leading-none">
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
                      onChange={(e) =>
                        updatePendingIngestion(item.id, {
                          type: e.target.value as PendingIngestion['type'],
                        })
                      }
                      className="bg-surface-raised border border-surface-border text-[9px] font-mono font-bold uppercase tracking-widest text-content-tertiary rounded-lg px-2 py-1 focus-app-field transition-colors"
                    >
                      <option value="transaction">Transaction</option>
                      <option value="bill">Bill</option>
                      <option value="income">Income</option>
                      <option value="debt">Debt</option>
                      <option value="citation">Ticket / Fine</option>
                    </select>
                  </div>

                  <div className="col-span-4 md:col-span-2 flex items-center justify-end gap-2">
                    <button 
                      onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                      className={`p-2 transition-all rounded-lg ${selectedId === item.id ? 'text-content-primary bg-content-primary/[0.05]' : 'text-content-tertiary hover:text-content-primary hover:bg-surface-highlight'}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleCommit(item.id)}
                      disabled={item.status !== 'ready'}
                      className={`p-2 rounded-lg transition-all ${item.status === 'ready' ? 'text-emerald-500 hover:bg-emerald-500/10 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'text-content-muted cursor-not-allowed opacity-60'}`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => removePendingIngestion(item.id)}
                      className="p-2 text-content-tertiary hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
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
                            <span className="text-[9px] font-mono text-content-tertiary uppercase tracking-widest font-bold flex items-center gap-2">
                              <FileText className="w-3 h-3" /> Document Preview
                              {item.storagePath && (
                                <span className="text-[8px] text-sky-500 flex items-center gap-1">
                                <CloudUpload className="w-2.5 h-2.5" /> Saved
                              </span>
                              )}
                            </span>
                            {safeStorage && (
                              <a
                                href={safeStorage}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] font-mono text-content-muted hover:text-content-primary uppercase tracking-widest flex items-center gap-1 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" /> Open
                              </a>
                            )}
                          </div>
                          <div className="flex-1 flex items-center justify-center p-4">
                            {preview && item.originalFile?.type === 'application/pdf' ? (
                              <iframe
                                src={preview}
                                className="w-full h-[380px] border-0"
                                title={item.originalFile?.name}
                                sandbox="allow-same-origin"
                              />
                            ) : preview ? (
                              <img
                                src={preview}
                                className="max-w-full max-h-[380px] object-contain opacity-70 hover:opacity-100 transition-opacity"
                                alt="Asset Preview"
                              />
                            ) : (
                              <div className="text-center p-12">
                                <FileText className="w-16 h-16 text-content-muted mx-auto mb-4" />
                                <p className="text-[10px] font-mono text-content-muted uppercase tracking-widest">No Preview Available</p>
                                <p className="text-[9px] font-mono text-content-muted mt-2 select-none uppercase">ID: {item.id}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Verification Form */}
                        <div className="flex flex-col">
                          <h3 className="text-xs font-mono font-bold text-content-primary uppercase tracking-widest mb-8 flex items-center gap-2">
                            <span className="w-2 h-2 bg-neutral-500 rounded-none inline-block" /> Document Review
                          </h3>
                          <div className="space-y-8 flex-1">
                            {item.type === 'citation' ? (
                              <>
                                <div className="grid grid-cols-2 gap-8">
                                  <div>
                                    <label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 font-black">Ticket type</label>
                                    <select
                                      value={item.extractedData.citationType || 'Toll Violation'}
                                      onChange={(e) =>
                                        updatePendingIngestion(item.id, {
                                          extractedData: { ...item.extractedData, citationType: e.target.value },
                                        })
                                      }
                                      className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-mono text-content-secondary focus-app-field-rose transition-colors"
                                    >
                                      <option value="Toll Violation">Toll Violation</option>
                                      <option value="Traffic Citation">Traffic Citation</option>
                                      <option value="Parking Ticket">Parking Ticket</option>
                                      <option value="Speed Camera">Speed Camera</option>
                                      <option value="Red Light Camera">Red Light Camera</option>
                                      <option value="HOV Violation">HOV Violation</option>
                                      <option value="Other Fine">Other Fine</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-mono text-rose-400/90 uppercase tracking-[0.2em] block mb-3 font-black">
                                      Issuing jurisdiction *
                                    </label>
                                    <input
                                      value={item.extractedData.jurisdiction || item.extractedData.biller || ''}
                                      onChange={(e) =>
                                        updatePendingIngestion(item.id, {
                                          extractedData: {
                                            ...item.extractedData,
                                            jurisdiction: e.target.value,
                                            biller: e.target.value,
                                          },
                                        })
                                      }
                                      placeholder="E.g., Harris County, TX"
                                      className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-mono text-content-primary focus-app-field-rose transition-colors"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                  <div>
                                    <label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 font-black">Citation / notice #</label>
                                    <input
                                      value={item.extractedData.citationNumber || ''}
                                      onChange={(e) =>
                                        updatePendingIngestion(item.id, {
                                          extractedData: { ...item.extractedData, citationNumber: e.target.value },
                                        })
                                      }
                                      className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-mono text-content-primary focus-app-field-rose transition-colors uppercase"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 font-black">Penalty / late fee ($)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={item.extractedData.penaltyFee ?? ''}
                                      onChange={(e) =>
                                        updatePendingIngestion(item.id, {
                                          extractedData: {
                                            ...item.extractedData,
                                            penaltyFee: parseFloat(e.target.value) || 0,
                                          },
                                        })
                                      }
                                      className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-mono text-content-primary focus-app-field-rose transition-colors"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 font-black">Payment URL (optional)</label>
                                  <input
                                    type="url"
                                    value={item.extractedData.paymentUrl || ''}
                                    onChange={(e) =>
                                      updatePendingIngestion(item.id, {
                                        extractedData: { ...item.extractedData, paymentUrl: e.target.value },
                                      })
                                    }
                                    placeholder="https://…"
                                    className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-mono text-content-primary focus-app-field-rose transition-colors"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                  <div>
                                    <label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 font-black">Incident date</label>
                                    <input
                                      type="date"
                                      value={item.extractedData.date || ''}
                                      onChange={(e) =>
                                        updatePendingIngestion(item.id, {
                                          extractedData: { ...item.extractedData, date: e.target.value },
                                        })
                                      }
                                      className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-mono text-content-primary focus-app-field-rose transition-colors"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 font-black">Days until due</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.extractedData.daysLeft ?? ''}
                                      onChange={(e) =>
                                        updatePendingIngestion(item.id, {
                                          extractedData: {
                                            ...item.extractedData,
                                            daysLeft: parseInt(e.target.value, 10) || 0,
                                          },
                                        })
                                      }
                                      className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-mono text-content-primary focus-app-field-rose transition-colors"
                                    />
                                  </div>
                                </div>
                              </>
                            ) : item.type === 'transaction' ? (
                              <div className="grid grid-cols-2 gap-8">
                                <div>
                                  <label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 font-black">Description</label>
                                  <input
                                    value={item.extractedData.biller || item.extractedData.name || ''}
                                    onChange={(e) =>
                                      updatePendingIngestion(item.id, {
                                        extractedData: { ...item.extractedData, biller: e.target.value, name: e.target.value },
                                      })
                                    }
                                    className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-mono text-content-primary focus-app-field transition-colors"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 font-black">Category</label>
                                  <select
                                    value={item.extractedData.category || 'other'}
                                    onChange={(e) =>
                                      updatePendingIngestion(item.id, {
                                        extractedData: { ...item.extractedData, category: e.target.value },
                                      })
                                    }
                                    className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-mono text-content-tertiary focus-app-field transition-colors"
                                  >
                                    <option value="utilities">Utilities</option>
                                    <option value="housing">Housing</option>
                                    <option value="food">Food</option>
                                    <option value="transport">Transport</option>
                                    <option value="shopping">Shopping</option>
                                    <option value="entertainment">Entertainment</option>
                                    <option value="health">Health</option>
                                    <option value="subscriptions">Subscriptions</option>
                                    <option value="insurance">Insurance</option>
                                    <option value="auto">Auto</option>
                                    <option value="business">Business</option>
                                    <option value="taxes">Taxes</option>
                                    <option value="debt">Debt</option>
                                    <option value="other">Other</option>
                                  </select>
                                </div>
                              </div>
                            ) : item.type === 'income' ? (
                              <div className="grid grid-cols-2 gap-8">
                                <div>
                                  <label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 font-black">Income source / label</label>
                                  <input
                                    value={item.extractedData.source || item.extractedData.biller || ''}
                                    onChange={(e) =>
                                      updatePendingIngestion(item.id, {
                                        extractedData: {
                                          ...item.extractedData,
                                          source: e.target.value,
                                          name: e.target.value,
                                          biller: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-mono text-content-primary focus-app-field transition-colors"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 font-black">Category</label>
                                  <select
                                    value={item.extractedData.category || 'Salary'}
                                    onChange={(e) =>
                                      updatePendingIngestion(item.id, {
                                        extractedData: { ...item.extractedData, category: e.target.value },
                                      })
                                    }
                                    className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-mono text-content-tertiary focus-app-field transition-colors"
                                  >
                                    <option value="Salary">Salary</option>
                                    <option value="Freelance">Freelance</option>
                                    <option value="Bonus">Bonus</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </div>
                              </div>
                            ) : item.type === 'debt' ? (
                              <div className="grid grid-cols-2 gap-8">
                                <div>
                                  <label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 font-black">Lender / account</label>
                                  <input
                                    value={item.extractedData.biller || ''}
                                    onChange={(e) =>
                                      updatePendingIngestion(item.id, {
                                        extractedData: { ...item.extractedData, biller: e.target.value, name: e.target.value },
                                      })
                                    }
                                    className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-mono text-content-primary focus-app-field transition-colors"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 font-black">APR (%)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.extractedData.debtApr ?? ''}
                                    onChange={(e) =>
                                      updatePendingIngestion(item.id, {
                                        extractedData: {
                                          ...item.extractedData,
                                          debtApr: parseFloat(e.target.value) || 0,
                                        },
                                      })
                                    }
                                    className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-mono text-content-primary focus-app-field transition-colors"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 font-black">Minimum payment ($)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.extractedData.debtMinPayment ?? ''}
                                    onChange={(e) =>
                                      updatePendingIngestion(item.id, {
                                        extractedData: {
                                          ...item.extractedData,
                                          debtMinPayment: parseFloat(e.target.value) || 0,
                                        },
                                      })
                                    }
                                    className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-mono text-content-primary focus-app-field transition-colors"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-8">
                                <div>
                                  <label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 font-black">Merchant / Payee</label>
                                  <input 
                                    value={item.extractedData.biller || ''} 
                                    onChange={(e) => updatePendingIngestion(item.id, { extractedData: { ...item.extractedData, biller: e.target.value, name: e.target.value } })}
                                    className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-mono text-content-primary focus-app-field transition-colors uppercase tracking-widest"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 font-black">Category</label>
                                  <select 
                                    value={item.extractedData.category || 'utilities'}
                                    onChange={(e) => updatePendingIngestion(item.id, { extractedData: { ...item.extractedData, category: e.target.value } })}
                                    className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-mono text-content-tertiary focus-app-field transition-colors uppercase tracking-widest"
                                  >
                                    <option value="utilities">Utilities</option>
                                    <option value="housing">Housing</option>
                                    <option value="food">Food</option>
                                    <option value="transport">Transport</option>
                                    <option value="shopping">Shopping</option>
                                    <option value="subscriptions">Subscriptions</option>
                                    <option value="insurance">Insurance</option>
                                    <option value="health">Health</option>
                                    <option value="auto">Auto</option>
                                    <option value="business">Business</option>
                                    <option value="taxes">Taxes</option>
                                    <option value="other">Other</option>
                                  </select>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-8">
                              <div>
                                <label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 font-black">Amount ($)</label>
                                <input 
                                  type="number"
                                  value={item.extractedData.amount ?? ''} 
                                  onChange={(e) => updatePendingIngestion(item.id, { extractedData: { ...item.extractedData, amount: parseFloat(e.target.value) } })}
                                  className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xl font-mono text-[#4ade80] focus-app focus:border-[#4ade80] transition-colors font-bold"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 font-black">
                                  {item.type === 'citation'
                                    ? 'Payment due date'
                                    : item.type === 'transaction'
                                      ? 'Date'
                                      : item.type === 'income' || item.type === 'debt'
                                        ? 'Date'
                                        : 'Due date'}
                                </label>
                                <input 
                                  type="date"
                                  value={item.extractedData.dueDate || item.extractedData.date || ''} 
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (item.type === 'citation') {
                                      const days = v
                                        ? Math.max(0, Math.round((new Date(v + 'T12:00:00').getTime() - Date.now()) / 86400000))
                                        : (item.extractedData.daysLeft ?? 30);
                                      updatePendingIngestion(item.id, {
                                        extractedData: { ...item.extractedData, dueDate: v, daysLeft: days },
                                      });
                                    } else {
                                      updatePendingIngestion(item.id, {
                                        extractedData: { ...item.extractedData, dueDate: v, date: v },
                                      });
                                    }
                                  }}
                                  className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-mono text-content-primary focus-app-field transition-colors"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="pt-8 border-t border-surface-border mt-12 flex justify-end gap-6 items-center">
                            <button 
                              onClick={() => removePendingIngestion(item.id)}
                              className="text-[10px] font-mono font-bold uppercase tracking-widest text-content-tertiary hover:text-rose-500 transition-colors"
                            >
                              Delete
                            </button>
                            <button 
                              onClick={() => handleCommit(item.id)}
                              className="px-10 py-3 bg-brand-cta text-surface-base hover:bg-brand-cta-hover rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest transition-colors shadow-none"
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
            );
            })}
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
