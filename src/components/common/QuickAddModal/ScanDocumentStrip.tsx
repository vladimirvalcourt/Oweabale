/**
 * Scan Document Strip - Handles file upload, camera capture, and OCR processing
 * 
 * Extracted from QuickAddModal.tsx to improve maintainability and testability.
 * This component manages:
 * - File upload (images and PDFs)
 * - Camera capture for mobile devices
 * - OCR text extraction using Tesseract.js
 * - PDF text extraction using pdfjs-dist
 * - Auto-detection of merchants, amounts, dates, and citations
 */

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { validateIngestionFile } from '../../../lib/api/security/service';
import { guessCategory } from '../../../lib/api/services/categorizer';
import { extractCitationFieldsFromText, looksLikeCitationDocument } from '../../../lib/api/index';
import { FormFileUpload } from '../../forms/index';

interface ScannedData {
  amount?: string;
  merchantName?: string;
  date?: string;
  category?: string;
  isCitation?: boolean;
  citationFields?: {
    citationNumber?: string;
    jurisdiction?: string;
    penaltyFee?: string;
    daysLeft?: string;
    citationDueDate?: string;
    citationType?: string;
  };
}

interface ScanDocumentStripProps {
  onScanComplete: (data: ScannedData) => void;
  activeTab: 'transaction' | 'obligation' | 'income' | 'citation';
  transactionLedgerKind: 'expense' | 'income';
  hasFullSuite: boolean;
}

