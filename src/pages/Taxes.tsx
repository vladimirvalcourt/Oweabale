import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { Calculator, DollarSign, AlertCircle, Info, Clock, Plus, Trash2, ChevronRight } from 'lucide-react';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export default function Taxes() {
  const { incomes, deductions, addDeduction, deleteDeduction } = useStore();
  const [filingStatus, setFilingStatus] = useState<'single' | 'married'>('single');
  const [newDeduction, setNewDeduction] = useState({ name: '', category: '', amount: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  // Quarterly tax deadlines
  const today = new Date();
  const currentYear = today.getFullYear();
  const quarterlyDates = [
    { label: 'Q1', date: new Date(`${currentYear}-04-15`) },
    { label: 'Q2', date: new Date(`${currentYear}-06-15`) },
    { label: 'Q3', date: new Date(`${currentYear}-09-15`) },
    { label: 'Q4', date: new Date(`${currentYear + 1}-01-15`) },
  ].map(q => ({
    ...q,
    daysLeft: Math.ceil((q.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    overdue: q.date < today,
  }));

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);


  // Calculate total annual income
  const annualIncome = useMemo(() => {
    return incomes.reduce((sum, income) => {
      if (income.status !== 'active') return sum;
      let yearlyAmount = income.amount;
      if (income.frequency === 'Weekly') yearlyAmount = income.amount * 52;
      if (income.frequency === 'Bi-weekly') yearlyAmount = income.amount * 26;
      if (income.frequency === 'Monthly') yearlyAmount = income.amount * 12;
      return sum + yearlyAmount;
    }, 0);
  }, [incomes]);

  // Very simplified 2024 US Tax Brackets (for estimation purposes only)
  const calculateTaxes = (income: number, status: 'single' | 'married') => {
    const standardDeduction = status === 'single' ? 14600 : 29200;
    const taxableIncome = Math.max(0, income - standardDeduction);
    
    let tax = 0;
    let brackets = [];

    if (status === 'single') {
      brackets = [
        { limit: 11600, rate: 0.10 },
        { limit: 47150, rate: 0.12 },
        { limit: 100525, rate: 0.22 },
        { limit: 191950, rate: 0.24 },
        { limit: 243725, rate: 0.32 },
        { limit: 609350, rate: 0.35 },
        { limit: Infinity, rate: 0.37 }
      ];
    } else {
      brackets = [
        { limit: 23200, rate: 0.10 },
        { limit: 94300, rate: 0.12 },
        { limit: 201050, rate: 0.22 },
        { limit: 383900, rate: 0.24 },
        { limit: 487450, rate: 0.32 },
        { limit: 731200, rate: 0.35 },
        { limit: Infinity, rate: 0.37 }
      ];
    }

    let remainingIncome = taxableIncome;
    let previousLimit = 0;

    for (const bracket of brackets) {
      const taxableInThisBracket = Math.min(remainingIncome, bracket.limit - previousLimit);
      if (taxableInThisBracket > 0) {
        tax += taxableInThisBracket * bracket.rate;
        remainingIncome -= taxableInThisBracket;
      }
      previousLimit = bracket.limit;
      if (remainingIncome <= 0) break;
    }

    // FICA (Social Security + Medicare) roughly 7.65% for W2, 15.3% for self-employed
    // Assuming a mix or standard W2 for this simple estimator
    const ficaTax = income * 0.0765;

    return {
      taxableIncome,
      federalTax: tax,
      ficaTax,
      totalTax: tax + ficaTax,
      effectiveRate: income > 0 ? ((tax + ficaTax) / income) * 100 : 0
    };
  };

  const taxEstimate = calculateTaxes(annualIncome, filingStatus);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">Tax Estimator</h1>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mt-1">Estimations for your upcoming taxes</p>
        </div>
        <div className="flex bg-surface-raised border border-surface-border rounded-sm p-1">
          <button
            onClick={() => setFilingStatus('single')}
            className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest rounded-sm transition-colors ${
              filingStatus === 'single' ? 'bg-surface-border text-content-primary' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Single
          </button>
          <button
            onClick={() => setFilingStatus('married')}
            className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest rounded-sm transition-colors ${
              filingStatus === 'married' ? 'bg-surface-border text-content-primary' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Married
          </button>
        </div>
      </div>

      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-sm p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-sm text-indigo-200/70">
          <strong>Disclaimer:</strong> This is a highly simplified estimation using standard deductions and federal brackets. It does not account for state taxes, local taxes, specific deductions, credits, or self-employment tax nuances. Always consult a tax professional for accurate advice.
        </p>
      </div>

      <CollapsibleModule 
        title="Tax Estimate" 
        icon={Calculator}
        extraHeader={<span className="text-xs font-mono text-red-500 font-bold">${taxEstimate.totalTax.toLocaleString(undefined, { maximumFractionDigits: 0 })} TAX</span>}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 -mx-6 -my-6 p-6">
          {/* Main Estimate Card */}
          <div className="lg:col-span-2 bg-surface-elevated rounded-sm border border-surface-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-sm flex items-center justify-center border border-indigo-500/30">
                <Calculator className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-content-primary">Estimated Annual Taxes</h2>
                <p className="text-sm text-zinc-500">Federal + FICA</p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-8 border-b border-surface-border mb-6">
              <p className="text-5xl font-bold tabular-nums text-red-400 mb-2">
                ${taxEstimate.totalTax.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-zinc-400">
                Effective Tax Rate: <span className="font-medium text-content-primary">{taxEstimate.effectiveRate.toFixed(1)}%</span>
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Gross Annual Income</span>
                <span className="font-medium text-content-primary">${annualIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400">
                <span>Standard Deduction</span>
                <span>-${(filingStatus === 'single' ? 14600 : 29200).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-surface-border">
                <span className="text-zinc-400">Taxable Income</span>
                <span className="font-medium text-content-primary">${taxEstimate.taxableIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>

          {/* Breakdown Card */}
          <div className="bg-surface-elevated rounded-sm border border-surface-border p-6">
            <h3 className="text-base font-semibold text-content-primary mb-6">Tax Breakdown</h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm text-zinc-400">Federal Income Tax</span>
                  <span className="font-medium text-content-primary">${taxEstimate.federalTax.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="w-full bg-surface-base rounded-sm h-2">
                  <div className="bg-indigo-500 h-2 rounded-sm" style={{ width: `${(taxEstimate.federalTax / taxEstimate.totalTax) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm text-zinc-400">FICA (SS & Medicare)</span>
                  <span className="font-medium text-content-primary">${taxEstimate.ficaTax.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="w-full bg-surface-base rounded-sm h-2">
                  <div className="bg-cyan-500 h-2 rounded-sm" style={{ width: `${(taxEstimate.ficaTax / taxEstimate.totalTax) * 100}%` }}></div>
                </div>
              </div>

              <div className="pt-6 border-t border-surface-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-zinc-300">Estimated Take-Home</span>
                </div>
                <p className="text-3xl font-bold tabular-nums text-emerald-400">
                  ${(annualIncome - taxEstimate.totalTax).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  ~${((annualIncome - taxEstimate.totalTax) / 12).toLocaleString('en-US', { maximumFractionDigits: 0 })} / month
                </p>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleModule>

      {/* Quarterly Payment Countdowns */}
      <CollapsibleModule title="Compliance Deadlines" icon={Clock}>
        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 -mx-6 -my-6 p-6"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {quarterlyDates.map(q => (
            <motion.div 
              key={q.label} 
              className={`p-4 rounded-sm border ${q.overdue ? 'border-zinc-700 bg-surface-raised' : q.daysLeft <= 14 ? 'border-amber-500/40 bg-amber-500/5' : 'border-surface-border bg-surface-raised'}`}
              variants={{
                hidden: { opacity: 0, scale: 0.9 },
                visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 20 } }
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">{q.label}</span>
                {q.overdue ? (
                  <span className="text-[9px] font-mono text-zinc-600 border border-zinc-700 px-1 rounded-sm">DONE</span>
                ) : q.daysLeft <= 14 ? (
                  <span className="text-[9px] font-mono text-amber-400 border border-amber-500/30 px-1 rounded-sm">SOON</span>
                ) : null}
              </div>
              <p className={`text-xl font-mono font-bold ${q.overdue ? 'text-zinc-600' : q.daysLeft <= 14 ? 'text-amber-400' : 'text-content-primary'}`}>
                {q.overdue ? '—' : `${q.daysLeft}d`}
              </p>
              <p className="text-[10px] font-mono text-zinc-600 mt-0.5">
                {q.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </CollapsibleModule>

      <CollapsibleModule 
        title="Tax Deductions" 
        icon={Plus}
        extraHeader={<span className="text-[10px] font-mono text-emerald-400 font-bold">-${totalDeductions.toLocaleString()} DETECTED</span>}
      >
        <div className="-mx-6 -my-6">
          <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-elevated">
            <div>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Logged Deductions</p>
            </div>
            <button
              onClick={() => setShowAddForm(s => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Deduction
            </button>
          </div>

          {showAddForm && (
            <div className="px-6 py-4 bg-surface-elevated border-b border-surface-border">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-32">
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Name</label>
                  <input
                    type="text"
                    value={newDeduction.name}
                    onChange={e => setNewDeduction(d => ({ ...d, name: e.target.value }))}
                    className="w-full bg-surface-base border border-surface-border text-zinc-200 text-sm rounded-sm px-3 py-1.5 font-mono focus:outline-none focus:border-indigo-500"
                    placeholder="Home Office"
                  />
                </div>
                <div className="flex-1 min-w-32">
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Category</label>
                  <input
                    type="text"
                    value={newDeduction.category}
                    onChange={e => setNewDeduction(d => ({ ...d, category: e.target.value }))}
                    className="w-full bg-surface-base border border-surface-border text-zinc-200 text-sm rounded-sm px-3 py-1.5 font-mono focus:outline-none focus:border-indigo-500"
                    placeholder="Business"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Amount ($)</label>
                  <input
                    type="number"
                    value={newDeduction.amount}
                    onChange={e => setNewDeduction(d => ({ ...d, amount: e.target.value }))}
                    className="w-full bg-surface-base border border-surface-border text-zinc-200 text-sm rounded-sm px-3 py-1.5 font-mono focus:outline-none focus:border-indigo-500"
                    placeholder="1200"
                  />
                </div>
                <button
                  onClick={() => {
                    if (!newDeduction.name || !newDeduction.amount) { toast.error('Name and amount required'); return; }
                    addDeduction({ name: newDeduction.name, category: newDeduction.category || 'General', amount: parseFloat(newDeduction.amount), date: new Date().toISOString().split('T')[0] });
                    setNewDeduction({ name: '', category: '', amount: '' });
                    setShowAddForm(false);
                    toast.success('Deduction added');
                  }}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold rounded-sm transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          <motion.div 
            className="divide-y divide-surface-border bg-surface-raised"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          >
            {deductions.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm font-mono text-zinc-500">No deductions tracked yet. Add your first.</div>
            ) : (
              deductions.map(d => (
                <motion.div 
                  key={d.id} 
                  className="px-6 py-3 flex items-center justify-between hover:bg-surface-elevated transition-colors group"
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    visible: { opacity: 1, x: 0, transition: { type: 'spring', damping: 25 } }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-zinc-600 border border-surface-border px-1.5 py-0.5 rounded-sm">{d.category}</span>
                    <span className="text-sm text-zinc-300">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-emerald-400">-${d.amount.toLocaleString()}</span>
                    <button
                      onClick={() => { deleteDeduction(d.id); toast.success('Deduction removed'); }}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
          {deductions.length > 0 && (
            <div className="px-6 py-3 border-t border-surface-border bg-surface-elevated flex justify-between">
              <span className="text-xs font-mono text-zinc-500">Total Trackable Deductions</span>
              <span className="text-xs font-mono text-emerald-400 font-bold">${totalDeductions.toLocaleString()}</span>
            </div>
          )}
        </div>
      </CollapsibleModule>
    </div>
  );
}

