import React, { memo, useState } from 'react';
import { Globe, PieChart } from 'lucide-react';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { toast } from 'sonner';

function deferToast(fn: () => void) {
  requestAnimationFrame(() => {
    queueMicrotask(fn);
  });
}

function FinancialPanelInner() {
  const [prefCurrency, setPrefCurrency] = useState('USD ($)');
  const [prefDateFormat, setPrefDateFormat] = useState('MM/DD/YYYY');
  const [prefFiscalYear, setPrefFiscalYear] = useState('January');
  const [prefDashboardView, setPrefDashboardView] = useState('Net Worth Overview');
  const [prefSpendingLimit, setPrefSpendingLimit] = useState('5000');

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
              onClick={() => deferToast(() => toast.success('Budget limits updated'))}
              className="rounded-lg bg-brand-cta px-5 py-2.5 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover focus-app"
            >
              Update limits
            </button>
          </div>
        </div>
      </CollapsibleModule>
    </div>
  );
}

export const FinancialPanel = memo(FinancialPanelInner);