export function ScanDocumentStrip({
  onScanComplete,
  activeTab,
  transactionLedgerKind,
  hasFullSuite,
}: ScanDocumentStripProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedPreviewUrl, setScannedPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const scanFileInputRef = useRef<HTMLInputElement>(null);
  const scanCameraInputRef = useRef<HTMLInputElement>(null);

  // Noise patterns that should be skipped when finding a merchant name
  const RECEIPT_NOISE = /^(receipt|invoice|thank you|thanks|welcome|store|branch|tel:|phone:|www\.|http|address:|date:|time:|cashier|order #|order:|transaction|subtotal|total|tax|amount|change|cash|card|approved|auth|ref:|refund|void|copy|customer|#\d+|\d{3}[-.\s]\d{3}[-.\s]\d{4}|\d{1,5}\s+\w+\s+(st|ave|blvd|rd|dr|lane|ln|way|ct|pl|suite))/i;

  const extractMerchantName = (lines: string[]): string | null => {
    // Prefer lines that look like business names: mixed/upper case, no digits-only, not noise
    for (const line of lines.slice(0, 10)) {
      const trimmed = line.trim();
      if (trimmed.length < 3 || trimmed.length > 60) continue;
      if (RECEIPT_NOISE.test(trimmed)) continue;
      if (/^\d+$/.test(trimmed)) continue; // pure number line
      if (/^\$[\d.,]+$/.test(trimmed)) continue; // pure dollar amount
      return trimmed.substring(0, 50);
    }
    return null;
  };

  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateIngestionFile(file);
    if (!validation.ok) {
      toast.error(validation.error);
      e.target.value = '';
      return;
    }

    // Generate preview URL for images; show PDF placeholder
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setScannedPreviewUrl(url);
      setShowPreview(true);
    } else {
      setScannedPreviewUrl(null);
      setShowPreview(false);
    }

    setIsScanning(true);
    try {
      let fullText = '';

      if (file.type.startsWith('image/')) {
        const Tesseract = (await import('tesseract.js')).default;
        const result = await Tesseract.recognize(file, 'eng');
        fullText = result.data.text;
      } else if (file.type === 'application/pdf') {
        const pdfjsLib = await import('pdfjs-dist');
        const pdfjsWorkerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pages = Math.min(pdf.numPages, 3);
        for (let i = 1; i <= pages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
      }

      // ── Extract amount: largest dollar value, ignoring obvious tax/subtotal lines ──
      const amountMatches = fullText.match(/\$?\s*\d{1,6}\.\d{2}/g);
      let extractedAmount: string | undefined;
      if (amountMatches) {
        const amounts = amountMatches
          .map(m => parseFloat(m.replace(/[^0-9.]/g, '')))
          .filter(n => !isNaN(n) && n > 0 && n < 100_000);
        if (amounts.length > 0) extractedAmount = Math.max(...amounts).toFixed(2);
      }

      // ── Auto-detect toll / traffic ticket and switch tab ──
      const isCitationDoc = looksLikeCitationDocument(fullText);

      // ── Extract merchant: skip noise, find first meaningful line ──
      const lines = fullText.split('\n').filter(l => l.trim().length > 2);
      const merchantName = extractMerchantName(lines);
      
      let extractedCategory: string | undefined;
      if (merchantName && !isCitationDoc) {
        const guessed = guessCategory(merchantName);
        if (guessed && !(activeTab === 'transaction' && transactionLedgerKind === 'income')) {
          extractedCategory = guessed;
        }
      }

      if (!merchantName && !isCitationDoc) {
        const guessed = guessCategory(fullText.substring(0, 500));
        if (guessed && !(activeTab === 'transaction' && transactionLedgerKind === 'income')) {
          extractedCategory = guessed;
        }
      }

      // ── Extract citation fields ──
      let citationFields: ScannedData['citationFields'];
      if (isCitationDoc) {
        const cit = extractCitationFieldsFromText(fullText);
        citationFields = {
          citationNumber: cit.citationNumber,
          jurisdiction: cit.jurisdiction,
          penaltyFee: cit.penaltyFee,
          daysLeft: cit.daysLeft,
          citationDueDate: cit.citationDueDate,
          citationType: cit.citationType,
        };
      }

      // ── Extract date ──
      let extractedDate: string | undefined;
      const dateMatch = fullText.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/);
      if (dateMatch) {
        try {
          const parsed = new Date(dateMatch[0]);
          if (!isNaN(parsed.getTime())) {
            extractedDate = parsed.toISOString().split('T')[0];
          }
        } catch (error) {
          console.warn('[ScanDocumentStrip] Date parsing failed:', error);
        }
      }

      // Build scanned data object
      const scannedData: ScannedData = {
        amount: extractedAmount,
        merchantName: merchantName || undefined,
        date: extractedDate,
        category: extractedCategory,
        isCitation: isCitationDoc,
        citationFields,
      };

      onScanComplete(scannedData);

      if (!fullText.trim()) {
        toast.warning('Could not extract text — fill in the fields manually.');
      } else {
        toast.success('Document scanned — review the pre-filled fields and save.');
      }
    } catch {
      toast.error('Could not read document. Try a clearer photo or PDF.');
    } finally {
      setIsScanning(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-surface-base border-b border-surface-border">
      <div className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)] sm:items-start sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-sans font-medium uppercase tracking-[0.08em] text-content-secondary">
            Scan receipt, image or PDF
          </p>
          <p className="mt-1 text-xs font-mono uppercase tracking-[0.12em] text-content-muted">
            JPG · PNG · WEBP · PDF
          </p>
          <p className="mt-2 max-w-prose text-xs leading-5 text-content-tertiary">
            Review amount, entry type, and category before saving — OCR can misread symbols or merchants.
          </p>
        </div>
        <div className="flex min-w-0 items-start gap-2 sm:justify-end">
          {scannedPreviewUrl && (
            <button
              type="button"
              onClick={() => setShowPreview(p => !p)}
              className={`min-h-10 shrink-0 rounded-lg border px-3 transition-all ${
                showPreview
                  ? 'border-surface-border text-content-primary bg-content-primary/[0.06]'
                  : 'border-surface-border text-content-tertiary hover:text-content-primary hover:bg-surface-elevated'
              }`}
              title={showPreview ? 'Hide document' : 'Show document'}
            >
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
            {/* Camera Button (keep native for mobile camera access) */}
            <label
              className={`relative flex min-h-10 w-full cursor-pointer select-none items-center justify-center gap-2 overflow-hidden rounded-lg border px-3 py-2 text-center text-xs font-sans font-medium transition-all
                ${
                  isScanning
                    ? 'border-surface-border bg-content-primary/[0.06] text-content-secondary cursor-not-allowed'
                    : 'border-surface-border bg-surface-raised text-content-secondary hover:text-content-primary hover:bg-content-primary/[0.04]'
                }`}
            >
              <input
                ref={scanCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                onChange={handleScanFile}
                disabled={isScanning}
              />
              <Camera className="relative z-10 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="relative z-10 truncate">Camera</span>
            </label>

            {/* File Upload using FormFileUpload component */}
            <FormFileUpload
              id="scan-file"
              label=""
              buttonLabel="Upload"
              onFileSelect={(file: File | null) => {
                if (file) {
                  const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleScanFile(event);
                }
              }}
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              maxSize={10}
              disabled={isScanning}
            />
          </div>
        </div>
      </div>

      {/* Document Preview Panel */}
      <AnimatePresence>
        {showPreview && scannedPreviewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="border-t border-surface-border relative z-0"
          >
            <div className="relative flex min-h-[7rem] max-h-[min(14rem,42svh)] w-full items-center justify-center bg-surface-base px-2 py-3">
              <img
                src={scannedPreviewUrl}
                alt="Scanned document preview"
                className="max-h-full max-w-full object-contain rounded-lg border border-surface-border"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
