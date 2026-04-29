import React, { memo } from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { CollapsibleModule } from '../../components/common';
import { toast } from 'sonner';
import { useStore } from '../../store';
import { getCustomIcon } from '../../lib/utils/customIcons';

function escapeCsvCell(v: unknown): string {
  const s = String(v ?? '');
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvCell(row[h])).join(','));
  }
  return lines.join('\n');
}

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

type PrivacyPanelProps = {
  onOpenResetDialog: () => void;
  onOpenDeleteDialog: () => void;
};

function PrivacyPanelInner({ onOpenResetDialog, onOpenDeleteDialog }: PrivacyPanelProps) {
  const BillingIcon = getCustomIcon('billing');
  const SecurityIcon = getCustomIcon('security');
  const exportPayload = useStore(
    useShallow((s) => ({
      profile: s.user,
      bills: s.bills,
      debts: s.debts,
      transactions: s.transactions,
      assets: s.assets,
      subscriptions: s.subscriptions,
      goals: s.goals,
      incomes: s.incomes,
      budgets: s.budgets,
      categories: s.categories,
      categorizationRules: s.categorizationRules,
      categorizationExclusions: s.categorizationExclusions,
      citations: s.citations,
      deductions: s.deductions,
      freelanceEntries: s.freelanceEntries,
      mileageLog: s.mileageLog,
      clientInvoices: s.clientInvoices,
    })),
  );

  const handleExportData = () => {
    const exportedAt = new Date().toISOString();
    const payload = {
      exportedAt,
      version: 1,
      source: 'oweable-settings-export',
      ...exportPayload,
    };
    downloadTextFile(
      `oweable-export-${exportedAt.slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      'application/json',
    );
    toast.success('Data export downloaded.');
  };

  const handleExportCsv = () => {
    const exportedAt = new Date().toISOString();
    const { transactions, bills, debts, incomes, freelanceEntries, mileageLog, clientInvoices } = exportPayload;
    const txCsv = rowsToCsv(
      ['date', 'name', 'amount', 'type', 'category', 'platformTag'],
      transactions.map((t) => ({
        date: t.date,
        name: t.name,
        amount: t.amount,
        type: t.type,
        category: t.category,
        platformTag: (t.platformTag || '').trim(),
      })),
    );
    const billsCsv = rowsToCsv(
      ['biller', 'dueDate', 'amount', 'frequency', 'status'],
      bills.map((b) => ({
        biller: b.biller,
        dueDate: b.dueDate,
        amount: b.amount,
        frequency: b.frequency,
        status: b.status,
      })),
    );
    const debtsCsv = rowsToCsv(
      ['name', 'remaining', 'apr', 'minPayment', 'type'],
      debts.map((d) => ({
        name: d.name,
        remaining: d.remaining,
        apr: d.apr,
        minPayment: d.minPayment,
        type: d.type,
      })),
    );
    const incomeCsv = rowsToCsv(
      ['name', 'amount', 'frequency', 'nextDate', 'status', 'category'],
      incomes.map((i) => ({
        name: i.name,
        amount: i.amount,
        frequency: i.frequency,
        nextDate: i.nextDate,
        status: i.status,
        category: i.category,
      })),
    );
    const freelanceCsv = rowsToCsv(
      ['client', 'amount', 'date', 'isVaulted'],
      freelanceEntries.map((f) => ({
        client: f.client,
        amount: f.amount,
        date: f.date,
        isVaulted: f.isVaulted,
      })),
    );
    const mileageCsv = rowsToCsv(
      ['tripDate', 'startLocation', 'endLocation', 'miles', 'purpose', 'platform', 'irsRatePerMile', 'deductionAmount'],
      mileageLog.map((m) => ({
        tripDate: m.tripDate,
        startLocation: m.startLocation,
        endLocation: m.endLocation,
        miles: m.miles,
        purpose: m.purpose,
        platform: m.platform,
        irsRatePerMile: m.irsRatePerMile,
        deductionAmount: m.deductionAmount,
      })),
    );
    const invoicesCsv = rowsToCsv(
      ['clientName', 'amount', 'issuedDate', 'dueDate', 'status', 'notes'],
      clientInvoices.map((inv) => ({
        clientName: inv.clientName,
        amount: inv.amount,
        issuedDate: inv.issuedDate,
        dueDate: inv.dueDate,
        status: inv.status,
        notes: inv.notes,
      })),
    );
    const combined = [
      '# Oweable CSV export',
      `# exportedAt: ${exportedAt}`,
      '',
      '# Transactions',
      txCsv,
      '',
      '# Bills',
      billsCsv,
      '',
      '# Debts',
      debtsCsv,
      '',
      '# Income sources',
      incomeCsv,
      '',
      '# Freelance entries',
      freelanceCsv,
      '',
      '# Mileage log',
      mileageCsv,
      '',
      '# Client invoices',
      invoicesCsv,
    ].join('\n');
    downloadTextFile(`oweable-export-${exportedAt.slice(0, 10)}.csv`, combined, 'text/csv;charset=utf-8');
    toast.success('CSV summary downloaded.');
  };

  return (
    <div className="space-y-6">
      <CollapsibleModule title="Data Management" icon={BillingIcon} defaultOpen>
        <p className="text-sm text-content-tertiary mb-6">Manage your inputs and export your financial history.</p>
        <div className="space-y-6">
          <div className="border border-surface-border rounded-xl p-4 bg-surface-elevated/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-medium text-content-primary">Export your data</h4>
              <p className="text-xs text-content-tertiary mt-1">
                Full JSON archive or a CSV summary (transactions, bills, debts, income, freelance, mileage).
              </p>
            </div>
            <div className="flex flex-col gap-2 shrink-0 sm:flex-row">
              <button
                type="button"
                onClick={handleExportData}
                className="rounded-md bg-content-primary px-5 py-2.5 text-sm font-semibold text-surface-base transition-[background-color,transform] hover:bg-content-secondary active:translate-y-px focus-app"
              >
                Download JSON
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="rounded-md border border-surface-border bg-surface-base px-5 py-2.5 text-sm font-medium text-content-primary transition-colors hover:bg-surface-elevated focus-app"
              >
                Download CSV
              </button>
            </div>
          </div>

          <div className="rounded-full border border-[var(--color-status-rose-border)] bg-[var(--color-status-rose-bg)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-medium text-[var(--color-status-rose-text)]">Reset Account Data</h4>
              <p className="text-xs text-content-tertiary mt-1">Wipe bills, debts, assets, and transactions — account stays open.</p>
            </div>
            <button
              type="button"
              onClick={onOpenResetDialog}
              className="shrink-0 rounded-full border border-[var(--color-status-rose-border)] bg-surface-base px-4 py-2 text-sm font-medium text-[var(--color-status-rose-text)] transition-colors hover:bg-[var(--color-status-rose-bg)] focus-app"
            >
              Reset data
            </button>
          </div>
        </div>
      </CollapsibleModule>

      <CollapsibleModule title="Danger Zone" icon={SecurityIcon} defaultOpen={false} className="border-[var(--color-status-rose-border)] bg-[var(--color-status-rose-bg)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-medium text-content-primary">Delete Account</h4>
            <p className="text-xs text-content-tertiary mt-1">Permanently delete your account and all associated data.</p>
          </div>
          <button
            type="button"
            onClick={onOpenDeleteDialog}
            className="rounded-md border border-[var(--color-status-rose-border)] bg-[var(--color-status-rose-bg)] px-4 py-2 text-sm font-semibold text-[var(--color-status-rose-text)] transition-colors hover:bg-[var(--color-status-rose-text)] hover:text-surface-base focus-app"
          >
            Delete account
          </button>
        </div>
      </CollapsibleModule>
    </div>
  );
}

export const PrivacyPanel = memo(PrivacyPanelInner);
