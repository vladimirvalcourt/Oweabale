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
        <p className="text-sm text-content-tertiary mb-6">Set your preferred currency and date format.</p>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-semibold text-content-secondary">Primary Currency</label>
            <select
              value={prefCurrency}
              onChange={(e) => setPrefCurrency(e.target.value)}
              className="mt-1 focus-app-field-indigo block w-full sm:text-sm border-surface-border bg-surface-base text-content-primary rounded-sm px-3 py-2 border transition-colors"
            >
              <option>USD ($)</option>
              <option>EUR (€)</option>
              <option>GBP (£)</option>
              <option>CAD ($)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-content-secondary">Date Format</label>
            <select
              value={prefDateFormat}
              onChange={(e) => setPrefDateFormat(e.target.value)}
              className="mt-1 focus-app-field-indigo block w-full sm:text-sm border-surface-border bg-surface-base text-content-primary rounded-sm px-3 py-2 border transition-colors"
            >
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-content-secondary">Fiscal Year Start</label>
            <select
              value={prefFiscalYear}
              onChange={(e) => setPrefFiscalYear(e.target.value)}
              className="mt-1 focus-app-field-indigo block w-full sm:text-sm border-surface-border bg-surface-base text-content-primary rounded-sm px-3 py-2 border transition-colors"
            >
              <option>January</option>
              <option>April</option>
              <option>July</option>
              <option>October</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-content-secondary">Default Dashboard View</label>
            <select
              value={prefDashboardView}
              onChange={(e) => setPrefDashboardView(e.target.value)}
              className="mt-1 focus-app-field-indigo block w-full sm:text-sm border-surface-border bg-surface-base text-content-primary rounded-sm px-3 py-2 border transition-colors"
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
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-sm text-sm font-medium transition-colors focus-app"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </CollapsibleModule>

      <CollapsibleModule title="Budget Limits" icon={PieChart} defaultOpen={false}>
        <p className="text-sm text-content-tertiary mb-6">
          Set global budget limits to receive alerts when you&apos;re close to overspending.
        </p>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-semibold text-content-secondary">Monthly Spending Limit</label>
            <div className="mt-1 relative rounded-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-content-tertiary sm:text-sm">$</span>
              </div>
              <input
                type="number"
                value={prefSpendingLimit}
                onChange={(e) => setPrefSpendingLimit(e.target.value)}
                className="focus-app-field-indigo block w-full pl-7 sm:text-sm border-surface-border bg-surface-base text-content-primary rounded-sm py-2 border transition-colors"
              />
            </div>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => deferToast(() => toast.success('Budget limits updated'))}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-sm text-sm font-medium transition-colors focus-app"
            >
              Update Limits
            </button>
          </div>
        </div>
      </CollapsibleModule>
    </div>
  );
}

export const FinancialPanel = memo(FinancialPanelInner);
