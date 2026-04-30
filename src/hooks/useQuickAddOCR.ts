import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { validateIngestionFile } from '@/lib/api/security/service';
import { looksLikeCitationDocument, extractCitationFieldsFromText } from '@/lib/api/citation';
import { guessCategory } from '@/lib/api/services/categorizer';

/**
 * Hook for handling OCR and PDF document scanning in QuickAddModal.
 * 
 * Extracts text from images (Tesseract.js) and PDFs (pdfjs-dist),
 * then parses merchant names, amounts, dates, and citation fields.
 * 
 * @returns Object with scanning state and handlers
 */
export function useQuickAddOCR() {
    const [isScanning, setIsScanning] = useState(false);
    const [scannedPreviewUrl, setScannedPreviewUrl] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    /** Noise patterns that should be skipped when finding a merchant name */
    const RECEIPT_NOISE = /^(receipt|invoice|thank you|thanks|welcome|store|branch|tel:|phone:|www\.|http|address:|date:|time:|cashier|order #|order:|transaction|subtotal|total|tax|amount|change|cash|card|approved|auth|ref:|refund|void|copy|customer|#\d+|\d{3}[-.\s]\d{3}[-.\s]\d{4}|\d{1,5}\s+\w+\s+(st|ave|blvd|rd|dr|lane|ln|way|ct|pl|suite))/i;

    /** Extract merchant name from OCR text lines */
    const extractMerchantName = useCallback((lines: string[]): string | null => {
        for (const line of lines.slice(0, 10)) {
            const trimmed = line.trim();
            if (trimmed.length < 3 || trimmed.length > 60) continue;
            if (RECEIPT_NOISE.test(trimmed)) continue;
            if (/^\d+$/.test(trimmed)) continue;
            if (/^\$[\d.,]+$/.test(trimmed)) continue;
            return trimmed.substring(0, 50);
        }
        return null;
    }, []);

    /** Handle file selection and perform OCR/PDF extraction */
    const scanFile = useCallback(async (
        file: File,
        callbacks: {
            onAmount?: (amount: string) => void;
            onDescription?: (desc: string) => void;
            onVendor?: (vendor: string) => void;
            onCategory?: (category: string) => void;
            onDate?: (date: string) => void;
            onDueDate?: (dueDate: string) => void;
            onCitationFields?: (fields: any) => void;
            onActiveTabChange?: (tab: 'transaction' | 'obligation' | 'income' | 'citation') => void;
            getActiveTab?: () => 'transaction' | 'obligation' | 'income' | 'citation';
            hasFullSuite?: boolean;
        } = {}
    ) => {
        const validation = validateIngestionFile(file);
        if (!validation.ok) {
            toast.error(validation.error);
            return false;
        }

        // Generate preview URL for images
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

            // Extract amount: largest dollar value
            const amountMatches = fullText.match(/\$?\s*\d{1,6}\.\d{2}/g);
            if (amountMatches && callbacks.onAmount) {
                const amounts = amountMatches
                    .map(m => parseFloat(m.replace(/[^0-9.]/g, '')))
                    .filter(n => !isNaN(n) && n > 0 && n < 100_000);
                if (amounts.length > 0) {
                    callbacks.onAmount(Math.max(...amounts).toFixed(2));
                }
            }

            // Auto-detect toll / traffic ticket and switch tab
            const isCitationDoc = looksLikeCitationDocument(fullText);
            if (isCitationDoc && callbacks.getActiveTab && callbacks.getActiveTab() !== 'citation') {
                callbacks.onActiveTabChange?.('citation');
            }

            // Extract merchant name
            const lines = fullText.split('\n').filter(l => l.trim().length > 2);
            const merchantName = extractMerchantName(lines);

            if (merchantName && !isCitationDoc) {
                const currentTab = callbacks.getActiveTab?.();
                if (currentTab === 'transaction') {
                    callbacks.onDescription?.(merchantName);
                } else if (currentTab === 'obligation') {
                    callbacks.onVendor?.(merchantName);
                }

                const guessed = guessCategory(merchantName);
                if (guessed && !(currentTab === 'transaction')) {
                    callbacks.onCategory?.(guessed);
                }
            }

            if (!merchantName) {
                const guessed = guessCategory(fullText.substring(0, 500));
                if (guessed && callbacks.onCategory) {
                    callbacks.onCategory(guessed);
                }
            }

            // Extract citation fields if detected
            if (isCitationDoc && callbacks.onCitationFields) {
                const cit = extractCitationFieldsFromText(fullText);
                callbacks.onCitationFields(cit);
            }

            // Extract date
            const dateMatch = fullText.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/);
            if (dateMatch) {
                try {
                    const parsed = new Date(dateMatch[0]);
                    if (!isNaN(parsed.getTime())) {
                        const dateStr = parsed.toISOString().split('T')[0];
                        callbacks.onDate?.(dateStr);
                        if (callbacks.getActiveTab?.() === 'obligation') {
                            callbacks.onDueDate?.(dateStr);
                        }
                    }
                } catch (error) {
                    console.warn('[useQuickAddOCR] Date parsing failed:', error);
                    toast.warning('Could not detect date — please enter manually');
                }
            }

            // Switch to obligation tab for tracker-only users
            if (!callbacks.hasFullSuite && !isCitationDoc) {
                callbacks.onActiveTabChange?.('obligation');
                if (merchantName && callbacks.onVendor) {
                    callbacks.onVendor(merchantName);
                }
            }

            if (!fullText.trim()) {
                toast.warning('Could not extract text — fill in the fields manually.');
            } else {
                toast.success('Document scanned — review the pre-filled fields and save.');
            }

            return true;
        } catch (error) {
            toast.error('Could not read document. Try a clearer photo or PDF.');
            console.error('[useQuickAddOCR] Scan error:', error);
            return false;
        } finally {
            setIsScanning(false);
        }
    }, [extractMerchantName]);

    /** Clear scanned preview and reset state */
    const clearScan = useCallback(() => {
        setScannedPreviewUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
        setShowPreview(false);
    }, []);

    return {
        isScanning,
        scannedPreviewUrl,
        showPreview,
        setShowPreview,
        scanFile,
        clearScan,
    };
}
