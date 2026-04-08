import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Terminal, AlertCircle, ScanLine, Loader2, Camera } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { guessCategory } from '../lib/categorizer';
import { validateIngestionFile } from '../lib/security';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const { quickAddTab, addTransaction, addBill, addDebt, addIncome } = useStore();
  const [activeTab, setActiveTab] = useState<'transaction' | 'obligation' | 'income'>('transaction');

  // Form states
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState('bill');
  const [dueDate, setDueDate] = useState('');
  const [vendor, setVendor] = useState('');
  const [source, setSource] = useState('salary');
  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateIngestionFile(file);
    if (!validation.ok) {
      toast.error(validation.error);
      e.target.value = '';
      return;
    }

    setIsScanning(true);
    try {
      let fullText = '';

      if (file.type.startsWith('image/')) {
        // Dynamic import to avoid bloating the initial bundle
        const Tesseract = (await import('tesseract.js')).default;
        const result = await Tesseract.recognize(file, 'eng');
        fullText = result.data.text;
      } else if (file.type === 'application/pdf') {
        const pdfjsLib = await import('pdfjs-dist');
        const pdfjsWorkerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        // Cap at 3 pages for speed — bills are never longer
        const pages = Math.min(pdf.numPages, 3);
        for (let i = 1; i <= pages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
      }

      // ── Extract amount (largest dollar value on the doc) ──
      const amountMatches = fullText.match(/\$?\s*\d+\.\d{2}/g);
      if (amountMatches) {
        const amounts = amountMatches
          .map(m => parseFloat(m.replace(/[^0-9.]/g, '')))
          .filter(n => !isNaN(n) && n > 0 && n < 1_000_000);
        if (amounts.length > 0) setAmount(Math.max(...amounts).toFixed(2));
      }

      // ── Extract merchant / biller from first meaningful line ──
      const lines = fullText.split('\n').filter(l => l.trim().length > 2);
      if (lines.length > 0) {
        const name = lines[0].trim().substring(0, 50);
        if (activeTab === 'transaction') setDescription(name);
        else if (activeTab === 'obligation') setVendor(name);
        // Auto-guess category from the name
        const guessed = guessCategory(name);
        if (guessed) setCategory(guessed);
      }

      // ── Extract date ──
      const dateMatch = fullText.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
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

      toast.success('Document scanned — review the fields and save.');
    } catch {
      toast.error('Could not read document. Try a clearer photo.');
    } finally {
      setIsScanning(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(quickAddTab);
      setAmount('');
      setDescription('');
      setVendor('');
      setErrors({});
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
    if (!amount || isNaN(parseFloat(amount))) newErrors.amount = "Please enter a valid amount.";
    
    if (activeTab === 'transaction') {
      if (!description.trim()) newErrors.description = "Please describe the transaction.";
    } else if (activeTab === 'obligation') {
      if (!vendor.trim()) newErrors.vendor = "Please specify who is being paid.";
      if (!dueDate) newErrors.dueDate = "Please select a due date.";
    } else if (activeTab === 'income') {
      // Incomes mostly rely on select, but we can check amount and date
      if (!date) newErrors.date = "Please select a date.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNLPInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    const numAmount = parseFloat(amount);

    try {
      if (activeTab === 'transaction') {
        addTransaction({
          name: description,
          amount: numAmount,
          category: category,
          date: date,
          type: 'expense'
        });
        toast.success(`Transaction saved`);
      } else if (activeTab === 'obligation') {
        if (type === 'bill') {
          addBill({
            biller: vendor,
            amount: numAmount,
            category: category,
            dueDate: dueDate || date,
            frequency: 'Monthly',
            status: 'upcoming',
            autoPay: false
          });
          toast.success(`Bill added`);
        } else {
          addDebt({
            name: vendor,
            type: 'Card', 
            apr: 19.99, 
            remaining: numAmount,
            minPayment: Math.max(25, numAmount * 0.02),
            paid: 0
          });
          toast.success(`Debt recorded`);
        }
      } else if (activeTab === 'income') {
        addIncome({
          name: source,
          amount: numAmount,
          frequency: 'Monthly',
          category: 'Income',
          nextDate: date,
          status: 'active',
          isTaxWithheld: false
        });
        toast.success(`Income recorded`);
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
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
                    className="text-zinc-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-sm"
                  >
                    <span className="sr-only">Close</span>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto w-full">
                  {/* Scan Document Strip */}
                  <div className="bg-surface-base px-6 py-3 border-b border-surface-border flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                        Scan receipt, image or PDF
                      </p>
                      <p className="text-[8px] font-mono text-zinc-700 uppercase tracking-widest mt-0.5">
                        JPG · PNG · WEBP · PDF
                      </p>
                    </div>
                    <label className={`relative flex items-center gap-2 px-4 py-2 rounded-sm border text-[10px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer select-none
                      ${isScanning
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400 cursor-not-allowed'
                        : 'border-surface-border bg-surface-raised text-zinc-300 hover:border-indigo-500/50 hover:text-white hover:bg-indigo-500/5'
                      }`}>
                      <input
                        ref={scanInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed w-full h-full"
                        onChange={handleScanFile}
                        disabled={isScanning}
                      />
                      {isScanning ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Camera className="w-3.5 h-3.5" />
                          Upload Image / PDF
                        </>
                      )}
                    </label>
                  </div>

                  {/* Smart Input Bar */}
                  <div className="bg-surface-base p-6 border-b border-surface-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Terminal className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-sans font-medium text-zinc-300">Natural Language Speed Input</span>
                    </div>
                    
                    <textarea 
                      placeholder="e.g. 'Coffee 5.50 today' or 'Comcast bill 120 next tuesday'"
                      onChange={handleNLPInput}
                      className="w-full bg-surface-raised border border-surface-border rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-sans text-white placeholder-zinc-500 p-3 outline-none resize-none transition-colors"
                      rows={2}
                    />
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-surface-border bg-surface-raised p-1 gap-1">
                    <button
                      onClick={() => { setActiveTab('transaction'); setErrors({}); }}
                      className={`flex-1 py-2 text-xs font-sans font-medium transition-all rounded ${
                        activeTab === 'transaction' ? 'bg-surface-border text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-elevated'
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
                    >
                      Expense
                    </button>
                    <button
                      onClick={() => { setActiveTab('obligation'); setErrors({}); }}
                      className={`flex-1 py-2 text-xs font-sans font-medium transition-all rounded ${
                        activeTab === 'obligation' ? 'bg-surface-border text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-elevated'
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
                    >
                      Bill/Debt
                    </button>
                    <button
                      onClick={() => { setActiveTab('income'); setErrors({}); }}
                      className={`flex-1 py-2 text-xs font-sans font-medium transition-all rounded ${
                        activeTab === 'income' ? 'bg-surface-border text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-elevated'
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
                    >
                      Income
                    </button>
                  </div>

                  {/* Form Body */}
                  <form id="quick-add-form" onSubmit={handleSubmit} className="p-6 space-y-5">
                    
                    {/* AMOUNT FIELD (ALWAYS PRESENT) */}
                    <div>
                      <label htmlFor="amount" className="block text-xs font-sans font-medium text-zinc-400 mb-1.5">Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">$</span>
                        <input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={amount}
                          onChange={(e) => { setAmount(e.target.value); if(errors.amount) setErrors({...errors, amount: ''}); }}
                          placeholder="0.00"
                          className={`w-full bg-surface-base border ${errors.amount ? 'border-red-500/50' : 'border-surface-border'} rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pl-7 py-2.5 text-base font-sans font-semibold text-white placeholder-zinc-600 outline-none transition-colors`}
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
                          <label htmlFor="description" className="block text-xs font-sans font-medium text-zinc-400 mb-1.5">Description</label>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <input
                                id="description"
                                type="text"
                                value={description}
                                onChange={(e) => { setDescription(e.target.value); if(errors.description) setErrors({...errors, description: ''}); }}
                                placeholder="E.g., Whole Foods"
                                className={`w-full bg-surface-base border ${errors.description ? 'border-red-500/50' : 'border-surface-border'} rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-3 py-2.5 text-sm font-sans text-white placeholder-zinc-600 outline-none transition-colors`}
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
                            <label htmlFor="category" className="block text-xs font-sans font-medium text-zinc-400 mb-1.5">Category</label>
                            <select 
                              id="category"
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full bg-surface-base border border-surface-border rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-3 py-2 text-sm font-sans text-white outline-none cursor-pointer"
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
                            <label htmlFor="date" className="block text-xs font-sans font-medium text-zinc-400 mb-1.5">Date</label>
                            <input
                              id="date"
                              type="date"
                              value={date}
                              onChange={(e) => setDate(e.target.value)}
                              className="w-full bg-surface-base border border-surface-border rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-3 py-2 text-sm font-sans text-white outline-none"
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
                            <label className="block text-xs font-sans font-medium text-zinc-400 mb-1.5">Type</label>
                            <select 
                              value={type}
                              onChange={(e) => setType(e.target.value)}
                              className="w-full bg-surface-base border border-surface-border rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-3 py-2 text-sm font-sans text-white outline-none cursor-pointer"
                            >
                              <option value="bill">Monthly Bill</option>
                              <option value="debt">Debt / Loan</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor="dueDate" className="block text-xs font-sans font-medium text-zinc-400 mb-1.5">Due Date</label>
                            <input
                              id="dueDate"
                              type="date"
                              value={dueDate}
                              onChange={(e) => { setDueDate(e.target.value); if(errors.dueDate) setErrors({...errors, dueDate: ''}); }}
                              className={`w-full bg-surface-base border ${errors.dueDate ? 'border-red-500/50' : 'border-surface-border'} rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-3 py-2 text-sm font-sans text-white outline-none`}
                            />
                            {errors.dueDate && <p className="text-xs text-red-400 mt-1.5">{errors.dueDate}</p>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="vendor" className="block text-xs font-sans font-medium text-zinc-400 mb-1.5">Biller Name</label>
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <input
                                  id="vendor"
                                  type="text"
                                  value={vendor}
                                  onChange={(e) => { setVendor(e.target.value); if(errors.vendor) setErrors({...errors, vendor: ''}); }}
                                  placeholder={type === 'bill' ? "E.g., AT&T" : "E.g., Chase Sapphire"}
                                  className={`w-full bg-surface-base border ${errors.vendor ? 'border-red-500/50' : 'border-surface-border'} rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-3 py-2.5 text-sm font-sans text-white placeholder-zinc-600 outline-none transition-colors`}
                                />
                              </div>
                            </div>
                            {errors.vendor && (
                              <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5"><AlertCircle className="w-3 h-3" /> {errors.vendor}</p>
                            )}
                          </div>
                          <div>
                            <label htmlFor="billCategory" className="block text-xs font-sans font-medium text-zinc-400 mb-1.5">Category</label>
                            <select 
                              id="billCategory"
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full bg-surface-base border border-surface-border rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-3 py-2.5 text-sm font-sans text-white outline-none cursor-pointer"
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
                      </>
                    )}

                    {/* INCOME FIELDS */}
                    {activeTab === 'income' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-sans font-medium text-zinc-400 mb-1.5">Source</label>
                            <select 
                              value={source}
                              onChange={(e) => setSource(e.target.value)}
                              className="w-full bg-surface-base border border-surface-border rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-3 py-2 text-sm font-sans text-white outline-none cursor-pointer"
                            >
                              <option value="salary">Salary / Wages</option>
                              <option value="freelance">Freelance</option>
                              <option value="bonus">Bonus</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor="incDate" className="block text-xs font-sans font-medium text-zinc-400 mb-1.5">Date</label>
                            <input
                              id="incDate"
                              type="date"
                              value={date}
                              onChange={(e) => { setDate(e.target.value); if(errors.date) setErrors({...errors, date: ''}); }}
                              className={`w-full bg-surface-base border ${errors.date ? 'border-red-500/50' : 'border-surface-border'} rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-3 py-2 text-sm font-sans text-white outline-none`}
                            />
                            {errors.date && <p className="text-xs text-red-400 mt-1.5">{errors.date}</p>}
                          </div>
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
                    className="px-4 py-2 text-sm font-sans font-medium text-zinc-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="quick-add-form"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised focus-visible:ring-indigo-500 shadow"
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
