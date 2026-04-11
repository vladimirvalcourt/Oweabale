import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { Calculator, Hash, AlertCircle, Info, Clock, Plus, Trash2, ChevronRight, Map, ShieldAlert, Zap, ExternalLink } from 'lucide-react';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { toast } from 'sonner';
import { motion } from 'motion/react';

// Common State Tax Rates for Gig Workers (Estimates)
const STATE_TAX_MAP: Record<string, { name: string, rate: number }> = {
  'NY': { name: 'New York', rate: 6.25 },
  'CA': { name: 'California', rate: 9.3 },
  'TX': { name: 'Texas', rate: 0 },
  'FL': { name: 'Florida', rate: 0 },
  'WA': { name: 'Washington', rate: 0 },
  'IL': { name: 'Illinois', rate: 4.95 },
  'GA': { name: 'Georgia', rate: 5.75 },
  'NJ': { name: 'New Jersey', rate: 6.37 },
  'MA': { name: 'Massachusetts', rate: 5.0 },
};

export default function Taxes() {
  const { incomes, deductions, addDeduction, deleteDeduction, user, setTaxSettings } = useStore();
  const [filingStatus, setFilingStatus] = useState<'single' | 'married'>('single');
  const [newDeduction, setNewDeduction] = useState({ name: '', category: '', amount: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  const taxState = user.taxState || 'NY';
  const stateRate = user.taxRate ?? 6.25;

  // Quarterly deadlines HUD
  const today = new Date();
  const currentYear = today.getFullYear();
  const quarterlyDates = [
    { label: 'Q1', date: new Date(`${currentYear}-04-15`), portal: 'https://www.irs.gov/payments/direct-pay' },
    { label: 'Q2', date: new Date(`${currentYear}-06-15`), portal: 'https://www.irs.gov/payments/direct-pay' },
    { label: 'Q3', date: new Date(`${currentYear}-09-15`), portal: 'https://www.irs.gov/payments/direct-pay' },
    { label: 'Q4', date: new Date(`${currentYear + 1}-01-15`), portal: 'https://www.irs.gov/payments/direct-pay' },
  ].map(q => ({
    ...q,
    daysLeft: Math.ceil((q.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    overdue: q.date < today,
  }));

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);

  // Split income into Withheld (Salaried) vs Gross (Freelance)
  const incomeStats = useMemo(() => {
    let grossGig = 0;
    let salariedWithheld = 0;
    
    incomes.forEach(inc => {
      if (inc.status !== 'active') return;
      const annual = inc.amount * (inc.frequency === 'Weekly' ? 52 : inc.frequency === 'Bi-weekly' ? 26.08 : inc.frequency === 'Monthly' ? 12 : 1);
      if (inc.isTaxWithheld) salariedWithheld += annual;
      else grossGig += annual;
    });

    return { grossGig, salariedWithheld, total: grossGig + salariedWithheld };
  }, [incomes]);

  // Self-Employment Tax Calculation (15.3% on 92.35% of earnings)
  const calculateFederal = (income: number, status: 'single' | 'married') => {
    const standardDeduction = status === 'single' ? 14600 : 29200;
    const taxableBase = Math.max(0, income - standardDeduction - totalDeductions);
    
    let tax = 0;
    const brackets = status === 'single' ? [
      { limit: 11600, rate: 0.10 },
      { limit: 47150, rate: 0.12 },
      { limit: 100525, rate: 0.22 },
      { limit: 191950, rate: 0.24 },
      { limit: 243725, rate: 0.32 },
      { limit: 609350, rate: 0.35 },
      { limit: Infinity, rate: 0.37 }
    ] : [
      { limit: 23200, rate: 0.10 },
      { limit: 94300, rate: 0.12 },
      { limit: 201050, rate: 0.22 },
      { limit: 383900, rate: 0.24 },
      { limit: 487450, rate: 0.32 },
      { limit: 731200, rate: 0.35 },
      { limit: Infinity, rate: 0.37 }
    ];

    let remaining = taxableBase;
    let prevLimit = 0;
    for (const b of brackets) {
      const chunk = Math.min(remaining, b.limit - prevLimit);
      if (chunk > 0) { tax += chunk * b.rate; remaining -= chunk; }
      prevLimit = b.limit;
      if (remaining <= 0) break;
    }
    return tax;
  };

  const seTax = (incomeStats.grossGig * 0.9235) * 0.153;
  const fedTax = calculateFederal(incomeStats.total, filingStatus);
  const stateTax = incomeStats.total * (stateRate / 100);
  const totalLiability = fedTax + seTax + stateTax;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-brand-violet" /> Freelance Tax Guide
          </h1>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mt-1">Automated Tax Savings</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <select 
            value={taxState} 
            onChange={(e) => setTaxSettings(e.target.value, STATE_TAX_MAP[e.target.value].rate)}
            className="bg-surface-raised border border-surface-border text-[10px] font-mono text-content-primary px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-indigo rounded-sm"
          >
            {Object.keys(STATE_TAX_MAP).map(k => (
              <option key={k} value={k}>{STATE_TAX_MAP[k].name.toUpperCase()} ({STATE_TAX_MAP[k].rate}%)</option>
            ))}
          </select>
          <div className="flex bg-surface-raised border border-surface-border rounded-sm p-1">
            <button
              onClick={() => setFilingStatus('single')}
              className={`px-3 py-1 text-[10px] font-mono uppercase rounded-sm transition-colors ${filingStatus === 'single' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >Single</button>
            <button
              onClick={() => setFilingStatus('married')}
              className={`px-3 py-1 text-[10px] font-mono uppercase rounded-sm transition-colors ${filingStatus === 'married' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >Married</button>
          </div>
        </div>
      </div>

      {/* Gig Worker Education Banner */}
      <div className="bg-amber-500/10 border border-amber-500/40 rounded-sm p-4 flex items-start gap-3 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
        <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest mb-1">Freelancer Tip: The Savings Rule</p>
          <p className="text-sm text-zinc-300 leading-relaxed font-sans">
            As a freelancer in <strong>{STATE_TAX_MAP[taxState].name}</strong>, you pay both sides of Social Security & Medicare. This is an extra <strong>15.3%</strong> cost that regular employees don't see. Oweable has factored this into your current <strong>${(stateRate + 15.3 + (incomeStats.total > 0 ? fedTax/incomeStats.total*100 : 0)).toFixed(1)}%</strong> estimated savings rate.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CollapsibleModule title="Yearly Tax Estimates" icon={Calculator}>
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Estimated Total Liability</p>
              <h2 className="text-6xl font-bold font-mono text-white tabular-nums tracking-tighter">
                ${totalLiability.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </h2>
              <div className="mt-6 flex items-center gap-4">
                <div className="flex flex-col items-center px-6 border-r border-surface-border">
                  <span className="text-[10px] font-mono text-zinc-600 uppercase">Effective Rate</span>
                  <span className="text-lg font-mono text-content-primary">{(totalLiability / (incomeStats.total || 1) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex flex-col items-center px-6">
                  <span className="text-[10px] font-mono text-zinc-600 uppercase">Monthly Savings Target</span>
                  <span className="text-lg font-mono text-brand-indigo">${(totalLiability / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-surface-border border-t border-surface-border">
              <div className="bg-surface-elevated p-4">
                <p className="text-[9px] font-mono text-zinc-500 uppercase mb-1">Self-Employment (FICA)</p>
                <p className="text-sm font-mono text-content-primary font-bold">${seTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="bg-surface-elevated p-4">
                <p className="text-[9px] font-mono text-zinc-500 uppercase mb-1">Federal Income Tax</p>
                <p className="text-sm font-mono text-content-primary font-bold">${fedTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="bg-surface-elevated p-4">
                <p className="text-[9px] font-mono text-zinc-500 uppercase mb-1">State Tax ({taxState})</p>
                <p className="text-sm font-mono text-content-primary font-bold">${stateTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </CollapsibleModule>

          <CollapsibleModule title="Tax Write-offs Tracker" icon={Plus}>
            <div className="p-0">
               <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-elevated/50">
                  <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest font-bold">Write-offs detected in Ledger</p>
                  <button onClick={() => setShowAddForm(!showAddForm)} className="bg-brand-cta hover:bg-brand-cta-hover text-white text-[10px] font-mono px-3 py-1.5 rounded-sm uppercase font-bold transition-all">Add Manual Deduction</button>
               </div>
               {showAddForm && (
                 <div className="p-6 bg-surface-elevated border-b border-surface-border flex gap-3 items-end">
                    <div className="flex-1">
                      <p className="text-[9px] font-mono text-zinc-500 uppercase mb-1">Expense Label</p>
                      <input type="text" placeholder="e.g. Adobe Suite" value={newDeduction.name} onChange={e => setNewDeduction({...newDeduction, name: e.target.value})} className="w-full bg-surface-base border border-surface-border rounded-sm h-10 px-3 text-sm font-mono text-white outline-none focus:border-brand-indigo transition-colors" />
                    </div>
                    <div className="w-24">
                      <p className="text-[9px] font-mono text-zinc-500 uppercase mb-1">Amount</p>
                      <input type="number" placeholder="0.00" value={newDeduction.amount} onChange={e => setNewDeduction({...newDeduction, amount: e.target.value})} className="w-full bg-surface-base border border-surface-border rounded-sm h-10 px-3 text-sm font-mono text-white outline-none focus:border-brand-indigo transition-colors" />
                    </div>
                    <button onClick={async () => {
                      if (!newDeduction.name.trim()) { toast.error('Enter an expense label'); return; }
                      const amt = parseFloat(newDeduction.amount);
                      if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return; }
                      const ok = await addDeduction({ ...newDeduction, amount: amt, category: 'Business', date: new Date().toISOString() });
                      if (!ok) return;
                      toast.success('Deduction added');
                      setNewDeduction({name: '', amount: '', category: ''}); setShowAddForm(false);
                    }} className="bg-emerald-500 text-black h-10 px-4 text-xs font-mono font-bold uppercase rounded-sm hover:bg-emerald-400 transition-colors">Add</button>
                 </div>
               )}
               <div className="divide-y divide-surface-border">
                  {deductions.map(d => (
                    <div key={d.id} className="px-6 py-4 flex justify-between items-center hover:bg-surface-elevated transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-emerald-500" />
                        <span className="text-sm font-medium text-content-primary font-sans">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-mono text-emerald-400">-${d.amount.toFixed(2)}</span>
                        <button onClick={async () => { await deleteDeduction(d.id); }} className="text-zinc-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </CollapsibleModule>
        </div>

        <div className="space-y-6">
          <CollapsibleModule title="Quarterly Tax Deadlines" icon={Clock}>
            <div className="space-y-4">
              {quarterlyDates.map(q => (
                <div key={q.label} className={`p-4 rounded-sm border ${q.overdue ? 'bg-surface-raised border-surface-border opacity-50' : q.daysLeft < 15 ? 'bg-rose-500/5 border-rose-500/30 shadow-[inset_0_0_15px_rgba(244,63,94,0.05)]' : 'bg-surface-elevated border-surface-border'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-mono font-bold text-zinc-400 uppercase">{q.label} Est. Payment</span>
                    {q.overdue ? <span className="bg-zinc-800 text-zinc-500 text-[9px] px-2 py-0.5 rounded-sm">COMPLETED</span> : <span className="text-emerald-400 text-[10px] font-mono font-bold">{q.daysLeft}d REMAINING</span>}
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase">Deadline: {q.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    {!q.overdue && (
                      <a href={q.portal} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-brand-indigo hover:text-brand-violet text-[10px] font-mono font-bold transition-colors uppercase">
                        DIRECT PAY <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleModule>

          <div className="bg-surface-raised border border-surface-border p-6 rounded-sm space-y-6">
             <div>
               <h3 className="text-xs font-mono font-black text-brand-indigo uppercase tracking-[0.2em] mb-4">Smart Freelance Tips</h3>
               <div className="space-y-4">
                 <div className="flex gap-3">
                   <div className="w-1.5 h-1.5 bg-brand-violet mt-1.5 shrink-0" />
                   <div>
                     <p className="text-[10px] font-mono font-bold text-content-primary uppercase tracking-widest">Check Your Real Pay</p>
                     <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-tight mt-1 leading-normal">
                       Don't spend all your income — set aside at least 30% for taxes.
                     </p>
                   </div>
                 </div>
                 <div className="flex gap-3">
                   <div className="w-1.5 h-1.5 bg-brand-violet mt-1.5 shrink-0" />
                   <div>
                     <p className="text-[10px] font-mono font-bold text-content-primary uppercase tracking-widest">Audit for Deductions</p>
                     <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-tight mt-1 leading-normal">
                       Every software subscription, home office expense, and professional meal can reduce your taxable income.
                     </p>
                   </div>
                 </div>
                 <div className="flex gap-3">
                   <div className="w-1.5 h-1.5 bg-brand-violet mt-1.5 shrink-0" />
                   <div>
                     <p className="text-[10px] font-mono font-bold text-content-primary uppercase tracking-widest">Quarterly Discipline</p>
                     <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-tight mt-1 leading-normal">
                       Pay quarterly to avoid a large tax bill at year end.
                     </p>
                   </div>
                 </div>
               </div>
             </div>
             
             <div className="pt-4 border-t border-surface-border">
               <h3 className="text-[10px] font-mono font-black text-rose-500 uppercase tracking-[0.2em] mb-3">Important Reminder</h3>
               <p className="text-[9px] font-mono text-zinc-500 leading-relaxed uppercase tracking-tight">
                 This is an estimate based on current tax rates. Consult a tax professional for your final return.
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
