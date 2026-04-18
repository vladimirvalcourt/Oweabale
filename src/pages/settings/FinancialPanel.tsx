import React, { memo, useEffect, useState } from 'react';
import { Globe, PieChart, MapPin } from 'lucide-react';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';
import { STATE_TAX_MAP } from '../Taxes';

function deferToast(fn: () => void) {
  requestAnimationFrame(() => {
    queueMicrotask(fn);
  });
}

function FinancialPanelInner() {
  const taxState = useStore((s) => s.user.taxState ?? '');
  const taxRate = useStore((s) => s.user.taxRate ?? 0);
  const setTaxSettings = useStore((s) => s.setTaxSettings);

  const [prefCurrency, setPrefCurrency] = useState('USD ($)');
  const [prefDateFormat, setPrefDateFormat] = useState('MM/DD/YYYY');
  const [prefFiscalYear, setPrefFiscalYear] = useState('January');
  const [prefDashboardView, setPrefDashboardView] = useState('Cash Flow');
  const [prefSpendingLimit, setPrefSpendingLimit] = useState('5000');
  const [localTaxState, setLocalTaxState] = useState(taxState || '');
  const [localTaxRate, setLocalTaxRate] = useState(String(taxRate || STATE_TAX_MAP.NY.rate));

  useEffect(() => {
    setLocalTaxState(taxState || '');
    setLocalTaxRate(String(taxRate ?? STATE_TAX_MAP.NY.rate));
  }, [taxState, taxRate]);

  return (
    <div className="space-y-6">
      <CollapsibleModule title="Currency & Formatting" icon={Globe} defaultOpen={false}>
        <p className="mb-6 text-sm font-medium text-content-secondary">Set your preferred currency and date format.</p>
        <div className="max-w-md space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium text-content-secondary" htmlFor="pref-currency">
              Primary currency
            </label>
            <select
              id="pref-currency"
              value={prefCurrency}
              onChange={(e) => setPrefCurrency(e.target.value)}
              className="focus-app-field block w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary transition-colors"
            >
              <option>USD ($)</option>
              <option>EUR (€)</option>
              <option>GBP (£)</option>
              <option>CAD ($)</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-content-secondary" htmlFor="pref-date-format">
              Date format
            </label>
            <select
              id="pref-date-format"
              value={prefDateFormat}
              onChange={(e) => setPrefDateFormat(e.target.value)}
              className="focus-app-field block w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary transition-colors"
            >
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-content-secondary" htmlFor="pref-fiscal-year">
              Fiscal year start
            </label>
            <select
              id="pref-fiscal-year"
              value={prefFiscalYear}
              onChange={(e) => setPrefFiscalYear(e.target.value)}
              className="focus-app-field block w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary transition-colors"
            >
              <option>January</option>
              <option>April</option>
              <option>July</option>
              <option>October</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-content-secondary" htmlFor="pref-dashboard-view">
              Default dashboard view
            </label>
            <select
              id="pref-dashboard-view"
              value={prefDashboardView}
              onChange={(e) => setPrefDashboardView(e.target.value)}
              className="focus-app-field block w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary transition-colors"
            >
              <option>Cash Flow</option>
              <option>Safe to Spend</option>
              <option>Net Worth Overview</option>
              <option>Upcoming Bills</option>
              <option>Debt Detonator Timeline</option>
            </select>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => deferToast(() => toast.success('Preferences saved'))}
              className="rounded-lg bg-brand-cta px-5 py-2.5 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover focus-app"
            >
              Save preferences
            </button>
          </div>
        </div>
      </CollapsibleModule>

      <CollapsibleModule title="Tax residence (freelance)" icon={MapPin} defaultOpen={false}>
        <p id="tax-state-preference" className="mb-4 text-sm text-content-secondary">
          Used for Freelance Vault state tax estimates. You can also adjust this from the Taxes page.
        </p>
        <div className="max-w-md space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium text-content-secondary" htmlFor="pref-tax-state">
              State
            </label>
            <select
              id="pref-tax-state"
              value={localTaxState || 'NY'}
              onChange={(e) => {
                const code = e.target.value;
                setLocalTaxState(code);
                const r = STATE_TAX_MAP[code];
                if (r) setLocalTaxRate(String(r.rate));
              }}
              className="focus-app-field block w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary transition-colors"
            >
              {Object.entries(STATE_TAX_MAP).map(([code, { name }]) => (
                <option key={code} value={code}>
                  {name} ({code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-content-secondary" htmlFor="pref-tax-rate">
              Estimated state rate (%)
            </label>
            <input
              id="pref-tax-rate"
              type="number"
              step="0.01"
              value={localTaxRate}
              onChange={(e) => setLocalTaxRate(e.target.value)}
              className="focus-app-field block w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              const rate = parseFloat(localTaxRate);
              if (!Number.isFinite(rate) || rate < 0) {
                toast.error('Enter a valid tax rate.');
                return;
              }
              await setTaxSettings(localTaxState || 'NY', rate);
              toast.success('Tax settings saved');
            }}
            className="rounded-lg bg-brand-cta px-5 py-2.5 text-sm font-medium text-surface-base hover:bg-brand-cta-hover"
          >
            Save tax settings
          </button>
        </div>
      </CollapsibleModule>

      <CollapsibleModule title="Budget Limits" icon={PieChart} defaultOpen={false}>
        <p className="mb-6 text-sm font-medium text-content-secondary">
          Set global budget limits to receive alerts when you&apos;re close to overspending.
        </p>
        <div className="max-w-md space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium text-content-secondary" htmlFor="pref-spending-limit">
              Monthly spending limit
            </label>
            <div className="relative rounded-lg">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-sm text-content-tertiary">$</span>
              </div>
              <input
                id="pref-spending-limit"
                type="number"
                value={prefSpendingLimit}
                onChange={(e) => setPrefSpendingLimit(e.target.value)}
                className="focus-app-field block w-full rounded-lg border border-surface-border bg-surface-raised py-2 pl-7 pr-3 text-sm text-content-primary transition-colors"
              />
            </div>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => deferToast(() => toast.success('Budget limit saved'))}
              className="rounded-lg bg-brand-cta px-5 py-2.5 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover focus-app"
            >
              Save limit
            </button>
          </div>
        </div>
      </CollapsibleModule>
    </div>
  );
}

export const FinancialPanel = memo(FinancialPanelInner);
