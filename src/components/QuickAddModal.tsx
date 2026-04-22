import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, Loader2, Camera, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { toast } from 'sonner';
import { useStore, type IncomeSource, type TabType } from '../store/useStore';
import { guessCategory } from '../lib/categorizer';
import { validateIngestionFile } from '../lib/security';
import { extractCitationFieldsFromText, looksLikeCitationDocument } from '../lib/citationFromDocument';
import { yieldForPaint } from '../lib/interaction';
import { EXPENSE_CATEGORY_OPTGROUPS, INCOME_CATEGORY_OPTIONS } from '../lib/quickEntryCategories';
import { formatLocalISODate, parseQuickEntryDateHint } from '../lib/quickEntryNlp';
import { useFullSuiteAccess } from '../hooks/useFullSuiteAccess';
import { clampQuickAddTabForTier, canUseQuickAddTab, isTrackerObligationDebtBlocked } from '../lib/trackerTier';
import { getCustomIcon } from '../lib/customIcons';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Quick Add → Bill/Debt: bill cadence or debt instrument (card vs loan). */
type ObligationKind = 'bill-weekly' | 'bill-biweekly' | 'bill-monthly' | 'debt-card' | 'debt-loan';

export default function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const NlpIcon = getCustomIcon('nlp');
  const UploadIcon = getCustomIcon('upload');
  const { hasFullSuite } = useFullSuiteAccess();
  const trackerOnly = !hasFullSuite;
  const {
    quickAddTab,
    addTransaction,
    addBill,
    addDebt,
    addIncome,
    addCitation,
    lastBudgetGuardrail,
    clearLastBudgetGuardrail,
  } = useStore();
  const [activeTab, setActiveTab] = useState<'transaction' | 'obligation' | 'income' | 'citation'>('transaction');
  const [allowBudgetOverride, setAllowBudgetOverride] = useState(false);

  // Form states
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('food');
  const [date, setDate] = useState(() => formatLocalISODate());
  const [obligationKind, setObligationKind] = useState<ObligationKind>('bill-monthly');
  /** Closed card / no statement cycle — omit payment due date on debt. */
  const [debtNoPaymentDue, setDebtNoPaymentDue] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [vendor, setVendor] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('Salary');
  const [incomeFrequency, setIncomeFrequency] = useState<IncomeSource['frequency']>('Monthly');
  /** Transaction tab: expense vs income/refund (stored as income row). */
  const [transactionLedgerKind, setTransactionLedgerKind] = useState<'expense' | 'income'>('expense');
  const [txIncomeCategory, setTxIncomeCategory] = useState('Reimbursements');
  const [incomeTaxWithheld, setIncomeTaxWithheld] = useState(false);
  const [memoNotes, setMemoNotes] = useState('');
  // Citation-specific states
  const [citationType, setCitationType] = useState('Toll Violation');
  const [jurisdiction, setJurisdiction] = useState('');
  const [citationNumber, setCitationNumber] = useState('');
  const [penaltyFee, setPenaltyFee] = useState('');
  const [apr, setApr] = useState('19.99');
  const [minPayment, setMinPayment] = useState('');
  const [daysLeft, setDaysLeft] = useState('30');
  const [paymentUrl, setPaymentUrl] = useState('');
  // Citation due date (separate from incident date, drives daysLeft)
  const [citationDueDate, setCitationDueDate] = useState('');
  // NLP input state
  const [nlpText, setNlpText] = useState('');
  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannedPreviewUrl, setScannedPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const scanFileInputRef = useRef<HTMLInputElement>(null);
  const scanCameraInputRef = useRef<HTMLInputElement>(null);

  const resetFormPreserveTab = React.useCallback(() => {
    setAmount('');
    setDescription('');
    setVendor('');
    setCategory('food');
    setDate(formatLocalISODate());
    setTransactionLedgerKind('expense');
    setTxIncomeCategory('Reimbursements');
    setMemoNotes('');
    setIncomeTaxWithheld(false);
    setObligationKind('bill-monthly');
    setDueDate('');
    setIncomeCategory('Salary');
    setIncomeFrequency('Monthly');
    setNlpText('');
    setIsScanning(false);
    setErrors({});
    if (scanFileInputRef.current) scanFileInputRef.current.value = '';
    if (scanCameraInputRef.current) scanCameraInputRef.current.value = '';
    setScannedPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setShowPreview(false);
    setCitationType('Toll Violation');
    setJurisdiction('');
    setCitationNumber('');
    setPenaltyFee('');
    setApr('19.99');
    setMinPayment('');
    setDebtNoPaymentDue(false);
    setDaysLeft('30');
    setCitationDueDate('');
    setPaymentUrl('');
    setAllowBudgetOverride(false);
    clearLastBudgetGuardrail();
  }, [clearLastBudgetGuardrail]);

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
      if (amountMatches) {
        const amounts = amountMatches
          .map(m => parseFloat(m.replace(/[^0-9.]/g, '')))
          .filter(n => !isNaN(n) && n > 0 && n < 100_000);
        if (amounts.length > 0) setAmount(Math.max(...amounts).toFixed(2));
      }

      // ── Auto-detect toll / traffic ticket and switch tab ──
      const isCitationDoc = looksLikeCitationDocument(fullText);
      if (isCitationDoc && activeTab !== 'citation') {
        setActiveTab('citation');
      }

      // ── Extract merchant: skip noise, find first meaningful line ──
      const lines = fullText.split('\n').filter(l => l.trim().length > 2);
      const merchantName = extractMerchantName(lines);
      if (merchantName && !isCitationDoc) {
        if (activeTab === 'transaction') setDescription(merchantName);
        else if (activeTab === 'obligation') setVendor(merchantName);
        const guessed = guessCategory(merchantName);
        if (guessed && !(activeTab === 'transaction' && transactionLedgerKind === 'income')) setCategory(guessed);
      }

      if (!merchantName) {
        const guessed = guessCategory(fullText.substring(0, 500));
        if (guessed && !(activeTab === 'transaction' && transactionLedgerKind === 'income')) setCategory(guessed);
      }

      if (isCitationDoc) {
        const cit = extractCitationFieldsFromText(fullText);
        if (cit.citationNumber) setCitationNumber(cit.citationNumber);
        if (cit.jurisdiction) setJurisdiction(cit.jurisdiction);
        if (cit.penaltyFee) setPenaltyFee(cit.penaltyFee);
        setDaysLeft(cit.daysLeft);
        if (cit.citationDueDate) setCitationDueDate(cit.citationDueDate);
        setCitationType(cit.citationType);
      }

      // ── Extract date ──
      const dateMatch = fullText.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/);
      if (dateMatch) {
        try {
          const parsed = new Date(dateMatch[0]);
          if (!isNaN(parsed.getTime())) {
            const dateStr = parsed.toISOString().split('T')[0];
            setDate(dateStr);
            if (activeTab === 'obligation') setDueDate(dateStr);
          }
        } catch {}
      }

      if (!hasFullSuite && !isCitationDoc) {
        setActiveTab('obligation');
        if (merchantName) setVendor(merchantName);
      }

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

  // Revoke preview blob URL whenever the modal closes to prevent memory leak
  useEffect(() => {
    if (!isOpen) {
      setScannedPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
      setShowPreview(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(clampQuickAddTabForTier(quickAddTab, hasFullSuite));
      resetFormPreserveTab();
    }
  }, [isOpen, quickAddTab, resetFormPreserveTab, hasFullSuite]);

  useEffect(() => {
    if (!trackerOnly) return;
    if (obligationKind.startsWith('debt-')) {
      setObligationKind('bill-monthly');
      setDebtNoPaymentDue(false);
    }
  }, [trackerOnly, obligationKind]);

  useEffect(() => {
    if (trackerOnly && (activeTab === 'transaction' || activeTab === 'income')) {
      setActiveTab('obligation');
    }
  }, [trackerOnly, activeTab]);

  useEffect(() => {
    setShowPreview(false);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'obligation' && vendor.length > 2) {
      const guessed = guessCategory(vendor);
      if (guessed) setCategory(guessed);
    } else if (activeTab === 'transaction' && transactionLedgerKind === 'expense' && description.length > 2) {
      const guessed = guessCategory(description);
      if (guessed) setCategory(guessed);
    }
  }, [vendor, description, activeTab, transactionLedgerKind]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) newErrors.amount = "Please enter a valid amount greater than zero.";
    
    if (activeTab === 'transaction') {
      if (!description.trim()) newErrors.description = "Please describe the transaction.";
    } else if (activeTab === 'obligation') {
      if (!vendor.trim()) newErrors.vendor = "Please specify who is being paid.";
      const needDue =
        obligationKind.startsWith('bill-') ||
        (obligationKind.startsWith('debt-') && !debtNoPaymentDue);
      if (needDue && !dueDate) newErrors.dueDate = "Please select a due date.";
    } else if (activeTab === 'income') {
      if (!date) newErrors.date = "Please select a date.";
    } else if (activeTab === 'citation') {
      if (!jurisdiction.trim()) newErrors.jurisdiction = "Please enter the issuing jurisdiction.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNLPInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNlpText(val);

    const hinted = parseQuickEntryDateHint(val);
    if (hinted) setDate(hinted);

    const lower = val.toLowerCase();
    if (/\b(refund|reimburse|reimbursement|deposit from|money back|cashback)\b/i.test(val)) {
      if (hasFullSuite) {
        setActiveTab('transaction');
        setTransactionLedgerKind('income');
        if (/reimburse/i.test(val)) setTxIncomeCategory('Reimbursements');
        else if (/cashback/i.test(val)) setTxIncomeCategory('Other');
        else setTxIncomeCategory('Other');
      } else {
        toast.message('Tracker tier: use Bill or Ticket. Full Suite adds income & expense ledger.');
        setActiveTab('obligation');
      }
    }

    const parts = val.trim().split(/\s+/);
    if (parts.length < 1) return;

    const amountPart = parts.find((p) => /^\$?\d+(\.\d{1,2})?$/.test(p.replace(/,/g, '')));
    if (amountPart) {
      const normalized = amountPart.replace(/[$,]/g, '');
      setAmount(normalized);

      const stripTokens = new Set(
        [
          'today',
          'yesterday',
          'tomorrow',
          'next',
          'week',
          'month',
          'the',
          'of',
          'end',
          'start',
          'bill',
          'due',
          'paid',
          'me',
          'earned',
          'income',
          'refund',
          'reimbursement',
        ].flatMap((w) => [w, `${w}.`]),
      );
      const namePart = parts
        .filter((p) => p !== amountPart && !stripTokens.has(p.toLowerCase()))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (lower.includes('bill') || /\bdue\b/.test(lower)) {
        setActiveTab('obligation');
        if (namePart) setVendor(namePart);
      } else if (hasFullSuite && (lower.includes('earned') || lower.includes('paid me') || /\bpaycheck\b/.test(lower))) {
        setActiveTab('income');
        if (namePart) setDescription(namePart);
      } else if (hasFullSuite && !/\b(refund|reimburse|deposit from|money back|cashback)\b/i.test(val)) {
        setActiveTab('transaction');
        if (namePart) setDescription(namePart);
      } else if (!hasFullSuite && namePart && !/\b(refund|reimburse|deposit from|money back|cashback)\b/i.test(val)) {
        setActiveTab('obligation');
        setVendor(namePart);
      }
    }
  };

  const submitEntry = async (addAnother: boolean) => {
    if (isSubmitting) return;
    if (!validateForm()) return;

    if (trackerOnly) {
      if (!canUseQuickAddTab(activeTab, hasFullSuite)) {
        toast.error('Tracker (free) includes bills and tickets here. Upgrade to Full Suite for ledger and income entries.');
        return;
      }
      if (trackerOnly && activeTab === 'obligation' && isTrackerObligationDebtBlocked(obligationKind, hasFullSuite)) {
        toast.error('Adding loans and credit cards requires Full Suite.');
        return;
      }
    }

    const numAmount = parseFloat(amount);

    setIsSubmitting(true);
    await yieldForPaint();
    try {
      if (activeTab === 'transaction') {
        const isIncome = transactionLedgerKind === 'income';
        const ok = await addTransaction(
          {
            name: description,
            amount: numAmount,
            category: isIncome ? txIncomeCategory : category,
            date: date,
            type: isIncome ? 'income' : 'expense',
            notes: memoNotes.trim() || undefined,
          },
          { allowBudgetOverride: isIncome ? false : allowBudgetOverride },
        );
        if (!ok) return;
        toast.success(isIncome ? 'Income saved to ledger' : 'Transaction saved');
      } else if (activeTab === 'obligation') {
        if (obligationKind.startsWith('bill-')) {
          const freq =
            obligationKind === 'bill-weekly'
              ? 'Weekly'
              : obligationKind === 'bill-biweekly'
                ? 'Bi-weekly'
                : 'Monthly';
          const ok = await addBill({
            biller: vendor,
            amount: numAmount,
            category: category,
            dueDate: dueDate || date,
            frequency: freq,
            status: 'upcoming',
            autoPay: false
          });
          if (!ok) return;
          toast.success(`Bill added`);
        } else {
          const ok = await addDebt({
            name: vendor,
            type: obligationKind === 'debt-card' ? 'Credit Card' : 'Loan',
            apr: parseFloat(apr) || 0,
            remaining: numAmount,
            minPayment: parseFloat(minPayment) || 0,
            paid: 0,
            paymentDueDate: debtNoPaymentDue ? null : dueDate || null,
          });
          if (!ok) return;
          toast.success(`Debt recorded`);
        }
      } else if (activeTab === 'income') {
        const ok = await addIncome({
          name: description.trim() || incomeCategory,
          amount: numAmount,
          frequency: incomeFrequency,
          category: incomeCategory,
          nextDate: date,
          status: 'active',
          isTaxWithheld: incomeTaxWithheld,
        });
        if (!ok) return;
        toast.success(`Income recorded`);
      } else if (activeTab === 'citation') {
        const ok = await addCitation({
          type: citationType,
          jurisdiction: jurisdiction.trim(),
          daysLeft: parseInt(daysLeft) || 30,
          amount: numAmount,
          penaltyFee: parseFloat(penaltyFee) || 0,
          date: date,
          citationNumber: citationNumber.trim(),
          paymentUrl: (() => {
            const u = paymentUrl.trim();
            if (!u) return '';
            try {
              const parsed = new URL(u);
              return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? u : '';
            } catch { return ''; }
          })(),
          status: 'open',
        });
        if (!ok) return;
        toast.success(`Citation recorded`);
        if (addAnother) {
          resetFormPreserveTab();
          return;
        }
        onClose();
        return;
      }
      if (addAnother) {
        resetFormPreserveTab();
        return;
      }
      onClose();
    } catch (error) {
      toast.error('Failed to save to ledger');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitEntry(false);
  };

  const tabOrder = (trackerOnly ? (['obligation', 'citation'] as const) : (['transaction', 'obligation', 'income', 'citation'] as const));
  const focusTabAt = (idx: number) => {
    const tab = tabOrder[idx];
    if (!tab) return;
    setActiveTab(tab as TabType);
    setErrors({});
  };
  const onTabListKeyDown = (e: React.KeyboardEvent) => {
    const i = tabOrder.findIndex((t) => t === activeTab);
    if (i < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusTabAt((i + 1) % tabOrder.length);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusTabAt((i - 1 + tabOrder.length) % tabOrder.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusTabAt(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusTabAt(tabOrder.length - 1);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog 
          open={isOpen} 
          onClose={onClose} 
          className="relative z-50"
        >
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60" 
            aria-hidden="true" 
          />

          <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-0">
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full sm:max-w-md"
            >
              <Dialog.Panel className="flex max-h-[90vh] min-h-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-elevated shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-raised shrink-0">
                  <Dialog.Title className="text-sm font-sans font-semibold text-content-primary">
                    Quick Entry
                  </Dialog.Title>
                  <button 
                    onClick={onClose} 
                    className="text-content-tertiary hover:text-content-primary transition-colors focus-app rounded-lg"
                  >
                    <span className="sr-only">Close</span>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide w-full">
                  {/* Scan Document Strip */}
                  <div className="bg-surface-base border-b border-surface-border">
                    <div className="px-6 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest">
                          Scan receipt, image or PDF
                        </p>
                        <p className="text-[8px] font-mono text-content-muted uppercase tracking-widest mt-0.5">
                          JPG · PNG · WEBP · PDF
                        </p>
                        <p className="text-[10px] font-sans text-content-muted mt-2 leading-snug max-w-md">
                          Review amount, entry type, and category before saving — OCR can misread symbols or merchants.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end min-w-0 w-full sm:w-auto">
                        {scannedPreviewUrl && (
                          <button
                            type="button"
                            onClick={() => setShowPreview(p => !p)}
                            className={`shrink-0 p-2 rounded-lg border transition-all ${showPreview ? 'border-surface-border text-content-primary bg-content-primary/[0.06]' : 'border-surface-border text-content-tertiary hover:text-content-primary hover:bg-surface-elevated'}`}
                            title={showPreview ? 'Hide document' : 'Show document'}
                          >
                            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <div className="grid grid-cols-2 gap-2 flex-1 min-w-0 sm:min-w-[260px]">
                          <label className={`relative flex min-h-[2.5rem] w-full items-center justify-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer select-none text-center leading-tight
                            ${isScanning
                              ? 'border-surface-border bg-content-primary/[0.06] text-content-secondary cursor-not-allowed'
                              : 'border-surface-border bg-surface-raised text-content-secondary hover:text-content-primary hover:bg-content-primary/[0.04]'
                            }`}>
                            <input
                              ref={scanCameraInputRef}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed w-full h-full"
                              onChange={handleScanFile}
                              disabled={isScanning}
                            />
                            <Camera className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            <span>Camera</span>
                          </label>
                          <label className={`relative flex min-h-[2.5rem] w-full items-center justify-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer select-none text-center leading-tight
                            ${isScanning
                              ? 'border-surface-border bg-content-primary/[0.06] text-content-secondary cursor-not-allowed'
                              : 'border-surface-border bg-surface-raised text-content-secondary hover:text-content-primary hover:bg-content-primary/[0.04]'
                            }`}>
                            <input
                              ref={scanFileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed w-full h-full"
                              onChange={handleScanFile}
                              disabled={isScanning}
                            />
                            {isScanning ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" aria-hidden />
                                <span>Scanning...</span>
                              </>
                            ) : (
                              <>
                                <UploadIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                <span>{scannedPreviewUrl ? 'Rescan file' : 'Upload file'}</span>
                              </>
                            )}
                          </label>
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
                          className="border-t border-surface-border"
                        >
                          <div className="relative flex min-h-[7rem] max-h-[min(14rem,42svh)] w-full items-center justify-center border-surface-border bg-surface-base px-2 py-3">
                            <img
                              src={scannedPreviewUrl}
                              alt="Scanned document"
                              className="max-h-[min(14rem,42svh)] w-full object-contain object-center"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Smart Input Bar */}
                  <div className="bg-surface-base p-6 border-b border-surface-border">
                    <div className="flex items-center gap-2 mb-3">
                      <NlpIcon className="w-4 h-4 text-content-secondary" />
                      <span className="text-xs font-sans font-medium text-content-secondary">Natural Language Speed Input</span>
                    </div>
                    
                    <textarea
                      placeholder={hasFullSuite ? "e.g. Coffee 5.50 tomorrow · Amazon refund 42.10 · Comcast bill 120 next Tuesday · 15th 89 gas" : "e.g. Rent 1200 on the 1st · Internet bill 80 next Tuesday · Parking ticket 65 due Friday"}
                      value={nlpText}
                      onChange={handleNLPInput}
                      className="w-full bg-surface-raised border border-surface-border rounded-lg focus-app-field text-sm font-sans text-content-primary placeholder:text-content-muted p-3 resize-none transition-colors"
                      rows={2}
                    />
                  </div>

                  {/* Tabs */}
                    <div
                      role="tablist"
                      aria-label="Record type"
                      onKeyDown={onTabListKeyDown}
                      className="flex flex-wrap border-b border-surface-border bg-surface-raised p-1 gap-1"
                    >
                    {hasFullSuite && (
                    <button
                      type="button"
                      role="tab"
                      id="qa-tab-transaction"
                      aria-selected={activeTab === 'transaction'}
                      aria-controls="quick-add-form"
                      tabIndex={activeTab === 'transaction' ? 0 : -1}
                      onClick={() => {
                        setActiveTab('transaction');
                        setErrors({});
                      }}
                      className={`min-w-[5.5rem] flex-1 py-2 text-xs font-sans font-medium transition-all rounded-lg ${
                        activeTab === 'transaction' ? 'bg-brand-cta text-surface-base' : 'text-content-tertiary hover:text-content-primary hover:bg-surface-elevated'
                      } focus-app`}
                    >
                      Expense
                    </button>
                    )}
                    <button
                      type="button"
                      role="tab"
                      id="qa-tab-obligation"
                      aria-selected={activeTab === 'obligation'}
                      aria-controls="quick-add-form"
                      tabIndex={activeTab === 'obligation' ? 0 : -1}
                      onClick={() => {
                        setActiveTab('obligation');
                        setErrors({});
                      }}
                      className={`min-w-[5.5rem] flex-1 py-2 text-xs font-sans font-medium transition-all rounded-lg ${
                        activeTab === 'obligation' ? 'bg-brand-cta text-surface-base' : 'text-content-tertiary hover:text-content-primary hover:bg-surface-elevated'
                      } focus-app`}
                    >
                      {hasFullSuite ? 'Bill/Debt' : 'Bill'}
                    </button>
                    {hasFullSuite && (
                    <button
                      type="button"
                      role="tab"
                      id="qa-tab-income"
                      aria-selected={activeTab === 'income'}
                      aria-controls="quick-add-form"
                      tabIndex={activeTab === 'income' ? 0 : -1}
                      onClick={() => {
                        setActiveTab('income');
                        setErrors({});
                      }}
                      className={`min-w-[5.5rem] flex-1 py-2 text-xs font-sans font-medium transition-all rounded-lg ${
                        activeTab === 'income' ? 'bg-brand-cta text-surface-base' : 'text-content-tertiary hover:text-content-primary hover:bg-surface-elevated'
                      } focus-app`}
                    >
                      Income
                    </button>
                    )}
                    <button
                      type="button"
                      role="tab"
                      id="qa-tab-citation"
                      aria-selected={activeTab === 'citation'}
                      aria-controls="quick-add-form"
                      tabIndex={activeTab === 'citation' ? 0 : -1}
                      onClick={() => {
                        setActiveTab('citation');
                        setErrors({});
                      }}
                      className={`min-w-[5.5rem] flex-1 py-2 text-xs font-sans font-medium transition-all rounded-lg flex items-center justify-center gap-1.5 ${
                        activeTab === 'citation' ? 'bg-content-primary/[0.08] text-content-primary border border-surface-border' : 'text-content-tertiary hover:text-content-primary hover:bg-surface-elevated'
                      } focus-app`}
                    >
                      <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
                      Ticket
                    </button>
                  </div>

                  {/* Form Body */}
                  <form
                    id="quick-add-form"
                    onSubmit={handleFormSubmit}
                    role="tabpanel"
                    aria-labelledby={`qa-tab-${activeTab}`}
                    className="p-6 space-y-5"
                  >
                    
                    {/* AMOUNT FIELD (ALWAYS PRESENT) */}
                    <div>
                      <label htmlFor="amount" className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary font-medium">$</span>
                        <input
                          id="amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={amount}
                          onChange={(e) => { setAmount(e.target.value); if(errors.amount) setErrors({...errors, amount: ''}); }}
                          placeholder="0.00"
                          className={`w-full bg-surface-base border ${errors.amount ? 'border-red-500/50' : 'border-surface-border'} rounded-lg focus-app-field pl-7 py-2.5 text-base font-sans font-semibold text-content-primary placeholder:text-content-muted transition-colors`}
                        />
                      </div>
                      {errors.amount && (
                        <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5"><AlertCircle className="w-3 h-3" /> {errors.amount}</p>
                      )}
                    </div>

                    {/* TRANSACTION (expense or income/refund) */}
                    {activeTab === 'transaction' && (
                      <>
                        {lastBudgetGuardrail && transactionLedgerKind === 'expense' && (
                          <div
                            className={`rounded-lg border px-3 py-2 text-xs ${
                              lastBudgetGuardrail.type === 'hard'
                                ? 'border-red-500/35 bg-red-500/10 text-red-200'
                                : 'border-amber-500/35 bg-amber-500/10 text-amber-100'
                            }`}
                          >
                            <p className="font-medium">{lastBudgetGuardrail.message}</p>
                            <p className="mt-1 text-content-secondary">
                              Allowed ${lastBudgetGuardrail.allowed.toFixed(2)} this {lastBudgetGuardrail.period.toLowerCase()},
                              attempted ${lastBudgetGuardrail.attempted.toFixed(2)}.
                            </p>
                            {lastBudgetGuardrail.type === 'soft' && (
                              <label className="mt-2 inline-flex items-center gap-2 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={allowBudgetOverride}
                                  onChange={(e) => setAllowBudgetOverride(e.target.checked)}
                                  className="h-3.5 w-3.5 rounded border-surface-border bg-surface-base text-amber-400 focus-app"
                                />
                                Save anyway for this one transaction
                              </label>
                            )}
                          </div>
                        )}

                        <div>
                          <label htmlFor="description" className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Description</label>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <input
                                id="description"
                                type="text"
                                value={description}
                                onChange={(e) => { setDescription(e.target.value); if(errors.description) setErrors({...errors, description: ''}); }}
                                placeholder="E.g., Whole Foods"
                                className={`w-full bg-surface-base border ${errors.description ? 'border-red-500/50' : 'border-surface-border'} rounded-lg focus-app-field px-3 py-2.5 text-sm font-sans text-content-primary placeholder:text-content-muted transition-colors`}
                              />
                            </div>
                            {description.length > 2 && (
                              <div className="shrink-0 flex items-center justify-center bg-surface-base border border-surface-border rounded w-10">
                                <BrandLogo name={description} size="sm" />
                              </div>
                            )}
                          </div>
                          {errors.description && (
                            <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5"><AlertCircle className="w-3 h-3" /> {errors.description}</p>
                          )}
                        </div>

                        <div className="rounded-lg border border-surface-border bg-surface-base p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-xs font-medium text-content-tertiary">Ledger</span>
                            <div
                              className="flex rounded-lg border border-surface-border p-0.5 bg-surface-raised gap-0.5"
                              role="group"
                              aria-label="Expense or income"
                            >
                              <button
                                type="button"
                                onClick={() => setTransactionLedgerKind('expense')}
                                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-sans font-medium transition-colors ${
                                  transactionLedgerKind === 'expense'
                                    ? 'bg-brand-cta text-surface-base'
                                    : 'text-content-tertiary hover:text-content-primary'
                                } focus-app`}
                              >
                                Expense
                              </button>
                              <button
                                type="button"
                                onClick={() => setTransactionLedgerKind('income')}
                                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-sans font-medium transition-colors ${
                                  transactionLedgerKind === 'income'
                                    ? 'bg-brand-cta text-surface-base'
                                    : 'text-content-tertiary hover:text-content-primary'
                                } focus-app`}
                              >
                                Income / refund
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] text-content-muted mt-2 leading-snug">
                            Refunds and deposits save as income; choose the category that matches the source.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="transaction-category" className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">
                              {transactionLedgerKind === 'expense' ? 'Expense category' : 'Income category'}
                            </label>
                            {transactionLedgerKind === 'expense' ? (
                              <select
                                id="transaction-category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-surface-base border border-surface-border rounded-lg focus-app-field px-3 py-2 text-sm font-sans text-content-primary cursor-pointer"
                              >
                                {EXPENSE_CATEGORY_OPTGROUPS.map((g) => (
                                  <optgroup key={g.label} label={g.label}>
                                    {g.options.map((o) => (
                                      <option key={o.value} value={o.value}>
                                        {o.label}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            ) : (
                              <select
                                id="transaction-category"
                                value={txIncomeCategory}
                                onChange={(e) => setTxIncomeCategory(e.target.value)}
                                className="w-full bg-surface-base border border-surface-border rounded-lg focus-app-field px-3 py-2 text-sm font-sans text-content-primary cursor-pointer"
                              >
                                {INCOME_CATEGORY_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div>
                            <label htmlFor="date" className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Date</label>
                            <input
                              id="date"
                              type="date"
                              value={date}
                              onChange={(e) => setDate(e.target.value)}
                              className="input-date-dark w-full bg-surface-base border border-surface-border rounded-lg focus-app-field px-3 py-2 text-sm font-sans"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="memoNotes" className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">
                            Notes <span className="text-content-muted font-normal">(optional)</span>
                          </label>
                          <textarea
                            id="memoNotes"
                            value={memoNotes}
                            onChange={(e) => setMemoNotes(e.target.value)}
                            placeholder="Split with roommate, business trip, etc."
                            rows={2}
                            className="w-full bg-surface-base border border-surface-border rounded-lg focus-app-field text-sm font-sans text-content-primary placeholder:text-content-muted p-3 resize-none transition-colors"
                          />
                        </div>
                      </>
                    )}

                    {/* OBLIGATION FIELDS */}
                    {activeTab === 'obligation' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Type</label>
                            <select 
                              value={obligationKind}
                              onChange={(e) => {
                                const v = e.target.value as ObligationKind;
                                setObligationKind(v);
                                if (v.startsWith('bill-')) setDebtNoPaymentDue(false);
                              }}
                              className="w-full bg-surface-base border border-surface-border rounded-lg focus-app-field px-3 py-2 text-sm font-sans text-content-primary cursor-pointer"
                            >
                              <option value="bill-weekly">Weekly bill</option>
                              <option value="bill-biweekly">Bi-weekly bill</option>
                              <option value="bill-monthly">Monthly bill</option>
                              {hasFullSuite && (
                                <>
                                  <option value="debt-card">Credit card</option>
                                  <option value="debt-loan">Loan</option>
                                </>
                              )}
                            </select>
                            <p className="text-[10px] font-mono text-content-tertiary mt-1.5 leading-snug">
                              {obligationKind.startsWith('bill-')
                                ? 'Amount is per bill cycle (weekly, bi-weekly, or monthly).'
                                : 'Balance owed; APR and minimum payment are optional.'}
                            </p>
                          </div>
                          <div>
                            <label htmlFor="dueDate" className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">
                              {obligationKind.startsWith('debt-') ? 'Payment due date' : 'Due Date'}
                            </label>
                            <input
                              id="dueDate"
                              type="date"
                              value={dueDate}
                              disabled={obligationKind.startsWith('debt-') && debtNoPaymentDue}
                              onChange={(e) => { setDueDate(e.target.value); if(errors.dueDate) setErrors({...errors, dueDate: ''}); }}
                              className={`input-date-dark w-full bg-surface-base border ${errors.dueDate ? 'border-red-500/50' : 'border-surface-border'} rounded-lg focus-app-field px-3 py-2 text-sm font-sans disabled:opacity-40`}
                            />
                            {errors.dueDate && <p className="text-xs text-red-400 mt-1.5">{errors.dueDate}</p>}
                            {obligationKind.startsWith('debt-') && (
                              <label className="mt-2 flex items-center gap-2 text-[11px] text-content-tertiary cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={debtNoPaymentDue}
                                  onChange={(e) => {
                                    setDebtNoPaymentDue(e.target.checked);
                                    if (e.target.checked && errors.dueDate) setErrors({ ...errors, dueDate: '' });
                                  }}
                                  className="rounded border-surface-border focus-app"
                                />
                                No payment due date (closed card, charge-off, etc.)
                              </label>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="vendor" className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Biller Name</label>
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <input
                                  id="vendor"
                                  type="text"
                                  value={vendor}
                                  onChange={(e) => { setVendor(e.target.value); if(errors.vendor) setErrors({...errors, vendor: ''}); }}
                                  placeholder={
                                    obligationKind.startsWith('bill-')
                                      ? 'E.g., AT&T'
                                      : obligationKind === 'debt-card'
                                        ? 'E.g., Chase Sapphire'
                                        : 'E.g., SoFi Personal Loan'
                                  }
                                  className={`w-full bg-surface-base border ${errors.vendor ? 'border-red-500/50' : 'border-surface-border'} rounded-lg focus-app-field px-3 py-2.5 text-sm font-sans text-content-primary placeholder:text-content-muted transition-colors`}
                                />
                              </div>
                            </div>
                            {errors.vendor && (
                              <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5"><AlertCircle className="w-3 h-3" /> {errors.vendor}</p>
                            )}
                          </div>
                          <div>
                            <label htmlFor="billCategory" className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Category</label>
                            <select 
                              id="billCategory"
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full bg-surface-base border border-surface-border rounded-lg focus-app-field px-3 py-2.5 text-sm font-sans text-content-primary cursor-pointer"
                            >
                              {EXPENSE_CATEGORY_OPTGROUPS.map((g) => (
                                <optgroup key={g.label} label={g.label}>
                                  {g.options.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>
                        </div>
                        {obligationKind.startsWith('debt-') && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="apr" className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">APR (%)</label>
                              <input
                                id="apr"
                                type="number"
                                step="0.01"
                                value={apr}
                                onChange={(e) => setApr(e.target.value)}
                                placeholder="19.99"
                                className="w-full bg-surface-base border border-surface-border rounded-lg focus-app-field px-3 py-2 text-sm font-sans text-content-primary"
                              />
                            </div>
                            <div>
                              <label htmlFor="minPayment" className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Min Payment ($)</label>
                              <input
                                id="minPayment"
                                type="number"
                                step="0.01"
                                value={minPayment}
                                onChange={(e) => setMinPayment(e.target.value)}
                                placeholder="Auto"
                                className="w-full bg-surface-base border border-surface-border rounded-lg focus-app-field px-3 py-2 text-sm font-sans text-content-primary"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* CITATION FIELDS */}
                    {activeTab === 'citation' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Type</label>
                            <select
                              value={citationType}
                              onChange={(e) => setCitationType(e.target.value)}
                              className="w-full bg-surface-base border border-surface-border rounded focus-app-field-rose px-3 py-2 text-sm font-sans text-content-primary cursor-pointer"
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
                            <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">
                              Payment Due Date
                            </label>
                            <input
                              type="date"
                              value={citationDueDate}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCitationDueDate(val);
                                if (val) {
                                  const days = Math.max(0, Math.round((new Date(val).getTime() - Date.now()) / 86400000));
                                  setDaysLeft(String(days));
                                }
                              }}
                              className="input-date-dark w-full bg-surface-base border border-surface-border rounded focus-app-field-rose px-3 py-2 text-sm font-sans"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">
                            Issuing Jurisdiction <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={jurisdiction}
                            onChange={(e) => { setJurisdiction(e.target.value); if (errors.jurisdiction) setErrors({ ...errors, jurisdiction: '' }); }}
                            placeholder="E.g., Dallas County, TX"
                            className={`w-full bg-surface-base border ${errors.jurisdiction ? 'border-red-500/50' : 'border-surface-border'} rounded focus-app-field-rose px-3 py-2.5 text-sm font-sans text-content-primary placeholder:text-content-muted transition-colors`}
                          />
                          {errors.jurisdiction && (
                            <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5"><AlertCircle className="w-3 h-3" /> {errors.jurisdiction}</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Citation / Ticket #</label>
                            <input
                              type="text"
                              value={citationNumber}
                              onChange={(e) => setCitationNumber(e.target.value)}
                              placeholder="E.g., TN-20394857"
                              className="w-full bg-surface-base border border-surface-border rounded focus-app-field-rose px-3 py-2.5 text-sm font-mono text-content-primary placeholder:text-content-muted transition-colors uppercase"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Penalty / Late Fee ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={penaltyFee}
                              onChange={(e) => setPenaltyFee(e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-surface-base border border-surface-border rounded focus-app-field-rose px-3 py-2.5 text-sm font-sans text-content-primary placeholder:text-content-muted"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Payment URL <span className="text-content-muted">(optional)</span></label>
                          <input
                            type="url"
                            value={paymentUrl}
                            onChange={(e) => setPaymentUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-surface-base border border-surface-border rounded focus-app-field-rose px-3 py-2.5 text-sm font-sans text-content-primary placeholder:text-content-muted transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Incident Date</label>
                          <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="input-date-dark w-full bg-surface-base border border-surface-border rounded focus-app-field-rose px-3 py-2 text-sm font-sans"
                          />
                        </div>
                      </>
                    )}

                    {/* INCOME FIELDS */}
                    {activeTab === 'income' && (
                      <>
                        <div>
                          <label htmlFor="incomeName" className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Name</label>
                          <input
                            id="incomeName"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="E.g., Google Paycheck, Client Invoice"
                            className="w-full bg-surface-base border border-surface-border rounded-lg focus-app-field px-3 py-2.5 text-sm font-sans text-content-primary placeholder:text-content-muted transition-colors"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Income category</label>
                            <select
                              value={incomeCategory}
                              onChange={(e) => setIncomeCategory(e.target.value)}
                              className="w-full bg-surface-base border border-surface-border rounded-lg focus-app-field px-3 py-2 text-sm font-sans text-content-primary cursor-pointer"
                            >
                              {INCOME_CATEGORY_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Frequency</label>
                            <select
                              value={incomeFrequency}
                              onChange={(e) => setIncomeFrequency(e.target.value as IncomeSource['frequency'])}
                              className="w-full bg-surface-base border border-surface-border rounded-lg focus-app-field px-3 py-2 text-sm font-sans text-content-primary cursor-pointer"
                            >
                              <option value="Weekly">Weekly</option>
                              <option value="Bi-weekly">Bi-weekly</option>
                              <option value="Monthly">Monthly</option>
                              <option value="Yearly">Yearly</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label htmlFor="incDate" className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Next pay date</label>
                          <input
                            id="incDate"
                            type="date"
                            value={date}
                            onChange={(e) => { setDate(e.target.value); if(errors.date) setErrors({...errors, date: ''}); }}
                            className={`input-date-dark w-full bg-surface-base border ${errors.date ? 'border-red-500/50' : 'border-surface-border'} rounded-lg focus-app-field px-3 py-2 text-sm font-sans`}
                          />
                          {errors.date && <p className="text-xs text-red-400 mt-1.5">{errors.date}</p>}
                        </div>
                        <label className="flex items-start gap-2.5 text-xs text-content-secondary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={incomeTaxWithheld}
                            onChange={(e) => setIncomeTaxWithheld(e.target.checked)}
                            className="mt-0.5 rounded border-surface-border bg-surface-base focus-app"
                          />
                          <span>Taxes withheld (typical W-2 paycheck). Leave off for gross 1099 or contract pay.</span>
                        </label>
                      </>
                    )}

                  </form>
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 border-t border-surface-border bg-surface-raised shrink-0 flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-sans font-medium text-content-tertiary hover:text-content-primary transition-colors focus-app rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitEntry(true)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg text-sm font-sans font-medium border border-surface-border text-content-secondary hover:text-content-primary hover:bg-surface-elevated transition-colors focus-app disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving…' : 'Save & add another'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitEntry(false)}
                    disabled={isSubmitting}
                    className={`px-5 py-2 rounded-lg text-sm font-sans font-medium transition-colors focus-app disabled:opacity-50 ${
                      activeTab === 'citation'
                        ? 'bg-brand-cta text-surface-base hover:bg-brand-cta-hover border border-surface-border'
                        : 'bg-brand-cta text-surface-base hover:bg-brand-cta-hover'
                    }`}
                  >
                    {isSubmitting ? 'Saving…' : 'Save entry'}
                  </button>
                </div>
              </Dialog.Panel>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
