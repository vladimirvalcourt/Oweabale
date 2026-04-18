import React, { memo, startTransition, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dialog } from '@headlessui/react';
import { AlertTriangle, Shield, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';
import { SETTINGS_TAB_IDS, type SettingsTab } from './settings/constants';
import { ProfilePanel } from './settings/ProfilePanel';
import { NotificationsPanel } from './settings/NotificationsPanel';
import { SecurityPanel } from './settings/SecurityPanel';
import { BillingPanel } from './settings/BillingPanel';
import { FinancialPanel } from './settings/FinancialPanel';
import { IntegrationsPanel } from './settings/IntegrationsPanel';
import { PrivacyPanel } from './settings/PrivacyPanel';
import { RulesPanel } from './settings/RulesPanel';
import { SupportPanel } from './settings/SupportPanel';
import { FeedbackPanel } from './settings/FeedbackPanel';

const tabs = [
  { id: 'profile' as const, name: 'Profile' },
  { id: 'security' as const, name: 'Security' },
  { id: 'notifications' as const, name: 'Notifications' },
  { id: 'financial' as const, name: 'Preferences' },
  { id: 'rules' as const, name: 'Smart Categories' },
  { id: 'billing' as const, name: 'Billing' },
  { id: 'integrations' as const, name: 'Integrations' },
  { id: 'privacy' as const, name: 'Data & Privacy' },
  { id: 'support' as const, name: 'Support' },
  { id: 'feedback' as const, name: 'Feedback' },
];

const SettingsNav = memo(function SettingsNav({
  activeTab,
  onSelect,
}: {
  activeTab: SettingsTab;
  onSelect: (id: SettingsTab) => void;
}) {
  return (
    <nav className="space-y-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={cn(
            'w-full flex items-center px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.2em] rounded-lg transition-all border border-transparent',
            activeTab === tab.id
              ? 'bg-white/[0.08] text-content-primary border-white/10 shadow-none'
              : 'text-content-tertiary hover:text-content-primary hover:bg-surface-raised',
          )}
        >
          {tab.name}
        </button>
      ))}
    </nav>
  );
});

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const resetData = useStore((state) => state.resetData);
  const deleteAccount = useStore((state) => state.deleteAccount);

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && SETTINGS_TAB_IDS.includes(t as SettingsTab)) {
      setActiveTab(t as SettingsTab);
    } else if (!t) {
      setActiveTab('profile');
    }
  }, [searchParams]);

  const selectTab = useCallback((tabId: SettingsTab) => {
    startTransition(() => {
      setActiveTab(tabId);
      if (tabId === 'profile') {
        setSearchParams({}, { replace: true });
      } else {
        setSearchParams({ tab: tabId }, { replace: true });
      }
    });
  }, [setSearchParams]);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      setIsDeleteDialogOpen(false);
      toast.success('Account deleted successfully');
    } catch {
      toast.error('Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleResetData = async () => {
    setIsResettingData(true);
    await resetData();
    setIsResettingData(false);
    setIsResetDialogOpen(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">Settings</h1>
          <p className="text-xs font-mono uppercase tracking-widest text-content-tertiary mt-1">
            Account configuration & preferences
          </p>
        </div>
        <div className="flex items-center text-[10px] font-mono text-content-tertiary bg-surface-raised px-3 py-1.5 rounded-lg border border-surface-border uppercase tracking-widest">
          <Shield className="w-3.5 h-3.5 mr-1.5 text-content-secondary" />
          Secure connection
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <SettingsNav activeTab={activeTab} onSelect={selectTab} />
        </aside>

        <div className="flex-1 space-y-6">
          {activeTab === 'profile' && <ProfilePanel />}
          {activeTab === 'notifications' && <NotificationsPanel />}
          {activeTab === 'security' && <SecurityPanel />}
          {activeTab === 'billing' && <BillingPanel />}
          {activeTab === 'financial' && <FinancialPanel />}
          {activeTab === 'integrations' && <IntegrationsPanel />}
          {activeTab === 'privacy' && (
            <PrivacyPanel onOpenResetDialog={() => setIsResetDialogOpen(true)} onOpenDeleteDialog={() => setIsDeleteDialogOpen(true)} />
          )}
          {activeTab === 'rules' && <RulesPanel />}
          {activeTab === 'support' && <SupportPanel />}
          {activeTab === 'feedback' && <FeedbackPanel />}
        </div>
      </div>

      <Dialog open={isResetDialogOpen} onClose={() => setIsResetDialogOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-surface-raised border border-surface-border p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full border border-amber-500/50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <Dialog.Title className="text-lg font-semibold tracking-tight text-content-primary">Reset Data?</Dialog.Title>
            </div>
            <Dialog.Description className="text-sm text-content-tertiary mb-6">
              This will permanently delete all your bills, debts, assets, and transactions. Your account will remain active, but you
              will be sent back to the onboarding setup.
            </Dialog.Description>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsResetDialogOpen(false)}
                className="px-4 py-2 bg-transparent border border-surface-border rounded-lg text-sm font-medium text-content-secondary hover:bg-surface-elevated transition-colors focus-app"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetData}
                disabled={isResettingData}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors focus-app"
              >
                {isResettingData && <Loader2 className="w-3 h-3 animate-spin" />}
                {isResettingData ? 'Resetting...' : 'Reset Everything'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-surface-raised border border-surface-border p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full border border-[#7F1D1D] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
              </div>
              <Dialog.Title className="text-lg font-semibold tracking-tight text-content-primary">Delete account</Dialog.Title>
            </div>
            <Dialog.Description className="text-sm text-content-tertiary mb-6">
              Are you sure you want to delete your account? All of your data will be permanently removed. This action cannot be
              undone.
            </Dialog.Description>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 bg-transparent border border-surface-border rounded-lg text-sm font-medium text-content-secondary hover:bg-surface-elevated transition-colors focus-app"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors focus-app"
              >
                {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
