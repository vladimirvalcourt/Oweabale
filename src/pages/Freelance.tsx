import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import {
  Plus, Target, Hash, ShieldAlert, ShieldCheck,
  Trash2, Briefcase, Calendar, Calculator, Info,
  TrendingUp, TrendingDown, ArrowUpRight, Zap,
  FileText, UploadCloud, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { CollapsibleModule } from '../components/CollapsibleModule';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { IRS_MILEAGE_RATE } from '../lib/finance';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

/** Simplified average federal income rate used for freelance tax estimates. */
const FED_INCOME_ESTIMATE_RATE = 0.12;
/** IRS self-employment tax rate (15.3% = 12.4% SS + 2.9% Medicare). */
const SE_TAX_RATE = 0.153;

export default function Freelance() {
  const { freelanceEntries, addFreelanceEntry, deleteFreelanceEntry, toggleFreelanceVault, user, addDeduction } = useStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [formData, setFormData] = useState({ client: '', amount: '', date: new Date().toISOString().split('T')[0], scouredWriteOffs: 0 });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;
    
    setIsScanning(true);
    toast.info('Scanning statement...');

    try {
      let fullText = "";
      if (uploadedFile.type === 'application/pdf') {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: any) => item.str).join(" ") + "\n";
        }
      }

      // Analysis of Gig Receipts (Uber, Lyft, etc.)
      const isUber = fullText.toLowerCase().includes('uber');
      const isLyft = fullText.toLowerCase().includes('lyft');
      const isDoorDash = fullText.toLowerCase().includes('doordash');
      
      const client = isUber ? 'Uber' : isLyft ? 'Lyft' : isDoorDash ? 'DoorDash' : uploadedFile.name.split('.')[0];
      
      // Amount Extraction
      const amountMatches = fullText.match(/\$?\s*\d+,?\d*\.\d{2}/g);
      let amount = "";
      if (amountMatches) {
        const amounts = amountMatches.map(m => parseFloat(m.replace(/[^0-9.]/g, ''))).filter(n => !isNaN(n) && isFinite(n));
        if (amounts.length > 0) amount = Math.max(...amounts).toFixed(2);
      }

      // Finding Write-offs: Mileage & Fees
      const milesMatch = fullText.match(/(\d+\.?\d*)\s*(miles?|mi|km)/i);
      const feeMatch = fullText.match(/(\$?\s*\d+\.\d{2})\s*(fees?|commission|service)/i);
      
      let capturedWriteOffs = 0;
      if (milesMatch) {
         const miles = parseFloat(milesMatch[1]);
         const mileageDeduction = miles * IRS_MILEAGE_RATE;
         addDeduction({
           name: `Mileage: ${client} (${miles} mi)`,
           category: 'Transportation',
           amount: mileageDeduction,
           date: new Date().toISOString()
         });
         capturedWriteOffs += mileageDeduction;
      }
      
      if (feeMatch) {
         const feeAmount = parseFloat(feeMatch[1].replace(/[^0-9.]/g, ''));
         addDeduction({
           name: `${client} Platform Fees`,
           category: 'Business',
           amount: feeAmount,
           date: new Date().toISOString()
         });
         capturedWriteOffs += feeAmount;
      }

      if (capturedWriteOffs > 0) {
        toast.success(`We found $${capturedWriteOffs.toFixed(2)} in tax deductions`);
      }

      setFormData({
        client,
        amount,
        date: new Date().toISOString().split('T')[0],
        scouredWriteOffs: capturedWriteOffs
      });
      setIsAddModalOpen(true);
      toast.success('Information extracted from PDF');
    } catch (err) {
      console.error(err);
      toast.error('Failed to read PDF. Please enter manually.');
      setIsAddModalOpen(true);
    } finally {
      setIsScanning(false);
    }
  };

  const taxState = user.taxState || '—';
  const stateRate = user.taxRate ?? 0;

  const entriesWithMath = useMemo(() => {
    return freelanceEntries.map(entry => {
      const fedEstimate = entry.amount * FED_INCOME_ESTIMATE_RATE;
      const stateEstimate = entry.amount * (stateRate / 100);
      const seEstimate = entry.amount * SE_TAX_RATE;
      const totalLiability = fedEstimate + stateEstimate + seEstimate;
      const profit = entry.amount - totalLiability;
      
      return {
         ...entry,
         totalLiability,
         profit,
         fedEstimate,
         stateEstimate,
         seEstimate
      };
    });
  }, [freelanceEntries, stateRate]);

  const totalUnreserved = entriesWithMath
    .filter(e => !e.isVaulted)
    .reduce((sum, e) => sum + e.totalLiability, 0);

  const totalVaulted = entriesWithMath
    .filter(e => e.isVaulted)
    .reduce((sum, e) => sum + e.totalLiability, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client) { toast.error('Enter the client name'); return; }
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) { toast.error('Enter a valid payment amount.'); return; }
    const ok = await addFreelanceEntry({
      client: formData.client,
      amount: parseFloat(formData.amount),
      date: formData.date,
      isVaulted: false,
      scouredWriteOffs: formData.scouredWriteOffs
    });
    if (!ok) return;
    setFormData({ client: '', amount: '', date: new Date().toISOString().split('T')[0], scouredWriteOffs: 0 });
    setIsAddModalOpen(false);
    toast.success('Payment saved successfully');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero: The Vault Status */}
      <div className="bg-surface-raised border border-surface-border p-8 md:p-12 relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-brand-violet"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-brand-violet"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-2.5 h-2.5 ${totalUnreserved > 1000 ? 'bg-rose-500 shadow-glow-rose' : 'bg-emerald-500 shadow-glow-emerald'}`} />
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] font-bold">Weekly Income Tracker // {taxState} Rules</p>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Tax Still Owed</span>
              <h2 className="text-7xl md:text-8xl font-mono font-bold text-white tracking-tighter tabular-nums leading-none">
                ${totalUnreserved.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </h2>
            </div>
          </div>

          <div className="flex flex-col md:items-end gap-6 md:text-right border-l md:border-l-0 md:border-r border-surface-border pl-8 md:pl-0 md:pr-8">
            <div>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Tax Money Saved</p>
              <p className="text-3xl font-mono text-emerald-400 font-bold">${totalVaulted.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".pdf" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="border border-surface-border hover:bg-surface-elevated text-zinc-400 text-[10px] font-mono px-6 py-3 rounded-none uppercase font-black tracking-tighter transition-all flex items-center gap-2 group"
              >
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin text-brand-indigo" /> : <UploadCloud className="w-4 h-4 group-hover:text-brand-indigo" />}
                Scan Weekly Statement
              </button>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-brand-cta hover:bg-brand-cta-hover text-white text-[10px] font-mono px-6 py-3 rounded-none uppercase font-black tracking-tighter transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Payment
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CollapsibleModule title="Income Tracker" icon={Briefcase}>
            <div className="p-0">
               <div className="divide-y divide-surface-border">
                  {entriesWithMath.length === 0 ? (
                    <div className="px-6 py-20 text-center flex flex-col items-center">
                       <Zap className="w-12 h-12 text-zinc-700 mb-4" />
                       <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest leading-relaxed max-w-xs">
                         NO PAYMENTS LOGGED YET. START ADDING YOUR EARNINGS TO SEE HOW MUCH TO SET ASIDE FOR TAXES.
                       </p>
                    </div>
                  ) : (
                    entriesWithMath.map((entry) => (
                      <div key={entry.id} className="px-6 py-6 hover:bg-surface-elevated/40 transition-colors group flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                           <div className={`w-12 h-12 flex items-center justify-center shrink-0 border ${entry.isVaulted ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-surface-border bg-surface-raised'}`}>
                             {entry.isVaulted ? <ShieldCheck className="w-6 h-6 text-emerald-500" /> : <ShieldAlert className="w-6 h-6 text-zinc-600" />}
                           </div>
                           <div className="space-y-1">
                              <h3 className="font-mono font-black text-white text-sm uppercase tracking-tighter">{entry.client}</h3>
                              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                                {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · Gross: <span className="text-white">${entry.amount.toFixed(0)}</span>
                              </p>
                              <div className="pt-2 flex flex-wrap gap-2">
                                 <span className="text-[9px] font-mono text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded-sm">TAX: -${entry.totalLiability.toFixed(0)}</span>
                                 <span className="text-[9px] font-mono text-emerald-400 border border-emerald-400/20 px-1.5 py-0.5 rounded-sm">YOU KEEP: +${entry.profit.toFixed(0)}</span>
                                 {entry.scouredWriteOffs && entry.scouredWriteOffs > 0 && (
                                   <span className="text-[9px] font-mono bg-brand-indigo/20 text-brand-indigo border border-brand-indigo/30 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                                     <ShieldCheck className="w-3 h-3" /> DEDUCTIONS: ${entry.scouredWriteOffs.toFixed(0)} SAVED
                                   </span>
                                 )}
                              </div>
                           </div>
                        </div>

                        <div className="flex items-center gap-4">
                           <div className="text-right">
                              <p className="text-[9px] font-mono text-zinc-600 uppercase mb-1">% You Keep</p>
                              <div className="w-24 bg-surface-base h-1 rounded-none overflow-hidden">
                                 <div className="bg-brand-violet h-full" style={{ width: `${(entry.profit / entry.amount) * 100}%` }} />
                              </div>
                           </div>
                           <button 
                             onClick={() => toggleFreelanceVault(entry.id)}
                             className={`px-4 py-2 border font-mono font-black text-[9px] uppercase tracking-tighter transition-all ${entry.isVaulted ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10' : 'border-brand-cta bg-brand-cta text-white hover:bg-brand-cta-hover'}`}
                           >
                             {entry.isVaulted ? 'Saved' : 'Move to Tax Reserve'}
                           </button>
                           <button onClick={() => deleteFreelanceEntry(entry.id)} className="text-zinc-700 hover:text-rose-500 transition-colors p-2"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </CollapsibleModule>
        </div>

        <div className="space-y-6">
           <div className="bg-surface-raised border border-surface-border p-6 rounded-none">
              <div className="flex items-center gap-2 text-content-tertiary mb-4">
                 <Zap className="w-4 h-4 text-brand-violet" />
                 <h3 className="text-xs font-mono font-black uppercase tracking-[0.2em]">Freelance Tips</h3>
              </div>
              <div className="space-y-6">
                 <div className="border-l-2 border-brand-violet pl-4">
                    <p className="text-[10px] font-mono font-bold text-white uppercase mb-1">Self-Employment Tax (15.3%)</p>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase leading-relaxed tracking-tighter">
                      Oweable sets aside 15.3% from each payment for your self-employment tax bill — so you're never caught off guard.
                    </p>
                 </div>
                 <div className="border-l-2 border-brand-violet pl-4">
                    <p className="text-[10px] font-mono font-bold text-white uppercase mb-1">State Tax: {taxState}</p>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase leading-relaxed tracking-tighter">
                      In your state, an additional {stateRate}% should be saved. Your total suggested savings rate is {(stateRate + 15.3 + 12).toFixed(1)}%.
                    </p>
                 </div>
              </div>
           </div>

           <div className="bg-surface-raised border border-surface-border p-6 rounded-none">
              <div className="flex items-center gap-2 mb-5">
                 <div className="w-1.5 h-1.5 bg-emerald-500" />
                 <h3 className="text-xs font-mono font-black text-content-primary uppercase tracking-[0.2em]">Weekly Summary</h3>
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between items-center bg-surface-elevated border border-surface-border p-3">
                    <span className="text-[9px] font-mono text-content-tertiary uppercase tracking-widest">Take-Home Pay</span>
                    <span className="text-sm font-mono text-emerald-400 font-bold">${entriesWithMath.reduce((s, e) => s + e.profit, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                 </div>
                 <div className="flex justify-between items-center bg-surface-elevated border border-surface-border p-3">
                    <span className="text-[9px] font-mono text-content-tertiary uppercase tracking-widest">Taxes Owed</span>
                    <span className="text-sm font-mono text-rose-400 font-bold">${entriesWithMath.reduce((s, e) => s + e.totalLiability, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                 </div>
                 <div className="flex justify-between items-center bg-surface-elevated border border-surface-border p-3">
                    <span className="text-[9px] font-mono text-content-tertiary uppercase tracking-widest">Total Earned</span>
                    <span className="text-sm font-mono text-content-primary font-bold">${entriesWithMath.reduce((s, e) => s + e.amount, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                 </div>
              </div>
              <p className="text-[9px] font-mono text-content-muted mt-4 uppercase leading-relaxed border-t border-surface-border pt-4">
                'Saved' means you've moved this money to a separate account for taxes.
              </p>
           </div>
        </div>
      </div>

      {/* Add Entry Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-surface-raised border border-surface-border p-8 w-full max-w-md shadow-3xl"
            >
               <h2 className="text-xl font-mono font-black text-white uppercase tracking-widest mb-6">Add New Payment</h2>
               <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Who paid you?</label>
                    <input autoFocus type="text" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} className="w-full bg-surface-base border border-surface-border h-12 px-4 text-white font-mono outline-none focus:border-brand-indigo transition-colors" placeholder="e.g. Acme Studio" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Payment Amount ($)</label>
                    <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-surface-base border border-surface-border h-12 px-4 text-white font-mono outline-none focus:border-brand-indigo transition-colors" placeholder="0.00" />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 h-12 border border-surface-border text-zinc-500 font-mono text-[10px] uppercase font-black tracking-widest hover:bg-surface-elevated transition-colors">Cancel</button>
                    <button type="submit" className="flex-2 bg-brand-cta hover:bg-brand-cta-hover text-white h-12 px-8 font-mono text-[10px] uppercase font-black tracking-widest transition-all">Add Payment</button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
