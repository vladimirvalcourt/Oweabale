import React, { useState, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, AlertCircle, TrendingUp, HelpCircle, 
  ChevronRight, ArrowUpRight, CheckCircle2, XCircle, 
  Mail, ExternalLink, Calendar, Calculator, Plus, Trash2, Edit3, Send,
  FileText, Download, Copy, ShieldAlert, X
} from 'lucide-react';
import { useStore } from '@/store';
import { toast } from 'sonner';
import { AppPageShell } from '@/components/layout';
import { TransitionLink } from '@/components/common';
import { yieldForPaint } from '@/lib/utils';
import { EXTERNAL_RESOURCES } from '@/config/externalResources';

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

    await yieldForPaint();
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
      case 'good': return 'text-content-primary';
      case 'fair': return 'text-amber-500';
      case 'poor': return 'text-rose-500';
      default: return 'text-content-tertiary';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'low': return 'bg-surface-border/40 text-content-tertiary border-surface-border';
      default: return 'bg-surface-border/40 text-content-tertiary border-surface-border';
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
      <div className="space-y-8 w-full pb-12">
        
        {/* Header & Score Gauge */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 space-y-2">
            <h1 className="font-sans text-3xl font-medium tracking-tight text-content-primary sm:text-4xl">Credit workshop</h1>
            <p className="max-w-xl font-sans text-sm font-medium leading-relaxed text-content-secondary">
              Track your score, dispute errors, and plan paydowns. This view is for organization only—not credit repair advice.
            </p>
          </div>

          {/* Tactile Score Display */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-raised border border-surface-border p-8 rounded-xl shrink-0 w-full md:w-64 text-center relative overflow-hidden shadow-none"
          >
            <div className="absolute top-0 left-0 w-full h-px bg-surface-border" />
            <p className="text-xs font-mono font-bold text-content-tertiary uppercase tracking-widest mb-2">Estimated Score</p>
            <p className="text-6xl font-mono font-bold text-content-primary tracking-tighter mb-2">{creditScore || '—'}</p>
            {credit?.lastUpdated ? (
              <div className="flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-widest text-content-tertiary">
                <Calendar className="w-3 h-3" />
                <span>Updated {new Date(credit.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            ) : (
              <p className="text-xs font-mono uppercase tracking-widest text-content-muted">No score recorded yet</p>
            )}
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left: Factors & Boost Tips */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Main Factors */}
            <section className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden shadow-none">
              <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-raised/80">
                <h2 className="text-xs font-mono font-bold text-content-tertiary uppercase tracking-widest">Score Breakdown</h2>
                <TransitionLink
                  to="/education"
                  className="focus-app rounded text-xs font-mono uppercase tracking-widest text-content-primary flex items-center gap-1 hover:text-content-secondary"
                >
                  Education <HelpCircle className="w-3 h-3 shrink-0" aria-hidden />
                </TransitionLink>
              </div>
              <div className="divide-y divide-surface-border">
                {(credit?.factors || []).map(factor => (
                  <div key={factor.id} className="p-6 flex flex-col md:flex-row gap-4 items-start md:items-center hover:bg-content-primary/5 transition-colors">
                    <div className="flex-1 space-y-1 text-left w-full">
                      <div className="flex items-center justify-between md:justify-start gap-3">
                        <span className="text-sm font-sans font-bold text-content-primary">{factor.name}</span>
                        <span className={`px-1.5 py-0.5 rounded-xl text-xs font-mono font-bold uppercase border ${getImpactColor(factor.impact)}`}>
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
            <section className="bg-content-primary/[0.03] border border-surface-border rounded-xl p-8 relative overflow-hidden group">
              <div className="absolute -top-4 -right-4 text-content-secondary/10 group-hover:text-content-secondary/20 transition-all duration-700">
                <TrendingUp className="w-32 h-32 rotate-12" />
              </div>
              <div className="relative z-10 text-left">
                <h2 className="text-sm font-mono font-bold text-content-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Calculator className="w-4 h-4" /> Tactical Optimization
                </h2>
                {boostTip ? (
                  <>
                    <p className="text-2xl font-sans font-bold text-content-primary mb-4 italic leading-tight">
                      Reduce <span className="text-content-primary">{boostTip.cardName}</span> balance <br className="hidden md:block"/>
                      to <span className="text-content-primary">10% utilization</span>
                    </p>
                    <p className="text-sm text-content-tertiary mb-6 max-w-lg leading-relaxed">
                      Your current utilization on this account is suppressing your score. Pay <span className="text-content-primary font-mono">${boostTip.amountToPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> to trigger a recalculation.
                    </p>
                    <div className="inline-flex items-center bg-black/30 border border-surface-border px-4 py-2 rounded-md text-xs font-mono">
                      <span className="text-content-tertiary uppercase tracking-widest mr-2">Est. Boost</span>
                      <span className="text-content-primary font-bold">~{boostTip.pointPotential} Points</span>
                    </div>
                  </>
                ) : (
                  <p className="text-content-tertiary text-sm">Add active credit lines to see high-velocity boost tips.</p>
                )}

                {/* PAGE-07: Score-bracket tips — shown below the boost tip */}
                {creditScore > 0 && (() => {
                  const bracket =
                    creditScore >= 740 ? 'excellent' :
                    creditScore >= 670 ? 'good' :
                    creditScore >= 580 ? 'fair' : 'building';
                  const tipsByBracket: Record<string, { label: string; tips: string[] }> = {
                    building: {
                      label: '300–579 · Building',
                      tips: [
                        'Become an authorized user on a trusted family member\'s card to inherit their history.',
                        'Open a secured credit card — even a $200 limit builds positive payment history.',
                        'Pay every bill on time, every time. Payment history is 35% of your score.',
                        'Keep balances below 30% of your available credit.',
                      ],
                    },
                    fair: {
                      label: '580–669 · Fair',
                      tips: [
                        'Request a credit limit increase without a hard inquiry to lower your utilization ratio.',
                        'Dispute any errors on your credit report — even one mistake can cost 20+ points.',
                        'Avoid opening multiple new accounts in the same year.',
                        'Set up autopay to eliminate missed payments permanently.',
                      ],
                    },
                    good: {
                      label: '670–739 · Good',
                      tips: [
                        'Keep utilization below 10% (not 30%) to push into excellent territory.',
                        'Let your oldest accounts stay open — account age matters more as your score improves.',
                        'Diversify credit types: a small installment loan alongside cards can boost your mix.',
                        'Space new credit applications at least 6 months apart.',
                      ],
                    },
                    excellent: {
                      label: '740+ · Excellent',
                      tips: [
                        'Maintain utilization under 5% across all cards to protect your score.',
                        'Monitor for hard inquiries — you qualify for the best rates so protect that status.',
                        'Consider premium rewards cards; approval is likely and rewards compound at your level.',
                        'Annual credit report review catches identity theft before it impacts your score.',
                      ],
                    },
                  };
                  const { label, tips } = tipsByBracket[bracket];
                  return (
                    <div className="mt-8 border-t border-surface-border pt-6">
                      <p className="text-xs font-mono font-bold text-content-tertiary uppercase tracking-widest mb-3">
                        Tips for your score range · {label}
                      </p>
                      <ul className="space-y-2">
                        {tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-content-secondary leading-relaxed">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-content-muted/50" aria-hidden />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </div>
            </section>
          </div>

          {/* Right: Fix Mistakes & To-Do */}
          <div className="space-y-8">
            
            {/* Fix-it List */}
            <section className="bg-surface-raised border border-surface-border rounded-xl flex flex-col h-full shadow-none">
              <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-raised/80">
                <h2 className="text-xs font-mono font-bold text-content-tertiary uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Dispute Hub
                </h2>
                <button 
                  type="button"
                  onClick={() => setIsFixModalOpen(true)}
                  className="focus-app rounded border border-surface-border bg-surface-elevated p-1 px-3 text-xs font-mono font-bold uppercase text-content-primary transition-all hover:bg-surface-raised"
                >
                  New Case
                </button>
              </div>
              
              <div className="flex-1 divide-y divide-surface-border overflow-y-auto max-h-[500px] focus-app">
                {(!credit?.fixes || credit.fixes.length === 0) ? (
                  <div className="p-12 text-center space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full border border-surface-border flex items-center justify-center text-content-muted">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-mono text-content-tertiary uppercase tracking-widest">Clear Record</p>
                      <p className="text-xs text-content-muted mt-1 uppercase tracking-tight max-w-xs mx-auto leading-relaxed">
                      Add a dispute case to track letters and status. Annual review helps catch reporting errors early.
                    </p>
                    </div>
                  </div>
                ) : (
                  credit.fixes.map(fix => (
                    <div key={fix.id} className="p-5 space-y-3 hover:bg-content-primary/5 transition-colors text-left group">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-sans font-bold text-content-primary">{fix.item}</h3>
                          <p className="text-xs font-mono text-content-tertiary uppercase tracking-widest">{fix.bureau}</p>
                        </div>
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
                          fix.status === 'resolved' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' : 
                          fix.status === 'sent' ? 'border-surface-border text-content-primary bg-content-primary/[0.03]' : 
                          'border-content-primary/10 text-content-tertiary'
                        }`}>
                          {fix.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-content-primary font-bold">${fix.amount.toLocaleString()}</span>
                        <div className="h-px bg-surface-border flex-1" />
                      </div>
                      
                      <div className="flex items-center gap-2 pt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button 
                          type="button"
                          onClick={() => {
                            setSelectedFixId(fix.id);
                            setIsLetterModalOpen(true);
                          }}
                          className="focus-app flex flex-1 items-center justify-center gap-2 rounded-md border border-surface-border bg-content-primary/[0.06] py-1.5 text-xs font-mono font-bold uppercase tracking-widest text-content-primary transition-all hover:bg-content-primary/[0.08]"
                        >
                          <FileText className="w-3 h-3" aria-hidden /> Letter
                        </button>
                        <button 
                          type="button"
                          onClick={() => updateCreditFix(fix.id, { status: fix.status === 'resolved' ? 'todo' : 'resolved' })}
                          className="focus-app flex-1 rounded-md border border-content-primary/5 bg-surface-elevated py-1.5 text-xs font-mono font-bold uppercase tracking-widest text-content-secondary transition-all hover:bg-surface-border"
                        >
                          {fix.status === 'resolved' ? 'Undo' : 'Resolve'}
                        </button>
                        <button 
                          type="button"
                          aria-label={`Delete dispute case ${fix.item}`}
                          onClick={() => deleteCreditFix(fix.id)}
                          className="focus-app rounded p-1.5 text-content-muted transition-colors hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 bg-surface-base border-t border-surface-border space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-content-tertiary uppercase tracking-widest">
                  <ShieldAlert className="w-3.5 h-3.5 text-content-secondary" /> Protection Shield
                </div>
                <div className="space-y-2">
                  <a href={EXTERNAL_RESOURCES.credit.annualReport} target="_blank" rel="noreferrer" className="flex items-center justify-between p-2.5 text-xs text-content-tertiary hover:text-content-primary bg-surface-elevated border border-surface-border rounded-xl transition-all group">
                    Full Credit Report <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                  </a>
                  <a href={EXTERNAL_RESOURCES.credit.experian} target="_blank" rel="noreferrer" className="flex items-center justify-between p-2.5 text-xs text-content-tertiary hover:text-content-primary bg-surface-elevated border border-surface-border rounded-xl transition-all group">
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
            <Dialog open={isFixModalOpen} onClose={() => setIsFixModalOpen(false)} className="relative z-[200]">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80"
                aria-hidden="true"
              />
              <div className="fixed inset-0 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="w-full max-w-md"
                >
                  <Dialog.Panel className="bg-surface-elevated border border-surface-border rounded-xl shadow-none p-8">
                    <Dialog.Title className="text-sm font-mono font-bold text-content-primary uppercase tracking-widest mb-6 border-b border-surface-border pb-4">
                      Report Error
                    </Dialog.Title>
                    <form onSubmit={handleAddFix} className="space-y-4">
                      <div>
                        <label className="block text-xs font-mono font-bold text-content-tertiary uppercase tracking-widest mb-1.5">Description</label>
                        <input 
                          autoFocus
                          type="text" 
                          value={fixItem}
                          onChange={e => setFixItem(e.target.value)}
                          placeholder="e.g., Inaccurate Medical Collection"
                          className="w-full bg-surface-base border border-surface-border rounded-md px-3 py-3 text-sm text-content-primary focus-app-field placeholder:text-content-muted"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-mono font-bold text-content-tertiary uppercase tracking-widest mb-1.5">Amount ($)</label>
                          <input 
                            type="number" 
                            value={fixAmount}
                            onChange={e => setFixAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-surface-base border border-surface-border rounded-md px-3 py-3 text-sm text-content-primary focus-app-field"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono font-bold text-content-tertiary uppercase tracking-widest mb-1.5">Bureau</label>
                          <select 
                            value={fixBureau}
                            onChange={e => setFixBureau(e.target.value)}
                            className="w-full bg-surface-base border border-surface-border rounded-md px-3 py-3 text-sm text-content-primary focus-app-field h-[46px]"
                          >
                            <option>Experian</option>
                            <option>Equifax</option>
                            <option>TransUnion</option>
                            <option>All Three</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-mono font-bold text-content-tertiary uppercase tracking-widest mb-1.5">Evidence / Notes</label>
                        <textarea 
                          value={fixNotes}
                          onChange={e => setFixNotes(e.target.value)}
                          placeholder="Explain why this is incorrect..."
                          className="w-full bg-surface-base border border-surface-border rounded-md px-3 py-3 text-sm text-content-primary focus-app-field h-24 resize-none placeholder:text-content-muted"
                        />
                      </div>
                      <div className="flex gap-3 pt-4">
                        <button 
                          type="button"
                          onClick={() => setIsFixModalOpen(false)}
                          className="flex-1 py-3 text-xs font-mono font-bold text-content-tertiary hover:text-content-secondary uppercase tracking-widest transition-colors"
                        >
                          Dismiss
                        </button>
                        <button 
                          type="submit"
                          className="flex-1 py-3 bg-brand-cta text-surface-base hover:bg-brand-cta-hover rounded-md text-xs font-mono font-bold uppercase tracking-widest transition-all shadow-none"
                        >
                          Add Case
                        </button>
                      </div>
                    </form>
                  </Dialog.Panel>
                </motion.div>
              </div>
            </Dialog>
          )}
        </AnimatePresence>

        {/* Generated Letter Modal */}
        <AnimatePresence>
          {isLetterModalOpen && selectedFix && (
            <Dialog
              open={isLetterModalOpen}
              onClose={() => setIsLetterModalOpen(false)}
              className="relative z-[300]"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/90"
                aria-hidden="true"
              />
              <div className="fixed inset-0 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, rotateX: -10 }}
                  animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                  exit={{ opacity: 0, scale: 0.9, rotateX: 10 }}
                  className="w-full max-w-2xl"
                >
                  <Dialog.Panel className="bg-brand-cta text-surface-base rounded-xl shadow-2xl p-10 font-serif border border-surface-base/15">
                <div className="flex justify-between items-start mb-8 border-b border-surface-base/15 pb-4 no-print">
                  <div className="space-y-1">
                    <Dialog.Title className="text-xl font-sans font-black uppercase italic tracking-tighter text-surface-base">
                      Dispute <span className="text-emerald-800">Letter</span>
                    </Dialog.Title>
                    <p className="text-xs font-sans text-content-tertiary uppercase tracking-widest">Formal Legal Correspondence</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(generateLetter(selectedFix));
                        toast.success('Letter copied to clipboard');
                      }}
                      className="p-2 bg-surface-base/10 hover:bg-surface-base/20 rounded-full transition-colors text-surface-base"
                      title="Copy text"
                      type="button"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => window.print()}
                      className="p-2 bg-surface-base/10 hover:bg-surface-base/20 rounded-full transition-colors text-surface-base"
                      title="Print"
                      type="button"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setIsLetterModalOpen(false)}
                      className="p-2 bg-black/5 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-colors"
                      type="button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="whitespace-pre-wrap text-[11pt] leading-relaxed max-h-[60vh] overflow-y-auto pr-4 text-surface-base scrollbar-thin scrollbar-thumb-surface-base/20">
                  {generateLetter(selectedFix)}
                </div>

                <div className="mt-8 pt-8 border-t border-surface-base/10 flex items-center justify-between no-print">
                  <p className="text-xs font-sans text-content-tertiary italic">
                    Certified Mail is recommended for all legal disputes.
                  </p>
                  <button 
                    onClick={() => {
                      updateCreditFix(selectedFix.id, { status: 'sent' });
                      setIsLetterModalOpen(false);
                      toast.success('Status updated to SENT');
                    }}
                    className="px-6 py-2 bg-surface-base text-content-primary font-sans font-bold text-xs uppercase tracking-widest rounded-md hover:bg-brand-cta hover:text-surface-base transition-colors"
                    type="button"
                  >
                    Mark as Sent
                  </button>
                </div>
                  </Dialog.Panel>
                </motion.div>
              </div>
            </Dialog>
          )}
        </AnimatePresence>
      </div>
    </AppPageShell>
  );
}
