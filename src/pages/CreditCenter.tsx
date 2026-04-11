import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, AlertCircle, TrendingUp, HelpCircle, 
  ChevronRight, ArrowUpRight, CheckCircle2, XCircle, 
  Mail, ExternalLink, Calendar, Calculator, Plus, Trash2, Edit3, Send,
  FileText, Download, Copy, ShieldAlert, X
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';
import { AppPageShell } from '../components/AppPageShell';

export default function CreditCenter() {
  const { credit, updateCreditScore, addCreditFix, updateCreditFix, deleteCreditFix, debts, user } = useStore();
  const [isFixModalOpen, setIsFixModalOpen] = useState(false);
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [selectedFixId, setSelectedFixId] = useState<string | null>(null);
  
  const [fixItem, setFixItem] = useState('');
  const [fixAmount, setFixAmount] = useState('');
  const [fixBureau, setFixBureau] = useState('Experian');
  const [fixNotes, setFixNotes] = useState('');

  // Defensive programming for hydrated store
  const creditScore = credit?.score ?? 0;
  const activeFixes = (credit?.fixes || []).filter(f => f.status !== 'resolved');
  const itemsSent = (credit?.fixes || []).filter(f => f.status === 'sent').length;
  const itemsResolved = (credit?.fixes || []).filter(f => f.status === 'resolved').length;
  
  const scoreProgress = ((creditScore - 300) / (850 - 300)) * 100;

  const selectedFix = useMemo(() => 
    (credit?.fixes || []).find(f => f.id === selectedFixId), 
  [credit?.fixes, selectedFixId]);

  // 1. Calculate a simple "Quick Boost" Tip
  const highBalanceCard = useMemo(() => {
    return (debts || [])
      .filter(d => d.type === 'Card' || d.type === 'Store Card')
      .sort((a, b) => (b.remaining || 0) - (a.remaining || 0))[0];
  }, [debts]);

  const boostTip = useMemo(() => {
    if (!highBalanceCard) return null;
    const remaining = highBalanceCard.remaining || 0;
    const targetBalance = remaining * 0.1; // target 10% utilization
    const amountToPay = remaining - targetBalance;
    // Estimated points: higher utilization reduction = more points (capped 10–40)
    const utilizationReduction = remaining - targetBalance;
    const pointPotential = Math.min(40, Math.max(10, Math.floor(utilizationReduction / 500)));
    return {
      cardName: highBalanceCard.name,
      amountToPay,
      pointPotential,
    };
  }, [highBalanceCard]);

  const handleAddFix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixItem) return;
    
    await addCreditFix({
      item: fixItem,
      amount: parseFloat(fixAmount) || 0,
      bureau: fixBureau,
      status: 'todo',
      notes: fixNotes
    });
    
    toast.success('Added to your fix-it list');
    setIsFixModalOpen(false);
    setFixItem('');
    setFixAmount('');
    setFixNotes('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-emerald-500';
      case 'good': return 'text-indigo-400';
      case 'fair': return 'text-amber-500';
      case 'poor': return 'text-rose-500';
      default: return 'text-content-tertiary';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'low': return 'bg-zinc-500/10 text-content-tertiary border-zinc-500/20';
      default: return 'bg-zinc-500/10 text-content-tertiary border-zinc-500/20';
    }
  };

  const generateLetter = (fix: any) => {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return `
${user.firstName} ${user.lastName}
[Your Address]
[City, State, Zip]

Date: ${today}

To: ${fix.bureau} Dispute Department
[Bureau Address]

RE: DISPUTE OF INACCURATE INFORMATION

To Whom It May Concern,

I am writing to formally dispute the following information appearing on my credit report. I have identified an error regarding the item titled "${fix.item}" with an approximate amount of $${fix.amount.toLocaleString()}.

Reason for Dispute:
${fix.notes || "The information provided for this account is inaccurate and does not match my personal records. I request a full investigation into this matter."}

Under the Fair Credit Reporting Act (FCRA), you are required to investigate this dispute and provide a response within 30 days. If you find that this information is indeed inaccurate, please remove it from my file or update it corrected immediately.

Please provide a copy of my corrected credit report once the investigation is complete.

Sincerely,

${user.firstName} ${user.lastName}
    `.trim();
  };

  return (
    <AppPageShell className="min-h-screen">
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-8">
        
        {/* Header & Score Gauge */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 space-y-2">
            <h1 className="text-3xl font-sans font-bold tracking-tight text-white uppercase italic">Credit Workshop</h1>
            <p className="text-content-tertiary font-sans max-w-xl">
              Track your reputation, dispute errors, and execute tactical payoffs. This is your command center for credit repair.
            </p>
          </div>

          {/* Tactile Score Display */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-raised border border-surface-border p-8 rounded-sm shrink-0 w-full md:w-64 text-center relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
            <p className="text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-widest mb-2">Estimated Score</p>
            <p className="text-6xl font-mono font-bold text-white tracking-tighter mb-2">{creditScore || '—'}</p>
            {credit?.lastUpdated ? (
              <div className="flex items-center justify-center gap-2 text-[11px] font-mono uppercase tracking-widest text-content-tertiary">
                <Calendar className="w-3 h-3" />
                <span>Updated {new Date(credit.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            ) : (
              <p className="text-[11px] font-mono uppercase tracking-widest text-content-muted">No score recorded yet</p>
            )}
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left: Factors & Boost Tips */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Main Factors */}
            <section className="bg-surface-raised border border-surface-border rounded-sm overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-zinc-900/50">
                <h2 className="text-xs font-mono font-bold text-content-tertiary uppercase tracking-widest">Score Breakdown</h2>
                <button className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1">
                  Education <HelpCircle className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-surface-border">
                {(credit?.factors || []).map(factor => (
                  <div key={factor.id} className="p-6 flex flex-col md:flex-row gap-4 items-start md:items-center hover:bg-white/5 transition-colors">
                    <div className="flex-1 space-y-1 text-left w-full">
                      <div className="flex items-center justify-between md:justify-start gap-3">
                        <span className="text-sm font-sans font-bold text-white">{factor.name}</span>
                        <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-mono font-bold uppercase border ${getImpactColor(factor.impact)}`}>
                          {factor.impact} Impact
                        </span>
                      </div>
                      <p className="text-xs text-content-tertiary">{factor.description}</p>
                    </div>
                    <div className={`text-sm font-mono font-bold uppercase tracking-wider ${getStatusColor(factor.status)}`}>
                      {factor.status}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick Boost Section */}
            <section className="bg-indigo-600/5 border border-indigo-500/20 rounded-sm p-8 relative overflow-hidden group">
              <div className="absolute -top-4 -right-4 text-indigo-500/10 group-hover:text-indigo-500/20 transition-all duration-700">
                <TrendingUp className="w-32 h-32 rotate-12" />
              </div>
              <div className="relative z-10 text-left">
                <h2 className="text-sm font-mono font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Calculator className="w-4 h-4" /> Tactical Optimization
                </h2>
                {boostTip ? (
                  <>
                    <p className="text-2xl font-sans font-bold text-white mb-4 italic leading-tight">
                      Reduce <span className="text-indigo-400">{boostTip.cardName}</span> balance <br className="hidden md:block"/>
                      to <span className="text-indigo-400">10% utilization</span> 
                    </p>
                    <p className="text-sm text-content-tertiary mb-6 max-w-lg leading-relaxed">
                      Your current utilization on this account is suppressing your score. Pay <span className="text-white font-mono">${boostTip.amountToPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> to trigger a recalculation.
                    </p>
                    <div className="inline-flex items-center bg-black/30 border border-indigo-500/10 px-4 py-2 rounded-sm text-xs font-mono">
                      <span className="text-content-tertiary uppercase tracking-widest mr-2">Est. Boost</span>
                      <span className="text-indigo-400 font-bold">~{boostTip.pointPotential} Points</span>
                    </div>
                  </>
                ) : (
                  <p className="text-content-tertiary text-sm">Add active credit lines to see high-velocity boost tips.</p>
                )}
              </div>
            </section>
          </div>

          {/* Right: Fix Mistakes & To-Do */}
          <div className="space-y-8">
            
            {/* Fix-it List */}
            <section className="bg-surface-raised border border-surface-border rounded-sm flex flex-col h-full shadow-lg">
              <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-zinc-900/50">
                <h2 className="text-xs font-mono font-bold text-content-tertiary uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Dispute Hub
                </h2>
                <button 
                  onClick={() => setIsFixModalOpen(true)}
                  className="p-1 px-3 bg-white/5 border border-white/10 rounded-sm hover:bg-white/10 text-[10px] font-mono font-bold uppercase text-white transition-all"
                >
                  New Case
                </button>
              </div>
              
              <div className="flex-1 divide-y divide-surface-border overflow-y-auto max-h-[500px] outline-none">
                {(!credit?.fixes || credit.fixes.length === 0) ? (
                  <div className="p-12 text-center space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center text-content-muted">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-mono text-content-tertiary uppercase tracking-widest">Clear Record</p>
                      <p className="text-[10px] text-content-muted mt-1 uppercase tracking-tight">System monitoring active</p>
                    </div>
                  </div>
                ) : (
                  credit.fixes.map(fix => (
                    <div key={fix.id} className="p-5 space-y-3 hover:bg-white/5 transition-colors text-left group">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-sans font-bold text-white">{fix.item}</h3>
                          <p className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest">{fix.bureau}</p>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border ${
                          fix.status === 'resolved' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' : 
                          fix.status === 'sent' ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5' : 
                          'border-white/10 text-content-tertiary'
                        }`}>
                          {fix.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-white font-bold">${fix.amount.toLocaleString()}</span>
                        <div className="h-px bg-zinc-800 flex-1" />
                      </div>
                      
                      <div className="flex items-center gap-2 pt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setSelectedFixId(fix.id);
                            setIsLetterModalOpen(true);
                          }}
                          className="flex-1 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <FileText className="w-3 h-3" /> Letter
                        </button>
                        <button 
                          onClick={() => updateCreditFix(fix.id, { status: fix.status === 'resolved' ? 'todo' : 'resolved' })}
                          className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-content-secondary border border-white/5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-all"
                        >
                          {fix.status === 'resolved' ? 'Undo' : 'Resolve'}
                        </button>
                        <button 
                          onClick={() => deleteCreditFix(fix.id)}
                          className="p-1.5 text-content-muted hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 bg-surface-base border-t border-surface-border space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-widest">
                  <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" /> Protection Shield
                </div>
                <div className="space-y-2">
                  <a href="https://www.annualcreditreport.com" target="_blank" rel="noreferrer" className="flex items-center justify-between p-2.5 text-[11px] text-content-tertiary hover:text-white bg-white/5 border border-white/5 rounded-sm transition-all group">
                    Full Credit Report <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                  </a>
                  <a href="https://www.experian.com" target="_blank" rel="noreferrer" className="flex items-center justify-between p-2.5 text-[11px] text-content-tertiary hover:text-white bg-white/5 border border-white/5 rounded-sm transition-all group">
                    Freeze Credit <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                  </a>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Add Fix Modal */}
        <AnimatePresence>
          {isFixModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setIsFixModalOpen(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-md bg-surface-elevated border border-surface-border rounded-sm shadow-2xl p-8"
              >
                <h2 className="text-sm font-mono font-bold text-white uppercase tracking-widest mb-6 border-b border-surface-border pb-4">Report Error</h2>
                <form onSubmit={handleAddFix} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-widest mb-1.5">Description</label>
                    <input 
                      autoFocus
                      type="text" 
                      value={fixItem}
                      onChange={e => setFixItem(e.target.value)}
                      placeholder="e.g., Inaccurate Medical Collection"
                      className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-3 text-sm text-white focus:border-indigo-500 outline-none placeholder:text-content-muted"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-widest mb-1.5">Amount ($)</label>
                      <input 
                        type="number" 
                        value={fixAmount}
                        onChange={e => setFixAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-3 text-sm text-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-widest mb-1.5">Bureau</label>
                      <select 
                        value={fixBureau}
                        onChange={e => setFixBureau(e.target.value)}
                        className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-3 text-sm text-white focus:border-indigo-500 outline-none h-[46px]"
                      >
                        <option>Experian</option>
                        <option>Equifax</option>
                        <option>TransUnion</option>
                        <option>All Three</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-widest mb-1.5">Evidence / Notes</label>
                    <textarea 
                      value={fixNotes}
                      onChange={e => setFixNotes(e.target.value)}
                      placeholder="Explain why this is incorrect..."
                      className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-3 text-sm text-white focus:border-indigo-500 outline-none h-24 resize-none placeholder:text-content-muted"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsFixModalOpen(false)}
                      className="flex-1 py-3 text-xs font-mono font-bold text-content-tertiary hover:text-white uppercase tracking-widest transition-colors"
                    >
                      Dismiss
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-xs font-mono font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/10"
                    >
                      Add Case
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Generated Letter Modal */}
        <AnimatePresence>
          {isLetterModalOpen && selectedFix && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
                onClick={() => setIsLetterModalOpen(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, rotateX: -10 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                exit={{ opacity: 0, scale: 0.9, rotateX: 10 }}
                className="relative w-full max-w-2xl bg-white text-zinc-900 rounded-sm shadow-2xl p-10 font-serif"
              >
                <div className="flex justify-between items-start mb-8 border-b border-zinc-200 pb-4 no-print">
                  <div className="space-y-1">
                    <h2 className="text-xl font-sans font-black uppercase italic tracking-tighter text-zinc-900">
                      Dispute <span className="text-indigo-600">Letter</span>
                    </h2>
                    <p className="text-xs font-sans text-content-tertiary uppercase tracking-widest">Formal Legal Correspondence</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(generateLetter(selectedFix));
                        toast.success('Letter copied to clipboard');
                      }}
                      className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-colors"
                      title="Copy text"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => window.print()}
                      className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-colors"
                      title="Print"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setIsLetterModalOpen(false)}
                      className="p-2 bg-zinc-100 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="whitespace-pre-wrap text-[11pt] leading-relaxed max-h-[60vh] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-zinc-300">
                  {generateLetter(selectedFix)}
                </div>

                <div className="mt-8 pt-8 border-t border-zinc-100 flex items-center justify-between no-print">
                  <p className="text-[10px] font-sans text-content-tertiary italic">
                    Certified Mail is recommended for all legal disputes.
                  </p>
                  <button 
                    onClick={() => {
                      updateCreditFix(selectedFix.id, { status: 'sent' });
                      setIsLetterModalOpen(false);
                      toast.success('Status updated to SENT');
                    }}
                    className="px-6 py-2 bg-zinc-900 text-white font-sans font-bold text-xs uppercase tracking-widest rounded-sm hover:bg-indigo-600 transition-colors"
                  >
                    Mark as Sent
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppPageShell>
  );
}
