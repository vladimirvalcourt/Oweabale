import React, { useState, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { X, UploadCloud, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'transaction' | 'obligation' | 'income';

export default function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('transaction');
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
  const [aiMatch, setAiMatch] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [customSource, setCustomSource] = useState('');

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
    setAiMatch(false);

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
        setAiMatch(true);
        toast.success('Document successfully parsed');
      }, 1500);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock success
    toast.success('Successfully saved to ledger');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg w-full rounded-sm bg-[#1C1C1C] border border-[#262626] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] shrink-0">
            <Dialog.Title className="text-lg font-semibold tracking-tight text-[#FAFAFA]">
              Quick Add
            </Dialog.Title>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {/* Smart Dropzone */}
            <div className="p-6 border-b border-[#262626] bg-[#141414]">
              <div 
                className={`border-2 border-dashed rounded-sm p-6 text-center transition-colors cursor-pointer ${
                  isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-[#262626] hover:border-zinc-500 hover:bg-[#1C1C1C]'
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
                      <p className="text-sm font-mono text-indigo-400 animate-pulse">&gt; AI CATEGORIZING EXPENSE...</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <UploadCloud className="w-8 h-8 text-zinc-500 mb-3" />
                    <p className="text-zinc-400 text-sm">Drop any bill, receipt, or citation. Oweable AI will extract and categorize it.</p>
                    <p className="text-xs text-zinc-600 mt-2">Supports PDF, JPG, PNG</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex border-b border-[#262626] sticky top-0 bg-[#1C1C1C] z-10">
              <button
                onClick={() => setActiveTab('transaction')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'transaction' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Transaction
              </button>
              <button
                onClick={() => setActiveTab('obligation')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'obligation' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Obligation
              </button>
              <button
                onClick={() => setActiveTab('income')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'income' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300'
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
                    <div className="relative">
                      <span className="absolute left-0 top-1 text-emerald-400 font-mono text-2xl">$</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-transparent border-b border-[#262626] focus:border-indigo-500 rounded-none focus:ring-0 pl-6 py-1 text-2xl font-mono text-emerald-400 placeholder-emerald-400/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Description</label>
                    <input
                      type="text"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g., Whole Foods"
                      className="w-full bg-transparent border-b border-[#262626] focus:border-indigo-500 rounded-none focus:ring-0 py-2 text-[#FAFAFA] placeholder-zinc-600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider">Category</label>
                        {aiMatch && <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-sm tracking-wider font-mono">AI MATCH: 98%</span>}
                      </div>
                      <select 
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-transparent border-b border-[#262626] focus:border-indigo-500 rounded-none focus:ring-0 py-2 text-[#FAFAFA]"
                      >
                        <option value="food" className="bg-[#1C1C1C]">Food & Dining</option>
                        <option value="transport" className="bg-[#1C1C1C]">Transportation</option>
                        <option value="shopping" className="bg-[#1C1C1C]">Shopping</option>
                        <option value="entertainment" className="bg-[#1C1C1C]">Entertainment</option>
                        <option value="medical" className="bg-[#1C1C1C]">Medical / Health</option>
                        <option value="other" className="bg-[#1C1C1C]">Other (Custom)</option>
                      </select>
                      {category === 'other' && (
                        <input
                          type="text"
                          required
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          placeholder="Enter custom category name..."
                          className="w-full mt-3 bg-transparent border-b border-[#262626] focus:border-indigo-500 rounded-none focus:ring-0 text-sm text-[#FAFAFA] placeholder:text-zinc-600 px-0 py-2 animate-in fade-in slide-in-from-top-2 duration-200"
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
                        className="w-full bg-transparent border-b border-[#262626] focus:border-indigo-500 rounded-none focus:ring-0 py-2 text-[#FAFAFA]"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'obligation' && (
                <>
                  <div>
                    <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Amount</label>
                    <div className="relative">
                      <span className="absolute left-0 top-1 text-emerald-400 font-mono text-2xl">$</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-transparent border-b border-[#262626] focus:border-indigo-500 rounded-none focus:ring-0 pl-6 py-1 text-2xl font-mono text-emerald-400 placeholder-emerald-400/30"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Type</label>
                      <select 
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full bg-transparent border-b border-[#262626] focus:border-indigo-500 rounded-none focus:ring-0 py-2 text-[#FAFAFA]"
                      >
                        <option value="bill" className="bg-[#1C1C1C]">Bill</option>
                        <option value="debt" className="bg-[#1C1C1C]">Debt</option>
                        <option value="citation" className="bg-[#1C1C1C]">Citation</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Due Date</label>
                      <input
                        type="date"
                        required
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full bg-transparent border-b border-[#262626] focus:border-indigo-500 rounded-none focus:ring-0 py-2 text-[#FAFAFA]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Vendor / Name</label>
                    <input
                      type="text"
                      required
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      placeholder="e.g., Verizon Wireless"
                      className="w-full bg-transparent border-b border-[#262626] focus:border-indigo-500 rounded-none focus:ring-0 py-2 text-[#FAFAFA] placeholder-zinc-600"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider">Category</label>
                      {aiMatch && <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-sm tracking-wider font-mono">AI MATCH: 98%</span>}
                    </div>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-transparent border-b border-[#262626] focus:border-indigo-500 rounded-none focus:ring-0 py-2 text-[#FAFAFA]"
                    >
                      <option value="food" className="bg-[#1C1C1C]">Food & Dining</option>
                      <option value="transport" className="bg-[#1C1C1C]">Transportation</option>
                      <option value="shopping" className="bg-[#1C1C1C]">Shopping</option>
                      <option value="entertainment" className="bg-[#1C1C1C]">Entertainment</option>
                      <option value="medical" className="bg-[#1C1C1C]">Medical / Health</option>
                      <option value="other" className="bg-[#1C1C1C]">Other (Custom)</option>
                    </select>
                    {category === 'other' && (
                      <input
                        type="text"
                        required
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Enter custom category name..."
                        className="w-full mt-3 bg-transparent border-b border-[#262626] focus:border-indigo-500 rounded-none focus:ring-0 text-sm text-[#FAFAFA] placeholder:text-zinc-600 px-0 py-2 animate-in fade-in slide-in-from-top-2 duration-200"
                      />
                    )}
                  </div>
                </>
              )}

              {activeTab === 'income' && (
                <>
                  <div>
                    <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Amount</label>
                    <div className="relative">
                      <span className="absolute left-0 top-1 text-emerald-400 font-mono text-2xl">$</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-transparent border-b border-[#262626] focus:border-indigo-500 rounded-none focus:ring-0 pl-6 py-1 text-2xl font-mono text-emerald-400 placeholder-emerald-400/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Source</label>
                    <select 
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full bg-transparent border-b border-[#262626] focus:border-indigo-500 rounded-none focus:ring-0 py-2 text-[#FAFAFA]"
                    >
                      <option value="salary" className="bg-[#1C1C1C]">Salary / Wages</option>
                      <option value="freelance" className="bg-[#1C1C1C]">Freelance / Contract</option>
                      <option value="bonus" className="bg-[#1C1C1C]">Bonus</option>
                      <option value="investment" className="bg-[#1C1C1C]">Investment</option>
                      <option value="other" className="bg-[#1C1C1C]">Other (Custom)</option>
                    </select>
                    {source === 'other' && (
                      <input
                        type="text"
                        required
                        value={customSource}
                        onChange={(e) => setCustomSource(e.target.value)}
                        placeholder="Enter custom income source..."
                        className="w-full mt-3 bg-transparent border-b border-[#262626] focus:border-indigo-500 rounded-none focus:ring-0 text-sm text-[#FAFAFA] placeholder:text-zinc-600 px-0 py-2 animate-in fade-in slide-in-from-top-2 duration-200"
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
                      className="w-full bg-transparent border-b border-[#262626] focus:border-indigo-500 rounded-none focus:ring-0 py-2 text-[#FAFAFA]"
                    />
                  </div>
                </>
              )}
            </form>
          </div>
          <div className="p-6 border-t border-[#262626] bg-[#1C1C1C] shrink-0">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-transparent text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1C1C1C] focus:ring-indigo-500"
              >
                Save to Ledger
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
