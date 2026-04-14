import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Terminal, AlertCircle, Loader2, Camera, Eye, EyeOff, AlertTriangle, UploadCloud } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { toast } from 'sonner';
import { useStore, type IncomeSource } from '../store/useStore';
import { guessCategory } from '../lib/categorizer';
import { validateIngestionFile } from '../lib/security';
import { extractCitationFieldsFromText, looksLikeCitationDocument } from '../lib/citationFromDocument';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Quick Add → Bill/Debt: bill cadence or debt instrument (card vs loan). */
type ObligationKind = 'bill-weekly' | 'bill-biweekly' | 'bill-monthly' | 'debt-card' | 'debt-loan';

export default function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const { quickAddTab, addTransaction, addBill, addDebt, addIncome, addCitation } = useStore();
  const [activeTab, setActiveTab] = useState<'transaction' | 'obligation' | 'income' | 'citation'>('transaction');

  // Form states
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [obligationKind, setObligationKind] = useState<ObligationKind>('bill-monthly');
  /** Closed card / no statement cycle — omit payment due date on debt. */
  const [debtNoPaymentDue, setDebtNoPaymentDue] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [vendor, setVendor] = useState('');
  const [source, setSource] = useState('salary');
  const [incomeFrequency, setIncomeFrequency] = useState<IncomeSource['frequency']>('Monthly');
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
        if (guessed) setCategory(guessed);
      }

      if (!merchantName) {
        const guessed = guessCategory(fullText.substring(0, 500));
        if (guessed) setCategory(guessed);
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
      setActiveTab(quickAddTab);
      setAmount('');
      setDescription('');
      setVendor('');
      setCategory('food');
      setDate(new Date().toISOString().split('T')[0]);
      setObligationKind('bill-monthly');
      setDueDate('');
      setSource('salary');
      setIncomeFrequency('Monthly');
      setNlpText('');
      setIsScanning(false);
      setErrors({});
      if (scanFileInputRef.current) scanFileInputRef.current.value = '';
      if (scanCameraInputRef.current) scanCameraInputRef.current.value = '';
      setScannedPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
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
    }
  }, [isOpen, quickAddTab]);

  useEffect(() => {
    if (activeTab === 'obligation' && vendor.length > 2) {
      const guessed = guessCategory(vendor);
      if (guessed) setCategory(guessed);
    } else if (activeTab === 'transaction' && description.length > 2) {
      const guessed = guessCategory(description);
      if (guessed) setCategory(guessed);
    }
  }, [vendor, description, activeTab]);

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
    
    // Simple NLP parsing
    const parts = val.trim().split(/\s+/);
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1].toLowerCase();
      
      // Date parsing check
      if (lastPart === 'today') setDate(new Date().toISOString().split('T')[0]);
      if (lastPart === 'yesterday') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        setDate(d.toISOString().split('T')[0]);
      }
      if (lastPart === 'tomorrow') {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        setDate(d.toISOString().split('T')[0]);
      }

      // Find amount (e.g. 50 or $50)
      const amountPart = parts.find(p => p.match(/^\$?\d+(\.\d{2})?$/));
      if (amountPart) {
        setAmount(amountPart.replace('$', ''));
        const namePart = parts.filter(p => p !== amountPart && !['today', 'yesterday', 'tomorrow'].includes(p.toLowerCase())).join(' ');
        
        if (val.toLowerCase().includes('bill') || val.toLowerCase().includes('due')) {
          setActiveTab('obligation');
          setVendor(namePart);
        } else if (val.toLowerCase().includes('earned') || val.toLowerCase().includes('paid me')) {
          setActiveTab('income');
        } else {
          setActiveTab('transaction');
          setDescription(namePart);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    const numAmount = parseFloat(amount);

    try {
      if (activeTab === 'transaction') {
        const ok = await addTransaction({
          name: description,
          amount: numAmount,
          category: category,
          date: date,
          type: 'expense'
        });
        if (!ok) return;
        toast.success(`Transaction saved`);
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
          name: description.trim() || source,
          amount: numAmount,
          frequency: incomeFrequency,
          category: 'Income',
          nextDate: date,
          status: 'active',
          isTaxWithheld: false
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
        onClose();
        return;
      }
      onClose();
    } catch (error) {
      toast.error('Failed to save to ledger');
      console.error(error);
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
              <Dialog.Panel className="rounded shadow-xl bg-surface-elevated border border-surface-border overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-raised shrink-0">
                  <Dialog.Title className="text-sm font-sans font-semibold text-white">
                    Quick Entry
                  </Dialog.Title>
                  <button 
                    onClick={onClose} 
                    className="text-content-tertiary hover:text-white transition-colors focus-app rounded-sm"
                  >
                    <span className="sr-only">Close</span>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto w-full">
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
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end min-w-0 w-full sm:w-auto">
                        {scannedPreviewUrl && (
                          <button
                            type="button"
                            onClick={() => setShowPreview(p => !p)}
                            className={`shrink-0 p-2 rounded-sm border transition-all ${showPreview ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10' : 'border-surface-border text-content-tertiary hover:text-white hover:bg-surface-elevated'}`}
                            title={showPreview ? 'Hide document' : 'Show document'}
                          >
                            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <div className="grid grid-cols-2 gap-2 flex-1 min-w-0 sm:min-w-[260px]">
                          <label className={`relative flex min-h-[2.5rem] w-full items-center justify-center gap-2 px-3 py-2 rounded-sm border text-[10px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer select-none text-center leading-tight
                            ${isScanning
                              ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400 cursor-not-allowed'
                              : 'border-surface-border bg-surface-raised text-content-secondary hover:border-indigo-500/50 hover:text-white hover:bg-indigo-500/5'
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
                          <label className={`relative flex min-h-[2.5rem] w-full items-center justify-center gap-2 px-3 py-2 rounded-sm border text-[10px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer select-none text-center leading-tight
                            ${isScanning
                              ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400 cursor-not-allowed'
                              : 'border-surface-border bg-surface-raised text-content-secondary hover:border-indigo-500/50 hover:text-white hover:bg-indigo-500/5'
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
                                <UploadCloud className="w-3.5 h-3.5 shrink-0" aria-hidden />
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
                          <div className="relative max-h-56 overflow-hidden bg-black flex items-center justify-center">
                            <img
                              src={scannedPreviewUrl}
                              alt="Scanned document"
                              className="max-h-56 w-auto object-contain"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Smart Input Bar */}
                  <div className="bg-surface-base p-6 border-b border-surface-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Terminal className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-sans font-medium text-content-secondary">Natural Language Speed Input</span>
                    </div>
                    
                    <textarea
                      placeholder="e.g. 'Coffee 5.50 today' or 'Comcast bill 120 next tuesday'"
                      value={nlpText}
                      onChange={handleNLPInput}
                      className="w-full bg-surface-raised border border-surface-border rounded focus-app-field-indigo text-sm font-sans text-white placeholder:text-content-muted p-3 resize-none transition-colors"
                      rows={2}
                    />
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-surface-border bg-surface-raised p-1 gap-1">
                    <button
                      onClick={() => { setActiveTab('transaction'); setErrors({}); }}
                      className={`flex-1 py-2 text-xs font-sans font-medium transition-all rounded ${
                        activeTab === 'transaction' ? 'bg-surface-border text-white shadow-sm' : 'text-content-tertiary hover:text-content-primary hover:bg-surface-elevated'
                      } focus-app`}
                    >
                      Expense
                    </button>
                    <button
                      onClick={() => { setActiveTab('obligation'); setErrors({}); }}
                      className={`flex-1 py-2 text-xs font-sans font-medium transition-all rounded ${
                        activeTab === 'obligation' ? 'bg-surface-border text-white shadow-sm' : 'text-content-tertiary hover:text-content-primary hover:bg-surface-elevated'
                      } focus-app`}
                    >
                      Bill/Debt
                    </button>
                    <button
                      onClick={() => { setActiveTab('income'); setErrors({}); }}
                      className={`flex-1 py-2 text-xs font-sans font-medium transition-all rounded ${
                        activeTab === 'income' ? 'bg-surface-border text-white shadow-sm' : 'text-content-tertiary hover:text-content-primary hover:bg-surface-elevated'
                      } focus-app`}
                    >
                      Income
                    </button>
                    <button
                      onClick={() => { setActiveTab('citation'); setErrors({}); }}
                      className={`flex-1 py-2 text-xs font-sans font-medium transition-all rounded flex items-center justify-center gap-1.5 ${
                        activeTab === 'citation' ? 'bg-rose-500/20 text-rose-300 shadow-sm' : 'text-content-tertiary hover:text-content-primary hover:bg-surface-elevated'
                      } focus-app`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Ticket
                    </button>
                  </div>

                  {/* Form Body */}
                  <form id="quick-add-form" onSubmit={handleSubmit} className="p-6 space-y-5">
                    
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
                          className={`w-full bg-surface-base border ${errors.amount ? 'border-red-500/50' : 'border-surface-border'} rounded focus-app-field-indigo pl-7 py-2.5 text-base font-sans font-semibold text-white placeholder:text-content-muted transition-colors`}
                        />
                      </div>
                      {errors.amount && (
                        <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5"><AlertCircle className="w-3 h-3" /> {errors.amount}</p>
                      )}
                    </div>

                    {/* EXPENSE FIELDS */}
                    {activeTab === 'transaction' && (
                      <>
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
                                className={`w-full bg-surface-base border ${errors.description ? 'border-red-500/50' : 'border-surface-border'} rounded focus-app-field-indigo px-3 py-2.5 text-sm font-sans text-white placeholder:text-content-muted transition-colors`}
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

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="category" className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Category</label>
                            <select 
                              id="category"
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full bg-surface-base border border-surface-border rounded focus-app-field-indigo px-3 py-2 text-sm font-sans text-white cursor-pointer"
                            >
                              <option value="housing">Housing & Rent</option>
                              <option value="utilities">Utilities & Telecom</option>
                              <option value="subscriptions">Subscriptions</option>
                              <option value="insurance">Insurance</option>
                              <option value="auto">Auto & Car Payment</option>
                              <option value="health">Health & Medical</option>
                              <option value="education">Education & Loans</option>
                              <option value="childcare">Childcare</option>
                              <option value="personal">Personal Care & Gym</option>
                              <option value="taxes">Taxes</option>
                              <option value="business">Business & Software</option>
                              <option value="food">Food & Dining</option>
                              <option value="transport">Transportation</option>
                              <option value="shopping">Shopping</option>
                              <option value="entertainment">Entertainment</option>
                              <option value="debt">Debt Services</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor="date" className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Date</label>
                            <input
                              id="date"
                              type="date"
                              value={date}
                              onChange={(e) => setDate(e.target.value)}
                              className="input-date-dark w-full bg-surface-base border border-surface-border rounded focus-app-field-indigo px-3 py-2 text-sm font-sans"
                            />
                          </div>
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
                              className="w-full bg-surface-base border border-surface-border rounded focus-app-field-indigo px-3 py-2 text-sm font-sans text-white cursor-pointer"
                            >
                              <option value="bill-weekly">Weekly bill</option>
                              <option value="bill-biweekly">Bi-weekly bill</option>
                              <option value="bill-monthly">Monthly bill</option>
                              <option value="debt-card">Credit card</option>
                              <option value="debt-loan">Loan</option>
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
                              className={`input-date-dark w-full bg-surface-base border ${errors.dueDate ? 'border-red-500/50' : 'border-surface-border'} rounded focus-app-field-indigo px-3 py-2 text-sm font-sans disabled:opacity-40`}
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
                                  className={`w-full bg-surface-base border ${errors.vendor ? 'border-red-500/50' : 'border-surface-border'} rounded focus-app-field-indigo px-3 py-2.5 text-sm font-sans text-white placeholder:text-content-muted transition-colors`}
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
                              className="w-full bg-surface-base border border-surface-border rounded focus-app-field-indigo px-3 py-2.5 text-sm font-sans text-white cursor-pointer"
                            >
                              <option value="housing">Housing & Rent</option>
                              <option value="utilities">Utilities & Telecom</option>
                              <option value="subscriptions">Subscriptions</option>
                              <option value="insurance">Insurance</option>
                              <option value="auto">Auto & Car Payment</option>
                              <option value="health">Health & Medical</option>
                              <option value="education">Education & Loans</option>
                              <option value="childcare">Childcare</option>
                              <option value="personal">Personal Care & Gym</option>
                              <option value="taxes">Taxes</option>
                              <option value="business">Business & Software</option>
                              <option value="food">Food & Dining</option>
                              <option value="transport">Transportation</option>
                              <option value="shopping">Shopping</option>
                              <option value="debt">Debt Services</option>
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
                                className="w-full bg-surface-base border border-surface-border rounded focus-app-field-indigo px-3 py-2 text-sm font-sans text-white"
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
                                className="w-full bg-surface-base border border-surface-border rounded focus-app-field-indigo px-3 py-2 text-sm font-sans text-white"
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
                              className="w-full bg-surface-base border border-surface-border rounded focus-app-field-rose px-3 py-2 text-sm font-sans text-white cursor-pointer"
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
                            className={`w-full bg-surface-base border ${errors.jurisdiction ? 'border-red-500/50' : 'border-surface-border'} rounded focus-app-field-rose px-3 py-2.5 text-sm font-sans text-white placeholder:text-content-muted transition-colors`}
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
                              className="w-full bg-surface-base border border-surface-border rounded focus-app-field-rose px-3 py-2.5 text-sm font-mono text-white placeholder:text-content-muted transition-colors uppercase"
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
                              className="w-full bg-surface-base border border-surface-border rounded focus-app-field-rose px-3 py-2.5 text-sm font-sans text-white placeholder:text-content-muted"
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
                            className="w-full bg-surface-base border border-surface-border rounded focus-app-field-rose px-3 py-2.5 text-sm font-sans text-white placeholder:text-content-muted transition-colors"
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
                            className="w-full bg-surface-base border border-surface-border rounded focus-app-field-indigo px-3 py-2.5 text-sm font-sans text-white placeholder:text-content-muted transition-colors"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Source</label>
                            <select
                              value={source}
                              onChange={(e) => setSource(e.target.value)}
                              className="w-full bg-surface-base border border-surface-border rounded focus-app-field-indigo px-3 py-2 text-sm font-sans text-white cursor-pointer"
                            >
                              <option value="salary">Salary / Wages</option>
                              <option value="freelance">Freelance</option>
                              <option value="bonus">Bonus</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Frequency</label>
                            <select
                              value={incomeFrequency}
                              onChange={(e) => setIncomeFrequency(e.target.value as IncomeSource['frequency'])}
                              className="w-full bg-surface-base border border-surface-border rounded focus-app-field-indigo px-3 py-2 text-sm font-sans text-white cursor-pointer"
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
                            className={`input-date-dark w-full bg-surface-base border ${errors.date ? 'border-red-500/50' : 'border-surface-border'} rounded focus-app-field-indigo px-3 py-2 text-sm font-sans`}
                          />
                          {errors.date && <p className="text-xs text-red-400 mt-1.5">{errors.date}</p>}
                        </div>
                      </>
                    )}

                  </form>
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 border-t border-surface-border bg-surface-raised shrink-0 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-sans font-medium text-content-tertiary hover:text-white transition-colors focus-app rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="quick-add-form"
                    className={`px-5 py-2 text-white rounded text-sm font-sans font-medium transition-colors focus-app shadow ${
                      activeTab === 'citation'
                        ? 'bg-rose-600 hover:bg-rose-500'
                        : 'bg-indigo-600 hover:bg-indigo-500'
                    }`}
                  >
                    Save Entry
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
