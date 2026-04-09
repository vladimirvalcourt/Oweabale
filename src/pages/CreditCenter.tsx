import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, AlertCircle, TrendingUp, HelpCircle, 
  ChevronRight, ArrowUpRight, CheckCircle2, XCircle, 
  Mail, ExternalLink, Calendar, Calculator, Plus, Trash2, Edit3, Send
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';

export default function CreditCenter() {
  const { credit, updateCreditScore, addCreditFix, updateCreditFix, deleteCreditFix, debts } = useStore();
  const [isFixModalOpen, setIsFixModalOpen] = useState(false);
  
  // Quick Fix Form State
  const [fixItem, setFixItem] = useState('');
  const [fixAmount, setFixAmount] = useState('');
  const [fixBureau, setFixBureau] = useState('Experian');
  const [fixNotes, setFixNotes] = useState('');

  // 1. Calculate a simple "Quick Boost" Tip
  const highBalanceCard = useMemo(() => {
    return debts
      .filter(d => d.type === 'Card' || d.type === 'Store Card')
      .sort((a, b) => b.remaining - a.remaining)[0];
  }, [debts]);

  const boostTip = useMemo(() => {
    if (!highBalanceCard) return null;
    const targetAmount = highBalanceCard.remaining * 0.1; // 10% target
    return {
      cardName: highBalanceCard.name,
      amountToPay: highBalanceCard.remaining - targetAmount,
      pointPotential: 15 + Math.floor(Math.random() * 20) // Random estimate for demo
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
      default: return 'text-zinc-500';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'low': return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header & Score Gauge */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="flex-1 space-y-2">
          <h1 className="text-3xl font-sans font-bold tracking-tight text-white uppercase italic">Credit Workshop</h1>
          <p className="text-zinc-500 font-sans max-w-xl">
            Track your score, fix mistakes on your report, and learn exactly what payments will boost your status the fastest. Simple tools for your financial reputation.
          </p>
        </div>

        {/* Tactile Score Display */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface-raised border border-surface-border p-8 rounded-sm shrink-0 w-full md:w-64 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2">Estimated Score</p>
          <p className="text-6xl font-mono font-bold text-white tracking-tighter mb-2">{credit.score}</p>
          <div className="flex items-center justify-center gap-2 text-[11px] font-mono uppercase tracking-widest text-emerald-500">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+12 pts this month</span>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Factors & Boost Tips */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Factors */}
          <section className="bg-surface-raised border border-surface-border rounded-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">How your score is calculated</h2>
              <button className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1">
                Learn more <HelpCircle className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-surface-border">
              {credit.factors.map(factor => (
                <div key={factor.id} className="p-6 flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-sans font-bold text-white">{factor.name}</span>
                      <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-mono font-bold uppercase border ${getImpactColor(factor.impact)}`}>
                        {factor.impact} Impact
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">{factor.description}</p>
                  </div>
                  <div className={`text-sm font-mono font-bold uppercase tracking-wider ${getStatusColor(factor.status)}`}>
                    {factor.status}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Boost Section */}
          <section className="bg-indigo-600/5 border border-indigo-500/20 rounded-sm p-8 relative overflow-hidden">
            <div className="absolute top-4 right-4 text-indigo-500/20">
              <Calculator className="w-16 h-16" />
            </div>
            <div className="relative z-10">
              <h2 className="text-sm font-mono font-bold text-indigo-400 uppercase tracking-widest mb-2">Recommended: The 10% Boost</h2>
              {boostTip ? (
                <>
                  <p className="text-2xl font-sans font-bold text-white mb-4 italic">
                    Pay <span className="text-indigo-400">${boostTip.amountToPay.toFixed(0)}</span> on your <span className="text-white">{boostTip.cardName}</span> 
                  </p>
                  <p className="text-sm text-zinc-400 mb-6 max-w-lg leading-relaxed">
                    By lowering your balance on this specific card to 10% of its limit, you'll see the biggest jump in your score for the least effort.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-black/30 border border-indigo-500/10 px-4 py-2 rounded-sm text-xs font-mono">
                      <span className="text-zinc-500 uppercase tracking-widest mr-2">Est. Increase</span>
                      <span className="text-indigo-400 font-bold">~{boostTip.pointPotential} Points</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-zinc-500 text-sm">Add your credit cards to see personalized boost tips.</p>
              )}
            </div>
          </section>
        </div>

        {/* Right: Fix Mistakes & To-Do */}
        <div className="space-y-8">
          
          {/* Fix-it List */}
          <section className="bg-surface-raised border border-surface-border rounded-sm flex flex-col h-full">
            <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Cleanup List
              </h2>
              <button 
                onClick={() => setIsFixModalOpen(true)}
                className="p-1 px-3 bg-white/5 border border-white/10 rounded-sm hover:bg-white/10 text-[10px] font-mono font-bold uppercase text-white transition-all"
              >
                Find Error
              </button>
            </div>
            
            <div className="flex-1 divide-y divide-surface-border">
              {credit.fixes.length === 0 ? (
                <div className="p-8 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-700">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">No errors found yet</p>
                    <p className="text-[10px] text-zinc-600 mt-1">If you see something wrong on your report, add it here to start fixing it.</p>
                  </div>
                </div>
              ) : (
                credit.fixes.map(fix => (
                  <div key={fix.id} className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-sans font-bold text-white">{fix.item}</h3>
                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{fix.bureau}</p>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border ${
                        fix.status === 'resolved' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' : 
                        fix.status === 'sent' ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5' : 
                        'border-white/10 text-zinc-500'
                      }`}>
                        {fix.status.toUpperCase()}
                      </span>
                    </div>
                    {fix.notes && <p className="text-[11px] text-zinc-400 italic">"{fix.notes}"</p>}
                    <div className="flex items-center gap-2 pt-1">
                      <button 
                        onClick={() => updateCreditFix(fix.id, { status: fix.status === 'todo' ? 'sent' : 'resolved' })}
                        className="flex-1 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-all"
                      >
                        {fix.status === 'todo' ? 'Send Letter' : 'Mark Resolved'}
                      </button>
                      <button 
                        onClick={() => deleteCreditFix(fix.id)}
                        className="p-1.5 text-zinc-600 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-surface-base border-t border-surface-border">
              <h3 className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-3">Useful Links</h3>
              <div className="space-y-2">
                <a href="https://www.annualcreditreport.com" target="_blank" rel="noreferrer" className="flex items-center justify-between p-2 text-[11px] text-zinc-400 hover:text-white bg-white/5 border border-white/5 rounded-sm transition-colors group">
                  Free Credit Report <ExternalLink className="w-3 h-3 group-hover:scale-110 transition-transform" />
                </a>
                <a href="https://www.experian.com" target="_blank" rel="noreferrer" className="flex items-center justify-between p-2 text-[11px] text-zinc-400 hover:text-white bg-white/5 border border-white/5 rounded-sm transition-colors group">
                  Experian Disputes <ExternalLink className="w-3 h-3 group-hover:scale-110 transition-transform" />
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Add Fix Modal */}
      <AnimatePresence>
        {isFixModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsFixModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-surface-elevated border border-surface-border rounded shadow-2xl p-6"
            >
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-widest mb-6">What needs fixing?</h2>
              <form onSubmit={handleAddFix} className="space-y-4">
                <div>
                  <label className="block text-xs font-sans text-zinc-500 mb-1.5">What's wrong? (Describe based on your report)</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={fixItem}
                    onChange={e => setFixItem(e.target.value)}
                    placeholder="e.g., Medical collection that I already paid"
                    className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-sans text-zinc-500 mb-1.5">Amount ($)</label>
                    <input 
                      type="number" 
                      value={fixAmount}
                      onChange={e => setFixAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-sans text-zinc-500 mb-1.5">Which Bureau?</label>
                    <select 
                      value={fixBureau}
                      onChange={e => setFixBureau(e.target.value)}
                      className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                    >
                      <option>Experian</option>
                      <option>Equifax</option>
                      <option>TransUnion</option>
                      <option>All Three</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-sans text-zinc-500 mb-1.5">Your Notes (Optional)</label>
                  <textarea 
                    value={fixNotes}
                    onChange={e => setFixNotes(e.target.value)}
                    className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none h-20 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsFixModalOpen(false)}
                    className="flex-1 py-2 text-xs font-mono font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-xs font-mono font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/10"
                  >
                    Add to Fix-it List
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
