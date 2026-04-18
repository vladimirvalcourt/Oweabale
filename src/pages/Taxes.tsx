import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { Calculator, Hash, AlertCircle, Info, Clock, Plus, Trash2, ChevronRight, Map, ShieldAlert, Zap, ExternalLink } from 'lucide-react';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { toast } from 'sonner';

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
            <ShieldAlert className="w-7 h-7 text-content-secondary" /> Freelance Tax Guide
          </h1>
          <p className="text-sm text-content-tertiary mt-1">Estimates and quarterly reminders based on your ledger.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <select 
            value={taxState} 
            onChange={(e) => setTaxSettings(e.target.value, STATE_TAX_MAP[e.target.value].rate)}
            className="bg-surface-raised border border-surface-border text-sm font-sans text-content-primary px-3 py-1.5 focus-app-field rounded-lg"
          >
            {Object.keys(STATE_TAX_MAP).map(k => (
              <option key={k} value={k}>{STATE_TAX_MAP[k].name} ({STATE_TAX_MAP[k].rate}%)</option>
            ))}
          </select>
          <div className="flex bg-surface-raised border border-surface-border rounded-lg p-1">
            <button
              onClick={() => setFilingStatus('single')}
              className={`px-3 py-1 text-xs font-sans font-medium rounded-lg transition-colors ${filingStatus === 'single' ? 'bg-white text-black' : 'text-content-tertiary hover:text-content-secondary'}`}
            >Single</button>
            <button
              onClick={() => setFilingStatus('married')}
              className={`px-3 py-1 text-xs font-sans font-medium rounded-lg transition-colors ${filingStatus === 'married' ? 'bg-white text-black' : 'text-content-tertiary hover:text-content-secondary'}`}
            >Married</button>
          </div>
        </div>
      </div>

      {/* Gig Worker Education Banner */}
      <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-4 flex items-start gap-3 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
        <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-sans font-semibold text-amber-400 mb-1">Freelancer tip: the savings rule</p>
          <p className="text-sm text-content-secondary leading-relaxed font-sans">
            As a freelancer in <strong>{STATE_TAX_MAP[taxState].name}</strong>, you pay both sides of Social Security & Medicare. This is an extra <strong>15.3%</strong> cost that regular employees don't see. Oweable has factored this into your current <strong>${(stateRate + 15.3 + (incomeStats.total > 0 ? fedTax/incomeStats.total*100 : 0)).toFixed(1)}%</strong> estimated savings rate.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CollapsibleModule title="Yearly Tax Estimates" icon={Calculator}>
            <div className="flex flex-col items-center justify-center py-10">
              <p className="metric-label normal-case text-content-tertiary mb-2">Estimated total liability</p>
              <h2 className="text-6xl font-bold font-mono text-white tabular-nums tracking-tighter data-numeric">
                ${totalLiability.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </h2>
              <div className="mt-6 flex items-center gap-4">
                <div className="flex flex-col items-center px-6 border-r border-surface-border">
                  <span className="text-xs text-content-tertiary">Effective rate</span>
                  <span className="text-lg font-mono tabular-nums text-content-primary data-numeric">{(totalLiability / (incomeStats.total || 1) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex flex-col items-center px-6">
                  <span className="text-xs text-content-tertiary">Monthly set-aside</span>
                  <span className="text-lg font-mono tabular-nums text-content-primary data-numeric">${(totalLiability / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-surface-border border-t border-surface-border">
              <div className="bg-surface-elevated p-4">
                <p className="metric-label normal-case text-content-tertiary mb-1">Self-employment (FICA)</p>
                <p className="text-sm font-mono tabular-nums text-content-primary font-bold data-numeric">${seTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="bg-surface-elevated p-4">
                <p className="metric-label normal-case text-content-tertiary mb-1">Federal income tax</p>
                <p className="text-sm font-mono tabular-nums text-content-primary font-bold data-numeric">${fedTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="bg-surface-elevated p-4">
                <p className="metric-label normal-case text-content-tertiary mb-1">State tax ({taxState})</p>
                <p className="text-sm font-mono tabular-nums text-content-primary font-bold data-numeric">${stateTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </CollapsibleModule>

          <CollapsibleModule title="Tax Write-offs Tracker" icon={Plus}>
            <div className="p-0">
               <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-elevated/50">
                  <p className="text-sm font-sans font-medium text-content-secondary">Write-offs from your ledger</p>
                  <button type="button" onClick={() => setShowAddForm(!showAddForm)} className="bg-white hover:bg-neutral-200 text-black text-xs font-sans font-semibold px-3 py-1.5 rounded-lg transition-all">Add deduction</button>
               </div>
               {showAddForm && (
                 <div className="p-6 bg-surface-elevated border-b border-surface-border flex gap-3 items-end">
                    <div className="flex-1">
                      <p className="text-xs text-content-tertiary mb-1">Expense label</p>
                      <input type="text" placeholder="e.g. Adobe Suite" value={newDeduction.name} onChange={e => setNewDeduction({...newDeduction, name: e.target.value})} className="w-full bg-surface-base border border-surface-border rounded-lg h-10 px-3 text-sm text-white focus-app-field transition-colors" />
                    </div>
                    <div className="w-24">
                      <p className="text-xs text-content-tertiary mb-1">Amount</p>
                      <input type="number" placeholder="0.00" value={newDeduction.amount} onChange={e => setNewDeduction({...newDeduction, amount: e.target.value})} className="w-full bg-surface-base border border-surface-border rounded-lg h-10 px-3 text-sm font-mono tabular-nums text-white focus-app-field transition-colors" />
                    </div>
                    <button type="button" onClick={async () => {
                      if (!newDeduction.name.trim()) { toast.error('Enter an expense label'); return; }
                      const amt = parseFloat(newDeduction.amount);
                      if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return; }
                      const ok = await addDeduction({ ...newDeduction, amount: amt, category: 'Business', date: new Date().toISOString() });
                      if (!ok) return;
                      toast.success('Deduction added');
                      setNewDeduction({name: '', amount: '', category: ''}); setShowAddForm(false);
                    }} className="bg-emerald-500 text-black h-10 px-4 text-sm font-sans font-semibold rounded-lg hover:bg-emerald-400 transition-colors">Add</button>
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
                        <span className="text-sm font-mono tabular-nums text-emerald-400 data-numeric">-${d.amount.toFixed(2)}</span>
                        <button onClick={async () => { await deleteDeduction(d.id); }} className="text-content-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4"/></button>
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
                <div key={q.label} className={`p-4 rounded-lg border ${q.overdue ? 'bg-surface-raised border-surface-border opacity-50' : q.daysLeft < 15 ? 'bg-rose-500/5 border-rose-500/30 shadow-[inset_0_0_15px_rgba(244,63,94,0.05)]' : 'bg-surface-elevated border-surface-border'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-sans font-semibold text-content-tertiary">{q.label} estimated payment</span>
                    {q.overdue ? <span className="bg-surface-elevated text-content-tertiary text-xs px-2 py-0.5 rounded-lg">Completed</span> : <span className="text-emerald-400 text-xs font-sans font-medium">{q.daysLeft}d left</span>}
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-content-tertiary">Due {q.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    {!q.overdue && (
                      <a href={q.portal} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-content-secondary hover:text-content-primary text-xs font-sans font-semibold transition-colors">
                        IRS Direct Pay <ExternalLink className="w-3 h-3 shrink-0" aria-hidden />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleModule>

          <div className="bg-surface-raised border border-surface-border p-6 rounded-lg space-y-6">
             <div>
               <h3 className="text-sm font-sans font-semibold text-content-primary mb-4">Smart freelance tips</h3>
               <div className="space-y-4">
                 <div className="flex gap-3">
                   <div className="w-1.5 h-1.5 bg-white/50 mt-1.5 shrink-0 rounded-full" />
                   <div>
                     <p className="text-sm font-sans font-medium text-content-primary">Check your real pay</p>
                     <p className="text-xs text-content-tertiary mt-1 leading-normal">
                       Don't spend all your income — set aside at least 30% for taxes.
                     </p>
                   </div>
                 </div>
                 <div className="flex gap-3">
                   <div className="w-1.5 h-1.5 bg-white/50 mt-1.5 shrink-0 rounded-full" />
                   <div>
                     <p className="text-sm font-sans font-medium text-content-primary">Audit for deductions</p>
                     <p className="text-xs text-content-tertiary mt-1 leading-normal">
                       Every software subscription, home office expense, and professional meal can reduce your taxable income.
                     </p>
                   </div>
                 </div>
                 <div className="flex gap-3">
                   <div className="w-1.5 h-1.5 bg-white/50 mt-1.5 shrink-0 rounded-full" />
                   <div>
                     <p className="text-sm font-sans font-medium text-content-primary">Quarterly discipline</p>
                     <p className="text-xs text-content-tertiary mt-1 leading-normal">
                       Pay quarterly to avoid a large tax bill at year end.
                     </p>
                   </div>
                 </div>
               </div>
             </div>
             
             <div className="pt-4 border-t border-surface-border">
               <h3 className="text-xs font-sans font-semibold text-rose-500 mb-3">Important</h3>
               <p className="text-xs text-content-tertiary leading-relaxed">
                 This is an estimate based on current tax rates. Consult a tax professional for your final return.
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
