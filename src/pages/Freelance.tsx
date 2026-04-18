import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import {
  Plus, Target, Hash, ShieldAlert, ShieldCheck,
  Trash2, Briefcase, Calendar, Calculator, Info,
  TrendingUp, TrendingDown, ArrowUpRight, Zap,
  FileText, UploadCloud, Loader2
} from 'lucide-react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { TransitionLink } from '../components/TransitionLink';
import { IRS_MILEAGE_RATE } from '../lib/finance';
import { yieldForPaint } from '../lib/interaction';

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
    await yieldForPaint();
    toast.info('Scanning statement...');

    try {
      let fullText = "";
      if (uploadedFile.type === 'application/pdf') {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const pdfjsLib = await import('pdfjs-dist');
        const pdfjsWorkerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
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
      if (uploadedFile.type === 'application/pdf') {
        toast.success('PDF scanned', {
          description: 'Confirm payer and amount before saving — text extraction can misread statements.',
          duration: 6500,
        });
      } else {
        toast.success('Information extracted');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to read PDF. Please enter manually.');
      setIsAddModalOpen(true);
    } finally {
      setIsScanning(false);
    }
  };

  const taxState = user.taxState || '';
  const stateRate = user.taxRate ?? 0;
  const hasTaxState = Boolean(user.taxState?.trim());

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
    await yieldForPaint();
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
    <div className="space-y-6 w-full">
      {/* Hero: The Vault Status */}
      <div className="bg-surface-raised border border-surface-border p-8 md:p-12 relative overflow-hidden group shadow-none">
        <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-surface-border" />
        <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-surface-border" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-2.5 h-2.5 ${totalUnreserved > 1000 ? 'bg-rose-500 shadow-glow-rose' : 'bg-emerald-500 shadow-glow-emerald'}`} />
              <p className="text-xs font-sans text-content-tertiary">
                Weekly income tracker
                {hasTaxState ? ` · ${taxState}` : ''}
              </p>
            </div>
            
            <div className="flex flex-col">
              <span className="text-xs text-content-tertiary mb-1">Tax still owed (unreserved)</span>
              <h2 className="text-7xl md:text-8xl font-mono font-bold text-content-primary tracking-tighter tabular-nums leading-none data-numeric">
                ${totalUnreserved.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </h2>
            </div>
          </div>

          <div className="flex flex-col md:items-end gap-6 md:text-right border-l md:border-l-0 md:border-r border-surface-border pl-8 md:pl-0 md:pr-8">
            <div>
              <p className="text-xs text-content-tertiary mb-1">Moved to tax reserve</p>
              <p className="text-3xl font-mono tabular-nums text-emerald-400 font-bold data-numeric">${totalVaulted.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
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
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="border border-surface-border hover:bg-surface-elevated text-content-secondary text-sm font-sans font-medium px-6 py-3 rounded-lg transition-all flex items-center gap-2 group"
              >
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin text-content-primary" /> : <UploadCloud className="w-4 h-4 group-hover:text-content-primary shrink-0" aria-hidden />}
                Scan statement (PDF)
              </button>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font-sans font-semibold px-6 py-3 rounded-lg shadow-none transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4 shrink-0" aria-hidden /> Add payment
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
                       <Zap className="w-12 h-12 text-content-muted mb-4" />
                       <p className="text-content-primary text-sm font-medium leading-relaxed max-w-sm">
                         Add your first freelance payment to see your tax set-aside calculated automatically.
                       </p>
                       <button
                         type="button"
                         onClick={() => setIsAddModalOpen(true)}
                         className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-cta px-5 py-2.5 text-sm font-semibold text-surface-base hover:bg-brand-cta-hover"
                       >
                         <Plus className="w-4 h-4 shrink-0" aria-hidden /> Add payment
                       </button>
                    </div>
                  ) : (
                    entriesWithMath.map((entry) => (
                      <div key={entry.id} className="px-6 py-6 hover:bg-surface-elevated/40 transition-colors group flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                           <div className={`w-12 h-12 flex items-center justify-center shrink-0 border ${entry.isVaulted ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-surface-border bg-surface-raised'}`}>
                             {entry.isVaulted ? <ShieldCheck className="w-6 h-6 text-emerald-500" /> : <ShieldAlert className="w-6 h-6 text-content-muted" />}
                           </div>
                           <div className="space-y-1">
                              <h3 className="font-sans font-semibold text-content-primary text-sm">{entry.client}</h3>
                              <p className="text-xs text-content-tertiary">
                                {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · Gross <span className="text-content-primary font-mono tabular-nums">${entry.amount.toFixed(0)}</span>
                              </p>
                              <div className="pt-2 flex flex-wrap gap-2">
                                 <span className="text-[10px] font-mono tabular-nums text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded-lg">Tax −${entry.totalLiability.toFixed(0)}</span>
                                 <span className="text-[10px] font-mono tabular-nums text-emerald-400 border border-emerald-400/20 px-1.5 py-0.5 rounded-lg">You keep +${entry.profit.toFixed(0)}</span>
                                 {entry.scouredWriteOffs && entry.scouredWriteOffs > 0 && (
                                   <span className="text-[10px] font-sans bg-surface-elevated text-content-primary border border-surface-border px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                                     <ShieldCheck className="w-3 h-3 shrink-0" aria-hidden /> Deductions ${entry.scouredWriteOffs.toFixed(0)}
                                   </span>
                                 )}
                              </div>
                           </div>
                        </div>

                        <div className="flex items-center gap-4">
                           <div className="text-right">
                              <p className="text-xs text-content-tertiary mb-1">% you keep</p>
                              <div className="w-24 bg-surface-base h-1 rounded-none overflow-hidden">
                                 <div className="bg-content-primary/50 h-full" style={{ width: `${(entry.profit / entry.amount) * 100}%` }} />
                              </div>
                           </div>
                           <button 
                             onClick={() => toggleFreelanceVault(entry.id)}
                             className={`px-4 py-2 border text-xs font-sans font-semibold transition-all rounded-lg ${entry.isVaulted ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10' : 'border-surface-border bg-brand-cta text-surface-base hover:bg-brand-cta-hover'}`}
                           >
                             {entry.isVaulted ? 'Saved' : 'Move to tax reserve'}
                           </button>
                           <button onClick={() => deleteFreelanceEntry(entry.id)} className="text-content-muted hover:text-rose-500 transition-colors p-2"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </CollapsibleModule>
        </div>

        <div className="space-y-6">
           <div className="rounded-lg border border-surface-border bg-surface-raised p-6">
              <div className="flex items-center gap-2 text-content-tertiary mb-4">
                 <Zap className="w-4 h-4 text-content-secondary" />
                 <h3 className="text-sm font-sans font-semibold text-content-primary">Freelance tips</h3>
              </div>
              <div className="space-y-6">
                 <div className="border-l-2 border-surface-border pl-4">
                    <p className="text-sm font-sans font-medium text-content-primary mb-1">Self-employment tax (15.3%)</p>
                    <p className="text-xs text-content-tertiary leading-relaxed">
                      We set aside 15.3% from each payment toward self-employment tax.
                    </p>
                 </div>
                 <div className="border-l-2 border-surface-border pl-4">
                    <p className="text-sm font-sans font-medium text-content-primary mb-1">
                      State tax · {hasTaxState ? taxState : '—'}
                    </p>
                    {!hasTaxState ? (
                      <p className="text-xs text-amber-600/90 dark:text-amber-400/90 leading-relaxed">
                        <TransitionLink
                          to="/settings?tab=financial#tax-state-preference"
                          className="font-medium underline underline-offset-2"
                        >
                          Set your state
                        </TransitionLink>{' '}
                        so Freelance Vault can estimate state withholding.
                      </p>
                    ) : (
                      <p className="text-xs text-content-tertiary leading-relaxed">
                        Save an extra {stateRate}% for state. Suggested total rate about {(stateRate + 15.3 + 12).toFixed(1)}%.
                      </p>
                    )}
                 </div>
              </div>
           </div>

           <div className="rounded-lg border border-surface-border bg-surface-raised p-6">
              <div className="flex items-center gap-2 mb-5">
                 <div className="w-1.5 h-1.5 bg-emerald-500" />
                 <h3 className="text-sm font-sans font-semibold text-content-primary">Weekly summary</h3>
              </div>
              <div className="space-y-2">
                 {entriesWithMath.length === 0 ? (
                   <>
                     <div className="rounded-lg border border-dashed border-surface-border bg-surface-base p-4 text-left">
                       <p className="text-xs font-medium text-content-secondary">Take-home (weekly)</p>
                       <p className="mt-1 text-[11px] text-content-tertiary">Shows after you log payments.</p>
                     </div>
                     <div className="rounded-lg border border-dashed border-surface-border bg-surface-base p-4 text-left">
                       <p className="text-xs font-medium text-content-secondary">Taxes owed (weekly)</p>
                       <p className="mt-1 text-[11px] text-content-tertiary">We&apos;ll estimate federal, state, and SE tax.</p>
                     </div>
                     <div className="rounded-lg border border-dashed border-surface-border bg-surface-base p-4 text-left">
                       <p className="text-xs font-medium text-content-secondary">Total earned</p>
                       <p className="mt-1 text-[11px] text-content-tertiary">Your gross freelance inflow for the period.</p>
                     </div>
                   </>
                 ) : (
                   <>
                     <div className="flex justify-between items-center bg-surface-elevated border border-surface-border p-3">
                       <span className="text-xs text-content-tertiary">Take-home</span>
                       <span className="text-sm font-mono tabular-nums text-emerald-400 font-bold data-numeric">
                         ${entriesWithMath.reduce((s, e) => s + e.profit, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                       </span>
                     </div>
                     <div className="flex justify-between items-center bg-surface-elevated border border-surface-border p-3">
                       <span className="text-xs text-content-tertiary">Taxes owed</span>
                       <span className="text-sm font-mono tabular-nums text-rose-400 font-bold data-numeric">
                         ${entriesWithMath.reduce((s, e) => s + e.totalLiability, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                       </span>
                     </div>
                     <div className="flex justify-between items-center bg-surface-elevated border border-surface-border p-3">
                       <span className="text-xs text-content-tertiary">Total earned</span>
                       <span className="text-sm font-mono tabular-nums text-content-primary font-bold data-numeric">
                         ${entriesWithMath.reduce((s, e) => s + e.amount, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                       </span>
                     </div>
                   </>
                 )}
              </div>
              <p className="text-xs text-content-tertiary mt-4 leading-relaxed border-t border-surface-border pt-4">
                “Saved” means you moved this amount to a separate account for taxes.
              </p>
           </div>
        </div>
      </div>

      {/* Add Entry Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <Dialog open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} className="relative z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90"
              aria-hidden="true"
            />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md"
              >
                <Dialog.Panel className="bg-surface-raised border border-surface-border p-8 shadow-none">
                  <Dialog.Title className="text-xl font-sans font-semibold text-content-primary mb-6">Add payment</Dialog.Title>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-sans font-medium text-content-secondary mb-2">Who paid you?</label>
                      <input autoFocus type="text" value={formData.client} onChange={e => setFormData({ ...formData, client: e.target.value })} className="w-full bg-surface-base border border-surface-border h-12 px-4 text-content-primary focus-app-field transition-colors rounded-lg" placeholder="e.g. Acme Studio" />
                    </div>
                    <div>
                      <label className="block text-sm font-sans font-medium text-content-secondary mb-2">Payment amount</label>
                      <input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="w-full bg-surface-base border border-surface-border h-12 px-4 text-content-primary font-mono tabular-nums focus-app-field transition-colors rounded-lg" placeholder="0.00" />
                    </div>
                    <p className="text-xs text-content-muted leading-relaxed">If this row came from a PDF scan, double-check the amount matches your statement.</p>
                    <div className="pt-4 flex gap-3">
                      <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 h-12 border border-surface-border text-content-tertiary text-sm font-sans font-medium hover:bg-surface-elevated transition-colors rounded-lg focus-app">Cancel</button>
                      <button type="submit" className="flex-[2] bg-brand-cta hover:bg-brand-cta-hover text-surface-base h-12 px-8 text-sm font-sans font-semibold transition-all rounded-lg focus-app">Add payment</button>
                    </div>
                  </form>
                </Dialog.Panel>
              </motion.div>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
