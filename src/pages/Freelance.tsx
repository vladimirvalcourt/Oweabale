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
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

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

      // Deduction Scouring: Mileage & Fees
      const milesMatch = fullText.match(/(\d+\.?\d*)\s*(miles?|mi|km)/i);
      const feeMatch = fullText.match(/(\$?\s*\d+\.\d{2})\s*(fees?|commission|service)/i);
      
      let capturedWriteOffs = 0;
      if (milesMatch) {
         const miles = parseFloat(milesMatch[1]);
         const mileageDeduction = miles * 0.67; // 2024 IRS Rate
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
        toast.success(`Deduction Scoured: Found $${capturedWriteOffs.toFixed(2)} in write-offs`);
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

  const taxState = user.taxState || 'NY';
  const stateRate = user.taxRate ?? 6.25;
  const seTaxRate = 15.3; // Standard Self-Employment Tax

  const entriesWithMath = useMemo(() => {
    return freelanceEntries.map(entry => {
      const fedEstimate = entry.amount * 0.12; // Simplified 12% average fed
      const stateEstimate = entry.amount * (stateRate / 100);
      const seEstimate = entry.amount * 0.153;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client) { toast.error('Enter who paid you.'); return; }
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) { toast.error('Enter a valid payment amount.'); return; }
    addFreelanceEntry({
      client: formData.client,
      amount: parseFloat(formData.amount),
      date: formData.date,
      isVaulted: false,
      scouredWriteOffs: formData.scouredWriteOffs
    });
    setFormData({ client: '', amount: '', date: new Date().toISOString().split('T')[0], scouredWriteOffs: 0 });
    setIsAddModalOpen(false);
    toast.success('Inflow logged and shielded');
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
                className="bg-brand-indigo hover:bg-brand-violet text-white text-[10px] font-mono px-6 py-3 rounded-none uppercase font-black tracking-tighter transition-all flex items-center gap-2"
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
                         NO RECENT GIG INFLOWS DETECTED. START LOGGING YOUR WEEKLY EARNINGS TO CALCULATE SHIELD REQUIREMENTS.
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
                                 <span className="text-[9px] font-mono text-emerald-400 border border-emerald-400/20 px-1.5 py-0.5 rounded-sm">REAL: +${entry.profit.toFixed(0)}</span>
                                 {entry.scouredWriteOffs && entry.scouredWriteOffs > 0 && (
                                   <span className="text-[9px] font-mono bg-brand-indigo/20 text-brand-indigo border border-brand-indigo/30 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                                     <ShieldCheck className="w-3 h-3" /> TAX SHIELD: ${entry.scouredWriteOffs.toFixed(0)} SAVED
                                   </span>
                                 )}
                              </div>
                           </div>
                        </div>

                        <div className="flex items-center gap-4">
                           <div className="text-right">
                              <p className="text-[9px] font-mono text-zinc-600 uppercase mb-1">State Efficiency</p>
                              <div className="w-24 bg-surface-base h-1 rounded-none overflow-hidden">
                                 <div className="bg-brand-indigo h-full" style={{ width: `${(entry.profit / entry.amount) * 100}%` }} />
                              </div>
                           </div>
                           <button 
                             onClick={() => toggleFreelanceVault(entry.id)}
                             className={`px-4 py-2 border font-mono font-black text-[9px] uppercase tracking-tighter transition-all ${entry.isVaulted ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10' : 'border-brand-indigo bg-brand-indigo text-white hover:bg-brand-violet'}`}
                           >
                             {entry.isVaulted ? 'Saved' : 'Mark as Saved'}
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
              <div className="flex items-center gap-2 text-brand-indigo mb-4">
                 <Zap className="w-4 h-4" />
                 <h3 className="text-xs font-mono font-black uppercase tracking-[0.2em]">Freelance Tips</h3>
              </div>
              <div className="space-y-6">
                 <div className="border-l-2 border-brand-violet pl-4">
                    <p className="text-[10px] font-mono font-bold text-white uppercase mb-1">Self-Employment Tax</p>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase leading-relaxed tracking-tighter">
                      Oweable has set aside 15.3% for Self-Employment tax. This is your largest mandatory cost.
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

           <div className="bg-brand-indigo p-6 rounded-none shadow-[0_35px_60px_-15px_rgba(99,102,241,0.3)]">
              <h3 className="text-xs font-mono font-black text-white uppercase tracking-[0.2em] mb-4">Weekly Summary</h3>
              <div className="space-y-3">
                 <div className="flex justify-between items-center bg-black/10 p-2 border border-white/10">
                    <span className="text-[9px] font-mono text-white opacity-60 uppercase">Real Money Kept</span>
                    <span className="text-sm font-mono text-white font-bold">${entriesWithMath.reduce((s, e) => s + e.profit, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                 </div>
                 <div className="flex justify-between items-center bg-black/10 p-2 border border-white/10">
                    <span className="text-[9px] font-mono text-white opacity-60 uppercase">Taxes Owed</span>
                    <span className="text-sm font-mono text-white font-bold">${entriesWithMath.reduce((s, e) => s + e.totalLiability, 0) .toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                 </div>
              </div>
              <p className="text-[9px] font-mono text-white/50 mt-4 uppercase leading-relaxed">
                'Saved' confirms you have physically moved these funds to a separate bank account.
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
                    <button type="submit" className="flex-2 bg-brand-indigo hover:bg-brand-violet text-white h-12 px-8 font-mono text-[10px] uppercase font-black tracking-widest transition-all">Add Payment</button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
