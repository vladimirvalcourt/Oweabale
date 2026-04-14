import React, { memo } from 'react';
import { Building2, Download, CreditCard as CreditCardIcon } from 'lucide-react';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { toast } from 'sonner';

function deferToast(fn: () => void) {
  requestAnimationFrame(() => {
    queueMicrotask(fn);
  });
}

function BillingPanelInner() {
  return (
    <div className="space-y-6">
      <CollapsibleModule
        title="Subscription Plan"
        icon={Building2}
        defaultOpen
        extraHeader={
          <span className="inline-flex items-center text-[10px] font-mono font-bold text-content-tertiary bg-surface-raised px-2.5 py-1 rounded-sm border border-surface-border uppercase tracking-widest">
            The Tracker
          </span>
        }
      >
        <p className="text-sm text-content-tertiary mb-6">You are currently on the Free tier.</p>
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-sm p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-content-primary font-bold flex items-center gap-2">Upgrade to The Arsenal</h4>
            <p className="text-sm text-indigo-200/70 mt-1 max-w-md">
              Unlock the Debt Detonator, Subscription Sniper, and automatic account syncing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => deferToast(() => toast.success('Redirecting to upgrade...'))}
            className="shrink-0 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-sm font-bold transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]"
          >
            Upgrade Now
          </button>
        </div>
      </CollapsibleModule>

      <CollapsibleModule title="Billing History" icon={Download} defaultOpen={false}>
        <p className="text-sm text-content-tertiary mb-6">View and download your previous invoices.</p>
        <div className="border border-surface-border border-dashed rounded-sm p-8 flex flex-col items-center justify-center text-center bg-surface-base">
          <Download className="w-7 h-7 text-content-muted mb-3" />
          <p className="text-xs font-mono text-content-tertiary uppercase tracking-widest">No billing history</p>
          <p className="text-[10px] font-mono text-content-muted mt-1">You are on the free tier — no charges have been made.</p>
        </div>
      </CollapsibleModule>

      <CollapsibleModule title="Payment Methods" icon={CreditCardIcon} defaultOpen={false}>
        <p className="text-sm text-content-tertiary mb-6">Manage payment methods used for your subscriptions.</p>
        <div className="border border-surface-border border-dashed rounded-sm p-6 flex flex-col items-center justify-center text-center mb-4 bg-surface-base">
          <CreditCardIcon className="w-8 h-8 text-content-muted mb-3" />
          <p className="text-xs font-mono text-content-tertiary uppercase tracking-widest">No payment method on file</p>
          <p className="text-[10px] font-mono text-content-muted mt-1">Free tier — no billing required</p>
        </div>
        <button
          type="button"
          onClick={() => deferToast(() => toast.success('Payment method flow coming soon'))}
          className="text-sm font-medium text-content-primary hover:text-white transition-colors bg-surface-elevated px-4 py-2 border border-surface-border rounded-sm focus-app"
        >
          + Add Payment Method
        </button>
      </CollapsibleModule>
    </div>
  );
}

export const BillingPanel = memo(BillingPanelInner);
