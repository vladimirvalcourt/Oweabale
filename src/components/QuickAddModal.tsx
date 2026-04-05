import React, { useState, useRef, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UploadCloud, FileText, Terminal } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'transaction' | 'obligation' | 'income';

export default function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const { quickAddTab, addTransaction, addBill, addDebt, addIncome } = useStore();
  const [activeTab, setActiveTab] = useState<'transaction' | 'obligation' | 'income'>('transaction');
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanPhase, setScanPhase] = useState<1 | 2>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState('bill');
  const [dueDate, setDueDate] = useState('');
  const [vendor, setVendor] = useState('');
  const [source, setSource] = useState('salary');
  const [customCategory, setCustomCategory] = useState('');
  const [customSource, setCustomSource] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(quickAddTab);
      setAmount('');
      setDescription('');
      setVendor('');
    }
  }, [isOpen, quickAddTab]);

  const handleNLPInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    
    const amtMatch = val.match(/\$([\d,]+(?:\.\d{2})?)/);
    if (amtMatch) setAmount(amtMatch[1].replace(',', ''));
    
    const lowerVal = val.toLowerCase();
    if (lowerVal.includes('spent') || lowerVal.includes('bought') || lowerVal.includes('paid for')) {
      setActiveTab('transaction');
      setDescription(val.replace(/\$([\d,]+(?:\.\d{2})?)/g, '').replace(/spent|bought|paid for/i, '').trim() || 'Parsed Transaction');
    } else if (lowerVal.includes('bill') || lowerVal.includes('owe') || lowerVal.includes('due') || lowerVal.includes('ticket')) {
      setActiveTab('obligation');
      setVendor(val.replace(/\$([\d,]+(?:\.\d{2})?)/g, '').replace(/bill|owe|due|ticket/i, '').trim() || 'Unknown Payee');
      setType(lowerVal.includes('ticket') ? 'debt' : 'bill');
    } else if (lowerVal.includes('earned') || lowerVal.includes('paid me') || lowerVal.includes('income')) {
      setActiveTab('income');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      simulateScan();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      simulateScan();
    }
  };

  const simulateScan = () => {
    setIsScanning(true);
    setScanPhase(1);

    // Phase 1: Extracting
    setTimeout(() => {
      setScanPhase(2);
      
      // Phase 2: Categorizing
      setTimeout(() => {
        setIsScanning(false);
        setActiveTab('obligation');
        setType('bill');
        setAmount('340.00');
        setVendor('Quest Diagnostics');
        
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 14);
        setDueDate(futureDate.toISOString().split('T')[0]);
        
        setCategory('medical'); // We'll add this to the dropdown
        toast.success('Document successfully parsed');
      }, 1500);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      toast.error('Please enter a valid amount');
      return;
    }

    const finalCategory = category === 'other' ? customCategory : category;

    try {
      if (activeTab === 'transaction') {
        addTransaction({
          name: description,
          amount: numAmount,
          category: finalCategory,
          date: date,
          type: 'expense'
        });
        toast.success(`Transaction "${description}" saved`);
      } else if (activeTab === 'obligation') {
        if (type === 'bill') {
          addBill({
            biller: vendor,
            amount: numAmount,
            category: finalCategory,
            dueDate: dueDate || date,
            frequency: 'Monthly',
            status: 'upcoming',
            autoPay: false
          });
          toast.success(`Bill for "${vendor}" added`);
        } else if (type === 'debt') {
          addDebt({
            name: vendor,
            type: 'Card', // Default
            apr: 19.99, // Default
            remaining: numAmount,
            minPayment: Math.max(25, numAmount * 0.02),
            paid: 0
          });
          toast.success(`Debt "${vendor}" recorded`);
        }
      } else if (activeTab === 'income') {
        const finalSource = source === 'other' ? customSource : source;
        addIncome({
          name: finalSource,
          amount: numAmount,
          frequency: 'Monthly',
          category: 'Income',
          nextDate: date,
          status: 'active'
        });
        toast.success(`Income from "${finalSource}" recorded`);
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
          static
          open={isOpen} 
          onClose={onClose} 
          className="relative z-50"
        >
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md" 
            aria-hidden="true" 
          />

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.98 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="mx-auto max-w-lg w-full"
            >
              <Dialog.Panel className="rounded-sm bg-gradient-to-b from-surface-elevated to-surface-raised border border-surface-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-raised shrink-0">
                  <Dialog.Title className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-content-primary">
                    Quick Entry
                  </Dialog.Title>
                  <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-y-auto scrollbar-hide flex-1">
                  {/* Natural Language Terminal Node */}
                  <div className="bg-surface-base p-4 border-b border-surface-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">Smart Text Input</span>
                    </div>
                    <textarea 
                      placeholder="e.g. 'Spent $45 on hardware...' or 'Got a $150 Speeding ticket...'"
                      onChange={handleNLPInput}
                      className="w-full bg-surface-raised border border-surface-border rounded-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-[11px] font-mono text-content-primary placeholder-surface-border p-3 outline-none resize-none transition-colors shadow-inner"
                      rows={2}
                    />
                  </div>

                  {/* Smart Dropzone */}
                  <div className="p-6 border-b border-surface-border bg-surface-raised">
                    <div 
                      className={`border-2 border-dashed rounded-sm p-6 text-center transition-colors cursor-pointer ${
                        isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-surface-border hover:border-zinc-500 hover:bg-surface-elevated'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*,.pdf" 
                        onChange={handleFileSelect}
                      />
                      
                      {isScanning ? (
                        <div className="flex flex-col items-center justify-center h-20">
                          <FileText className="w-8 h-8 text-indigo-500 mb-3 animate-pulse" />
                          {scanPhase === 1 ? (
                            <p className="text-sm font-mono text-zinc-400">&gt; EXTRACTING TEXT...</p>
                          ) : (
                            <p className="text-sm font-mono text-indigo-400 animate-pulse">&gt; CATEGORIZING EXPENSE...</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <UploadCloud className="w-8 h-8 text-zinc-500 mb-3" />
                          <p className="text-zinc-400 text-sm">Drop any bill, receipt, or citation. Oweable will extract and categorize it.</p>
                          <p className="text-xs text-zinc-600 mt-2">Supports PDF, JPG, PNG</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex border-b border-surface-border sticky top-0 bg-surface-elevated z-10 p-1">
                    <button
                      onClick={() => setActiveTab('transaction')}
                      className={`flex-1 py-1.5 text-[9px] font-mono uppercase tracking-widest transition-all rounded-sm ${
                        activeTab === 'transaction' ? 'bg-surface-border text-white border border-surface-border' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Transaction
                    </button>
                    <button
                      onClick={() => setActiveTab('obligation')}
                      className={`flex-1 py-1.5 text-[9px] font-mono uppercase tracking-widest transition-all rounded-sm ${
                        activeTab === 'obligation' ? 'bg-surface-border text-white border border-surface-border' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Bill/Debt
                    </button>
                    <button
                      onClick={() => setActiveTab('income')}
                      className={`flex-1 py-1.5 text-[9px] font-mono uppercase tracking-widest transition-all rounded-sm ${
                        activeTab === 'income' ? 'bg-surface-border text-white border border-surface-border' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Income
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {activeTab === 'transaction' && (
                      <>
                        <div>
                          <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Amount</label>
                          <div className="relative flex items-center">
                            <span className="absolute left-0 text-[#4ade80] font-mono text-2xl pointer-events-none">$</span>
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-transparent border-b border-surface-border focus:border-[#4ade80] rounded-none focus:outline-none focus:ring-0 pl-7 py-2 text-2xl font-mono text-[#4ade80] placeholder-[#4ade80]/20 focus:shadow-[inset_0_-4px_12px_rgba(74,222,128,0.06)] transition-all"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Who are we paying?</label>
                          <div className="relative flex items-center gap-3">
                            {description.length > 1 && <BrandLogo name={description} size="sm" />}
                            <input
                              type="text"
                              required
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              placeholder="e.g., Whole Foods"
                              className="w-full bg-transparent border-b border-surface-border focus:border-indigo-500 rounded-none focus:outline-none focus:ring-0 focus:shadow-[inset_0_-2px_15px_rgba(255,255,255,0.03)] py-2 text-content-primary placeholder-zinc-600 transition-all"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider">Category</label>
                            </div>
                            <select 
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full bg-transparent border-b border-surface-border focus:border-indigo-500 rounded-none focus:ring-0 py-2 text-content-primary"
                            >
                              <option value="food" className="bg-surface-elevated">Food & Dining</option>
                              <option value="transport" className="bg-surface-elevated">Transportation</option>
                              <option value="shopping" className="bg-surface-elevated">Shopping</option>
                              <option value="entertainment" className="bg-surface-elevated">Entertainment</option>
                              <option value="medical" className="bg-surface-elevated">Medical / Health</option>
                              <option value="other" className="bg-surface-elevated">Other (Custom)</option>
                            </select>
                            {category === 'other' && (
                              <input
                                type="text"
                                required
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                placeholder="Enter custom category name..."
                                className="w-full mt-3 bg-transparent border-b border-surface-border focus:border-indigo-500 rounded-none focus:ring-0 text-sm text-content-primary placeholder:text-zinc-600 px-0 py-2 animate-in fade-in slide-in-from-top-2 duration-200"
                              />
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Date</label>
                            <input
                              type="date"
                              required
                              value={date}
                              onChange={(e) => setDate(e.target.value)}
                              className="w-full bg-transparent border-b border-surface-border focus:border-indigo-500 rounded-none focus:ring-0 py-2 text-content-primary"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {activeTab === 'obligation' && (
                      <>
                        <div>
                          <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Amount</label>
                          <div className="relative flex items-center">
                            <span className="absolute left-0 text-[#4ade80] font-mono text-2xl pointer-events-none">$</span>
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-transparent border-b border-surface-border focus:border-[#4ade80] rounded-none focus:outline-none focus:ring-0 pl-7 py-2 text-2xl font-mono text-[#4ade80] placeholder-[#4ade80]/20 focus:shadow-[inset_0_-4px_12px_rgba(74,222,128,0.06)] transition-all"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Type</label>
                            <select 
                              value={type}
                              onChange={(e) => setType(e.target.value)}
                              className="w-full bg-transparent border-b border-surface-border focus:border-indigo-500 rounded-none focus:ring-0 py-2 text-content-primary"
                            >
                              <option value="bill" className="bg-surface-elevated">Bill</option>
                              <option value="debt" className="bg-surface-elevated">Debt</option>
                              <option value="citation" className="bg-surface-elevated">Citation</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Due Date</label>
                            <input
                              type="date"
                              required
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                              className="w-full bg-transparent border-b border-surface-border focus:border-indigo-500 rounded-none focus:ring-0 py-2 text-content-primary"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Who are we paying?</label>
                          <div className="relative flex items-center gap-3">
                            {vendor.length > 1 && <BrandLogo name={vendor} size="sm" />}
                            <input
                              type="text"
                              required
                              value={vendor}
                              onChange={(e) => setVendor(e.target.value)}
                              placeholder="e.g., Verizon Wireless"
                              className="w-full bg-transparent border-b border-surface-border focus:border-indigo-500 rounded-none focus:outline-none focus:ring-0 focus:shadow-[inset_0_-2px_15px_rgba(255,255,255,0.03)] py-2 text-content-primary placeholder-zinc-600 transition-all"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider">Category</label>
                          </div>
                          <select 
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-transparent border-b border-surface-border focus:border-indigo-500 rounded-none focus:ring-0 py-2 text-content-primary"
                          >
                            <option value="food" className="bg-surface-elevated">Food & Dining</option>
                            <option value="transport" className="bg-surface-elevated">Transportation</option>
                            <option value="shopping" className="bg-surface-elevated">Shopping</option>
                            <option value="entertainment" className="bg-surface-elevated">Entertainment</option>
                            <option value="medical" className="bg-surface-elevated">Medical / Health</option>
                            <option value="other" className="bg-surface-elevated">Other (Custom)</option>
                          </select>
                          {category === 'other' && (
                            <input
                              type="text"
                              required
                              value={customCategory}
                              onChange={(e) => setCustomCategory(e.target.value)}
                              placeholder="Enter custom category name..."
                              className="w-full mt-3 bg-transparent border-b border-surface-border focus:border-indigo-500 rounded-none focus:ring-0 text-sm text-content-primary placeholder:text-zinc-600 px-0 py-2 animate-in fade-in slide-in-from-top-2 duration-200"
                            />
                          )}
                        </div>
                      </>
                    )}

                    {activeTab === 'income' && (
                      <>
                        <div>
                          <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Amount</label>
                          <div className="relative flex items-center">
                            <span className="absolute left-0 text-[#4ade80] font-mono text-2xl pointer-events-none">$</span>
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-transparent border-b border-surface-border focus:border-[#4ade80] rounded-none focus:outline-none focus:ring-0 pl-7 py-2 text-2xl font-mono text-[#4ade80] placeholder-[#4ade80]/20 focus:shadow-[inset_0_-4px_12px_rgba(74,222,128,0.06)] transition-all"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Source</label>
                          <select 
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            className="w-full bg-transparent border-b border-surface-border focus:border-indigo-500 rounded-none focus:ring-0 py-2 text-content-primary"
                          >
                            <option value="salary" className="bg-surface-elevated">Salary / Wages</option>
                            <option value="freelance" className="bg-surface-elevated">Freelance / Contract</option>
                            <option value="bonus" className="bg-surface-elevated">Bonus</option>
                            <option value="investment" className="bg-surface-elevated">Investment</option>
                            <option value="other" className="bg-surface-elevated">Other (Custom)</option>
                          </select>
                          {source === 'other' && (
                            <input
                              type="text"
                              required
                              value={customSource}
                              onChange={(e) => setCustomSource(e.target.value)}
                              placeholder="Enter custom income source..."
                              className="w-full mt-3 bg-transparent border-b border-surface-border focus:border-indigo-500 rounded-none focus:ring-0 text-sm text-content-primary placeholder:text-zinc-600 px-0 py-2 animate-in fade-in slide-in-from-top-2 duration-200"
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Date</label>
                          <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-transparent border-b border-surface-border focus:border-indigo-500 rounded-none focus:ring-0 py-2 text-content-primary"
                          />
                        </div>
                      </>
                    )}
                  </form>
                </div>
                <div className="p-6 border-t border-surface-border bg-surface-raised shrink-0">
                  <div className="flex justify-end gap-6 items-center">
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      onClick={handleSubmit}
                      className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-xs font-mono font-bold uppercase tracking-widest transition-colors shadow-lg shadow-indigo-500/10"
                    >
                      Add to Ledger
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
