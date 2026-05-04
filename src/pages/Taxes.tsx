import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore, type MileageLogEntry } from '@/store';
import {
  Clock,
  Plus,
  Trash2,
  Map,
  ShieldAlert,
  Zap,
  ExternalLink,
  Download,
  BookOpen,
  Landmark,
  Info,
} from 'lucide-react';
import { CollapsibleModule } from '@/components/common';
import { TransitionLink } from '@/components/common';
import { TAX_YEAR_2024, calculateStandardDeduction, calculateSelfEmploymentTax } from '@/config/taxRates';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getCustomIcon } from '@/lib/utils';

function defaultIrsRateForPurpose(purpose: MileageLogEntry['purpose']): number {
  switch (purpose) {
    case 'business':
      return 0.7;
    case 'medical':
      return 0.21;
    case 'charity':
      return 0.14;
    default:
      return 0.7;
  }
}

function quarterKeyFromTripDate(dateStr: string): string {
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = d.getMonth();
  const q = m < 3 ? 1 : m < 6 ? 2 : m < 9 ? 3 : 4;
  return `${y}-Q${q}`;
}

function escapeCsvCell(v: unknown): string {
  const s = String(v ?? '');
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Common State Tax Rates for Gig Workers (Estimates)
export const STATE_TAX_MAP: Record<string, { name: string; rate: number }> = {
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
  const TaxesIcon = getCustomIcon('taxes');
  const CalendarIcon = getCustomIcon('calendar');
  const PlanningIcon = getCustomIcon('planning');
  const {
    incomes,
    deductions,
    addDeduction,
    deleteDeduction,
    user,
    setTaxSettings,
    mileageLog,
    addMileageLogEntry,
    deleteMileageLogEntry,
  } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const taxTab: 'overview' | 'mileage' = searchParams.get('view') === 'mileage' ? 'mileage' : 'overview';

  const applyTaxTab = (tab: 'overview' | 'mileage') => {
    if (tab === 'mileage') setSearchParams({ view: 'mileage' }, { replace: true });
    else setSearchParams({}, { replace: true });
  };
  const [filingStatus, setFilingStatus] = useState<'single' | 'married'>('single');
  const [newDeduction, setNewDeduction] = useState({ name: '', category: '', amount: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [mileageForm, setMileageForm] = useState({
    tripDate: new Date().toISOString().slice(0, 10),
    startLocation: '',
    endLocation: '',
    miles: '',
    purpose: 'business' as MileageLogEntry['purpose'],
    platform: '',
    irsRatePerMile: String(defaultIrsRateForPurpose('business')),
  });

  const taxState = user.taxState || 'NY';
  // E-01: derive fallback from the selected state's map rate — keeps Taxes.tsx
  // and FinancialPanel in sync. Both read user.taxRate; when unset, fall back to
  // the rate for the currently selected state rather than a hardcoded 6.25.
  const stateRate = user.taxRate ?? (STATE_TAX_MAP[taxState]?.rate ?? 0);

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
    const standardDeduction = calculateStandardDeduction(status === 'single' ? 'single' : 'marriedFilingJointly');
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

  const seTax = calculateSelfEmploymentTax(incomeStats.grossGig);
  const fedTax = calculateFederal(incomeStats.total, filingStatus);
  const stateTax = incomeStats.total * (stateRate / 100);
  const totalLiability = fedTax + seTax + stateTax;

  const ytdMileageEntries = mileageLog.filter((e) => e.tripDate.startsWith(String(currentYear)));
  const totalMileageDeductionYtd = useMemo(
    () => ytdMileageEntries.reduce((s, e) => s + e.deductionAmount, 0),
    [ytdMileageEntries],
  );
  const mileageByQuarter = (() => {
    const m: Record<string, { miles: number; deduction: number }> = {};
    for (const e of ytdMileageEntries) {
      const k = quarterKeyFromTripDate(e.tripDate);
      if (!k.startsWith(String(currentYear))) continue;
      if (!m[k]) m[k] = { miles: 0, deduction: 0 };
      m[k].miles += e.miles;
      m[k].deduction += e.deductionAmount;
    }
    return m;
  })();

  const approxFedMarginalRate = incomeStats.total > 0 ? Math.min(0.37, fedTax / incomeStats.total) : 0;
  const estFedReductionFromMileage = totalMileageDeductionYtd * approxFedMarginalRate;

  const exportMileageCsv = () => {
    const headers = [
      'tripDate',
      'startLocation',
      'endLocation',
      'miles',
      'purpose',
      'platform',
      'irsRatePerMile',
      'deductionAmount',
    ];
    const lines = [headers.join(',')];
    const sorted = [...mileageLog].sort((a, b) => (a.tripDate < b.tripDate ? 1 : -1));
    for (const row of sorted) {
      lines.push(
        headers
          .map((h) =>
            escapeCsvCell(
              row[h as keyof MileageLogEntry] as unknown,
            ),
          )
          .join(','),
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oweable-mileage-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Mileage log exported.');
  };

  const quarterCards = [
    { key: `${currentYear}-Q1`, label: 'Q1' },
    { key: `${currentYear}-Q2`, label: 'Q2' },
    { key: `${currentYear}-Q3`, label: 'Q3' },
    { key: `${currentYear}-Q4`, label: 'Q4' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">
            <ShieldAlert className="h-7 w-7 shrink-0 text-content-secondary" aria-hidden /> Freelance tax guide
          </h1>
          <p className="mt-1 text-sm font-medium text-content-secondary">
            {taxTab === 'overview'
              ? 'Estimates and quarterly reminders based on your ledger.'
              : 'Manual mileage log for planning — consult a tax pro before filing.'}
          </p>
          <div className="mt-3 inline-flex rounded-xl border border-surface-border bg-surface-raised p-1">
            <button
              type="button"
              onClick={() => applyTaxTab('overview')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-sans font-semibold transition-colors',
                taxTab === 'overview'
                  ? 'bg-brand-cta text-surface-base'
                  : 'text-content-tertiary hover:text-content-secondary',
              )}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => applyTaxTab('mileage')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-sans font-semibold transition-colors inline-flex items-center gap-1.5',
                taxTab === 'mileage'
                  ? 'bg-brand-cta text-surface-base'
                  : 'text-content-tertiary hover:text-content-secondary',
              )}
            >
              <Map className="h-3.5 w-3.5" aria-hidden />
              Mileage log
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={taxState}
            onChange={(e) => setTaxSettings(e.target.value, STATE_TAX_MAP[e.target.value].rate)}
            className="bg-surface-raised border border-surface-border text-sm font-sans text-content-primary px-3 py-1.5 focus-app-field rounded-md"
          >
            {Object.keys(STATE_TAX_MAP).map(k => (
              <option key={k} value={k}>{STATE_TAX_MAP[k].name} ({STATE_TAX_MAP[k].rate}%)</option>
            ))}
          </select>
          <div className="flex bg-surface-raised border border-surface-border rounded-xl p-1">
            <button
              onClick={() => setFilingStatus('single')}
              className={`px-3 py-1 text-xs font-sans font-medium rounded-full transition-colors ${filingStatus === 'single' ? 'bg-brand-cta text-surface-base' : 'text-content-tertiary hover:text-content-secondary'}`}
            >Single</button>
            <button
              onClick={() => setFilingStatus('married')}
              className={`px-3 py-1 text-xs font-sans font-medium rounded-full transition-colors ${filingStatus === 'married' ? 'bg-brand-cta text-surface-base' : 'text-content-tertiary hover:text-content-secondary'}`}
            >Married</button>
          </div>
        </div>
      </div>

      {taxTab === 'mileage' ? (
        <div className="space-y-6">
          <div className="bg-surface-raised border border-surface-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-sm font-sans font-semibold text-content-primary">Mileage deduction planning</p>
              <p className="text-xs text-content-tertiary mt-1 max-w-xl leading-relaxed">
                Log trips with the IRS standard rate for your purpose. Rates are defaults for {currentYear} planning — adjust per your situation. Deduction totals here are separate from the write-off tracker on Overview.
              </p>
            </div>
            <button
              type="button"
              onClick={exportMileageCsv}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-sans font-semibold text-content-primary hover:bg-surface-elevated/80 transition-colors shrink-0"
            >
              <Download className="h-4 w-4" aria-hidden />
              Export CSV
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quarterCards.map(({ key, label }) => {
              const agg = mileageByQuarter[key] ?? { miles: 0, deduction: 0 };
              return (
                <div
                  key={key}
                  className="rounded-xl border border-surface-border bg-surface-elevated p-4"
                >
                  <p className="text-xs font-sans font-semibold text-content-tertiary">{label} {currentYear}</p>
                  <p className="mt-2 text-lg font-mono tabular-nums text-content-primary data-numeric">
                    {agg.miles.toLocaleString(undefined, { maximumFractionDigits: 1 })} mi
                  </p>
                  <p className="text-xs font-mono tabular-nums text-emerald-400 mt-1 data-numeric">
                    ${agg.deduction.toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-surface-border bg-surface-elevated/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-sans font-semibold text-content-tertiary">Year-to-date mileage deduction (logged)</p>
              <p className="text-2xl font-mono font-bold tabular-nums text-content-primary data-numeric mt-1">
                ${totalMileageDeductionYtd.toFixed(2)}
              </p>
            </div>
            <div className="text-sm text-content-secondary max-w-md">
              <span className="text-content-tertiary">Rough federal tax offset (planning): </span>
              <span className="font-mono tabular-nums text-content-primary data-numeric">
                ~${estFedReductionFromMileage.toFixed(0)}
              </span>
              <span className="text-content-tertiary">
                {' '}
                at ~{(approxFedMarginalRate * 100).toFixed(1)}% of income (simplified; not tax advice).
              </span>
            </div>
          </div>

          <CollapsibleModule title="Add trip" icon={PlanningIcon} defaultOpen>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-content-tertiary mb-1">Date</p>
                <input
                  type="date"
                  value={mileageForm.tripDate}
                  onChange={(e) => setMileageForm((f) => ({ ...f, tripDate: e.target.value }))}
                  className="w-full bg-surface-base border border-surface-border rounded-md h-10 px-3 text-sm text-content-primary focus-app-field"
                />
              </div>
              <div>
                <p className="text-xs text-content-tertiary mb-1">Purpose</p>
                <select
                  value={mileageForm.purpose}
                  onChange={(e) => {
                    const purpose = e.target.value as MileageLogEntry['purpose'];
                    setMileageForm((f) => ({
                      ...f,
                      purpose,
                      irsRatePerMile: String(defaultIrsRateForPurpose(purpose)),
                    }));
                  }}
                  className="w-full bg-surface-base border border-surface-border rounded-md h-10 px-3 text-sm text-content-primary focus-app-field"
                >
                  <option value="business">Business</option>
                  <option value="medical">Medical</option>
                  <option value="charity">Charity</option>
                </select>
              </div>
              <div>
                <p className="text-xs text-content-tertiary mb-1">Miles</p>
                <input
                  type="number"
                  min={0.01}
                  step={0.1}
                  placeholder="0"
                  value={mileageForm.miles}
                  onChange={(e) => setMileageForm((f) => ({ ...f, miles: e.target.value }))}
                  className="w-full bg-surface-base border border-surface-border rounded-md h-10 px-3 text-sm font-mono tabular-nums text-content-primary focus-app-field"
                />
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-content-tertiary mb-1">Start → end</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Start"
                    value={mileageForm.startLocation}
                    onChange={(e) => setMileageForm((f) => ({ ...f, startLocation: e.target.value }))}
                    className="flex-1 bg-surface-base border border-surface-border rounded-md h-10 px-3 text-sm text-content-primary focus-app-field"
                  />
                  <input
                    type="text"
                    placeholder="End"
                    value={mileageForm.endLocation}
                    onChange={(e) => setMileageForm((f) => ({ ...f, endLocation: e.target.value }))}
                    className="flex-1 bg-surface-base border border-surface-border rounded-md h-10 px-3 text-sm text-content-primary focus-app-field"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-content-tertiary mb-1">Platform / client (optional)</p>
                <input
                  type="text"
                  placeholder="e.g. DoorDash"
                  value={mileageForm.platform}
                  onChange={(e) => setMileageForm((f) => ({ ...f, platform: e.target.value }))}
                  className="w-full bg-surface-base border border-surface-border rounded-md h-10 px-3 text-sm text-content-primary focus-app-field"
                />
              </div>
              <div>
                <p className="text-xs text-content-tertiary mb-1">IRS rate ($/mi)</p>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={mileageForm.irsRatePerMile}
                  onChange={(e) => setMileageForm((f) => ({ ...f, irsRatePerMile: e.target.value }))}
                  className="w-full bg-surface-base border border-surface-border rounded-md h-10 px-3 text-sm font-mono tabular-nums text-content-primary focus-app-field"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3 flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    const miles = parseFloat(mileageForm.miles);
                    const rate = parseFloat(mileageForm.irsRatePerMile);
                    if (!mileageForm.tripDate) {
                      toast.error('Pick a trip date.');
                      return;
                    }
                    if (!Number.isFinite(miles) || miles <= 0) {
                      toast.error('Enter valid miles.');
                      return;
                    }
                    if (!Number.isFinite(rate) || rate < 0) {
                      toast.error('Enter a valid IRS rate.');
                      return;
                    }
                    const ok = await addMileageLogEntry({
                      tripDate: mileageForm.tripDate,
                      startLocation: mileageForm.startLocation.trim(),
                      endLocation: mileageForm.endLocation.trim(),
                      miles,
                      purpose: mileageForm.purpose,
                      platform: mileageForm.platform.trim(),
                      irsRatePerMile: rate,
                    });
                    if (!ok) return;
                    toast.success('Trip saved');
                    setMileageForm((f) => ({
                      ...f,
                      startLocation: '',
                      endLocation: '',
                      miles: '',
                      platform: '',
                    }));
                  }}
                  className="bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font-sans font-semibold px-4 py-2 rounded-md transition-colors"
                >
                  Save trip
                </button>
              </div>
            </div>
          </CollapsibleModule>

          <CollapsibleModule title="Logged trips" icon={TaxesIcon} defaultOpen>
            <div className="divide-y divide-surface-border max-h-[min(480px,50vh)] overflow-y-auto">
              {mileageLog.length === 0 ? (
                <p className="p-6 text-sm text-content-tertiary">No trips yet — add one above.</p>
              ) : (
                [...mileageLog]
                  .sort((a, b) => (a.tripDate < b.tripDate ? 1 : -1))
                  .map((row) => (
                    <div
                      key={row.id}
                      className="px-4 py-3 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-surface-elevated/60 group"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-content-primary font-sans">
                          {row.tripDate}{' '}
                          <span className="text-content-tertiary font-normal">
                            · {row.startLocation || '—'} → {row.endLocation || '—'}
                          </span>
                        </p>
                        <p className="text-xs text-content-tertiary mt-0.5">
                          {row.purpose}
                          {row.platform ? ` · ${row.platform}` : ''} · {row.miles.toLocaleString(undefined, { maximumFractionDigits: 1 })} mi @ $
                          {row.irsRatePerMile.toFixed(2)}/mi
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-mono tabular-nums text-emerald-400 data-numeric">
                          ${row.deductionAmount.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteMileageLogEntry(row.id);
                          }}
                          className="text-content-muted hover:text-rose-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          aria-label="Delete trip"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CollapsibleModule>
        </div>
      ) : (
        <>
          {/* Gig Worker Education Banner */}
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 flex items-start gap-3 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
            <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-sans font-semibold text-amber-400 mb-1">Freelancer tip: the savings rule</p>
              <p className="text-sm text-content-secondary leading-relaxed font-sans">
                As a freelancer in <strong>{STATE_TAX_MAP[taxState].name}</strong>, you pay both sides of Social Security & Medicare. This is an extra{' '}
                <strong>15.3%</strong> cost{' '}
                {/* COPY-03: self-employment tax label + tooltip */}
                (<span className="relative inline-flex cursor-default items-center group">
                  <span className="underline underline-offset-2 decoration-dotted text-content-secondary">self-employment tax</span>
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-72 -translate-x-1/2 rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-xs font-normal leading-snug text-content-secondary opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                    As a freelancer, you pay both the employee AND employer share of Social Security and Medicare.
                  </span>
                </span>){' '}
                that regular employees don&apos;t see. Oweable has factored this into your current <strong>${(stateRate + 15.3 + (incomeStats.total > 0 ? fedTax / incomeStats.total * 100 : 0)).toFixed(1)}%</strong> estimated savings rate.
              </p>
            </div>
          </div>

          <CollapsibleModule title="Tax Reduction Playbook" icon={PlanningIcon} defaultOpen>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-content-secondary leading-relaxed">
                High-impact moves freelancers use to lower taxable income and stay compliant. Not tax advice—use this as a checklist with your CPA.
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3 items-start">
                  <Map className="h-4 w-4 shrink-0 text-content-tertiary mt-0.5" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-content-primary">Log business miles</p>
                    <p className="text-xs text-content-tertiary mt-0.5">
                      Standard mileage adds up fast.{' '}
                      <button
                        type="button"
                        onClick={() => applyTaxTab('mileage')}
                        className="text-content-primary font-semibold underline underline-offset-2 hover:no-underline focus-app"
                      >
                        Open mileage log
                      </button>
                    </p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <Plus className="h-4 w-4 shrink-0 text-content-tertiary mt-0.5" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-content-primary">Track write-offs</p>
                    <p className="text-xs text-content-tertiary mt-0.5">
                      Add gear, software, and business expenses in the tracker below—Oweable folds them into your estimate.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <Landmark className="h-4 w-4 shrink-0 text-content-tertiary mt-0.5" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-content-primary">Pay yourself on purpose</p>
                    <p className="text-xs text-content-tertiary mt-0.5">
                      Set a steady salary and tax reserve on{' '}
                      <TransitionLink
                        to="/income"
                        className="text-content-primary font-semibold underline underline-offset-2 hover:no-underline focus-app"
                      >
                        Income
                      </TransitionLink>{' '}
                      so gig cash doesn&apos;t feel like spendable income.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <Clock className="h-4 w-4 shrink-0 text-content-tertiary mt-0.5" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-content-primary">Stay ahead of quarterly deadlines</p>
                    <p className="text-xs text-content-tertiary mt-0.5">
                      Use the reminders in the sidebar panel and IRS Direct Pay when a quarter is due.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <BookOpen className="h-4 w-4 shrink-0 text-content-tertiary mt-0.5" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-content-primary">Go deeper in Academy</p>
                    <p className="text-xs text-content-tertiary mt-0.5">
                      <TransitionLink
                        to="/education"
                        className="text-content-primary font-semibold underline underline-offset-2 hover:no-underline focus-app"
                      >
                        Financial Academy
                      </TransitionLink>{' '}
                      has 1099 survival and quarterly tax lessons.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </CollapsibleModule>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <CollapsibleModule title="Yearly Tax Estimates" icon={TaxesIcon}>
                <div className="flex flex-col items-center justify-center py-10">
                  <p className="metric-label normal-case text-content-tertiary mb-2">Estimated total liability</p>
                  <h2 className="text-6xl font-bold font-mono text-content-primary tabular-nums tracking-tighter data-numeric">
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

              <CollapsibleModule title="Tax Write-offs Tracker" icon={PlanningIcon}>
                <div className="p-0">
                  <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-elevated/50">
                    <p className="text-sm font-sans font-medium text-content-secondary">Write-offs from your ledger</p>
                    <button type="button" onClick={() => setShowAddForm(!showAddForm)} className="bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-xs font-sans font-semibold px-3 py-1.5 rounded-md transition-all">Add deduction</button>
                  </div>
                  {showAddForm && (
                    <div className="p-6 bg-surface-elevated border-b border-surface-border flex gap-3 items-end">
                      <div className="flex-1">
                        <p className="text-xs text-content-tertiary mb-1">Expense label</p>
                        <input type="text" placeholder="e.g. Adobe Suite" value={newDeduction.name} onChange={e => setNewDeduction({ ...newDeduction, name: e.target.value })} className="w-full bg-surface-base border border-surface-border rounded-md h-10 px-3 text-sm text-content-primary focus-app-field transition-colors" />
                      </div>
                      <div className="w-24">
                        <p className="text-xs text-content-tertiary mb-1">Amount</p>
                        <input type="number" placeholder="0.00" value={newDeduction.amount} onChange={e => setNewDeduction({ ...newDeduction, amount: e.target.value })} className="w-full bg-surface-base border border-surface-border rounded-md h-10 px-3 text-sm font-mono tabular-nums text-content-primary focus-app-field transition-colors" />
                      </div>
                      <button type="button" onClick={async () => {
                        if (!newDeduction.name.trim()) { toast.error('Enter an expense label'); return; }
                        const amt = parseFloat(newDeduction.amount);
                        if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return; }
                        const ok = await addDeduction({ ...newDeduction, amount: amt, category: 'Business', date: new Date().toISOString() });
                        if (!ok) return;
                        toast.success('Deduction added');
                        setNewDeduction({ name: '', amount: '', category: '' }); setShowAddForm(false);
                      }} className="bg-emerald-500 text-surface-base h-10 px-4 text-sm font-sans font-semibold rounded-md hover:bg-emerald-400 transition-colors">Add</button>
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
                          <button type="button" aria-label={`Delete deduction ${d.name}`} onClick={async () => { await deleteDeduction(d.id); }} className="focus-app rounded text-content-muted opacity-0 transition-all group-hover:opacity-100 hover:text-rose-500"><Trash2 className="w-4 h-4" aria-hidden /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleModule>
            </div>

            <div className="space-y-6">
              <CollapsibleModule title="Quarterly Tax Deadlines" icon={CalendarIcon}>
                <div className="space-y-4">
                  {quarterlyDates.map(q => (
                    <div key={q.label} className={`p-4 rounded-xl border ${q.overdue ? 'bg-surface-raised border-surface-border opacity-50' : q.daysLeft < 15 ? 'bg-rose-500/5 border-rose-500/30 shadow-[inset_0_0_15px_rgba(244,63,94,0.05)]' : 'bg-surface-elevated border-surface-border'}`}>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-sans font-semibold text-content-tertiary">{q.label} estimated payment</span>
                        {q.overdue ? <span className="bg-surface-elevated text-content-tertiary text-xs px-2 py-0.5 rounded-full">Completed</span> : <span className="text-emerald-400 text-xs font-sans font-medium">{q.daysLeft}d left</span>}
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-xs text-content-tertiary">
                          Due {q.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          {/* COPY-02: penalty tooltip on each quarterly deadline */}
                          <span className="relative inline-flex cursor-default items-center group">
                            <Info className="h-3 w-3 text-content-muted" aria-hidden />
                            <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-xs font-normal leading-snug text-content-secondary opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                              Missing this deadline may result in an IRS underpayment penalty. Consult your CPA for your specific situation.
                            </span>
                          </span>
                        </span>
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

              <div className="bg-surface-raised border border-surface-border p-6 rounded-xl space-y-6">
                <div>
                  <h3 className="text-sm font-sans font-semibold text-content-primary mb-4">Smart freelance tips</h3>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 bg-content-primary/50 mt-1.5 shrink-0 rounded-full" />
                      <div>
                        <p className="text-sm font-sans font-medium text-content-primary">Check your real pay</p>
                        <p className="text-xs text-content-tertiary mt-1 leading-normal">
                          Don't spend all your income — set aside at least {Math.round(TAX_YEAR_2024.recommendedReservePercentage * 100)}% for taxes.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 bg-content-primary/50 mt-1.5 shrink-0 rounded-full" />
                      <div>
                        <p className="text-sm font-sans font-medium text-content-primary">Audit for deductions</p>
                        <p className="text-xs text-content-tertiary mt-1 leading-normal">
                          Every software subscription, home office expense, and professional meal can reduce your taxable income.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 bg-content-primary/50 mt-1.5 shrink-0 rounded-full" />
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
        </>
      )}
    </div>
  );
}
