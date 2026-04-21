import React, { memo, useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';
import { STATE_TAX_MAP } from '../Taxes';
import { getCustomIcon } from '../../lib/customIcons';

// When the stored taxRate is 0 (never been explicitly saved), fall back to the map
// rate for the user's actual state. This keeps FinancialPanel in sync with Taxes.tsx.
function resolveDisplayRate(state: string, rate: number): string {
  return rate > 0 ? String(rate) : String(STATE_TAX_MAP[state]?.rate ?? 0);
}

function FinancialPanelInner() {
  const TaxesIcon = getCustomIcon('taxes');
  const taxState = useStore((s) => s.user.taxState ?? '');
  const taxRate = useStore((s) => s.user.taxRate ?? 0);
  const setTaxSettings = useStore((s) => s.setTaxSettings);

  const [localTaxState, setLocalTaxState] = useState(taxState || '');
  const [localTaxRate, setLocalTaxRate] = useState(() => resolveDisplayRate(taxState || 'NY', taxRate));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalTaxState(taxState || '');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalTaxRate(resolveDisplayRate(taxState || 'NY', taxRate));
  }, [taxState, taxRate]);

  return (
    <div className="space-y-6">
      <CollapsibleModule title="Tax residence (freelance)" icon={TaxesIcon} defaultOpen>
        <p id="tax-state-preference" className="mb-4 text-sm text-content-secondary">
          Used for Freelance / gigs state tax estimates. You can also adjust this from the Taxes page.
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
    </div>
  );
}

export const FinancialPanel = memo(FinancialPanelInner);
