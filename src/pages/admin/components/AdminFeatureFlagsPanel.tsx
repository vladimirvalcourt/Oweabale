import { useState } from 'react';
import { ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';

// ADD 9: 3-state flag values
export type FlagState = 'enabled' | 'beta' | 'disabled';

interface Props {
  platformSettings: { feature_flags?: Record<string, boolean | string> } | null;
  onSetFeatureFlag: (scope: 'global', key: string, value: boolean) => Promise<void>;
  /** settings.platform permission (or super admin) */
  canManagePlatform?: boolean;
}

// ADD 9: Expanded list covering all major features
const GLOBAL_FLAGS: { key: string; label: string; group: string }[] = [
  // Core financial
  { key: 'goals_enabled', label: 'Goals', group: 'Core' },
  { key: 'budgets_enabled', label: 'Budgets', group: 'Core' },
  { key: 'transactions_enabled', label: 'Transactions', group: 'Core' },
  { key: 'net_worth_enabled', label: 'Net Worth', group: 'Core' },
  { key: 'savings_enabled', label: 'Savings', group: 'Core' },
  { key: 'debts_loans_enabled', label: 'Debts & Loans', group: 'Core' },
  // Advanced
  { key: 'investments_enabled', label: 'Investments', group: 'Advanced' },
  { key: 'insurance_enabled', label: 'Insurance', group: 'Advanced' },
  { key: 'taxes_enabled', label: 'Taxes', group: 'Advanced' },
  { key: 'cash_flow_enabled', label: 'Cash Flow', group: 'Advanced' },
  { key: 'reports_enabled', label: 'Reports', group: 'Advanced' },
  { key: 'trends_enabled', label: 'Trends', group: 'Advanced' },
  // Features
  { key: 'calendar_enabled', label: 'Calendar', group: 'Features' },
  { key: 'subscriptions_enabled', label: 'Subscriptions', group: 'Features' },
  { key: 'freelance_gigs_enabled', label: 'Freelance / Gigs', group: 'Features' },
  { key: 'document_inbox_enabled', label: 'Document Inbox', group: 'Features' },
  { key: 'tickets_fines_enabled', label: 'Tickets & Fines', group: 'Features' },
  // Education
  { key: 'credit_workshop_enabled', label: 'Credit Workshop', group: 'Education' },
  { key: 'academy_enabled', label: 'Academy', group: 'Education' },
];

const FLAG_STATES: FlagState[] = ['disabled', 'beta', 'enabled'];

function parseFlagState(val: boolean | string | undefined): FlagState {
  if (val === 'beta') return 'beta';
  if (val === false || val === 'disabled') return 'disabled';
  return 'enabled'; // default
}

export function AdminFeatureFlagsPanel({
  platformSettings,
  onSetFeatureFlag,
  canManagePlatform = true,
}: Props) {
  const [loadingFlag, setLoadingFlag] = useState<string | null>(null);
  const [draftFlags, setDraftFlags] = useState<Record<string, FlagState>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>('Core');

  const getFlagState = (key: string): FlagState => {
    if (key in draftFlags) return draftFlags[key];
    const raw = platformSettings?.feature_flags?.[key];
    return parseFlagState(raw as boolean | string | undefined);
  };

  const handleSetState = (key: string, state: FlagState) => {
    setDraftFlags((prev) => ({ ...prev, [key]: state }));
  };

  const saveFlag = async (key: string) => {
    const state = getFlagState(key);
    setLoadingFlag(key);
    try {
      if (state === 'beta') {
        // Store 'beta' string via admin-actions using a special extended flag format
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await supabase.functions.invoke('admin-actions', {
            body: { action: 'set_feature_flag', flagScope: 'global', flagKey: key, flagValue: 'beta' },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        }
      } else {
        await onSetFeatureFlag('global', key, state === 'enabled');
      }
      setDraftFlags((prev) => { const next = { ...prev }; delete next[key]; return next; });
      toast.success(`${key} set to ${state}`);
    } catch {
      toast.error(`Failed to save flag: ${key}`);
    } finally {
      setLoadingFlag(null);
    }
  };

  const saveAll = async () => {
    const keys = Object.keys(draftFlags);
    if (keys.length === 0) { toast.info('No unsaved changes.'); return; }
    setIsSavingAll(true);
    for (const key of keys) {
      await saveFlag(key);
    }
    setIsSavingAll(false);
    toast.success('All flags saved.');
  };

  const groups = [...new Set(GLOBAL_FLAGS.map((f) => f.group))];

  return (
    <div className="border border-surface-border rounded-lg bg-surface-raised p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2">
          <ToggleRight className="w-4 h-4" /> Feature Flags
        </h2>
        <button
          type="button"
          disabled={!canManagePlatform || isSavingAll || Object.keys(draftFlags).length === 0}
          onClick={() => void saveAll()}
          className="rounded-lg border border-brand-cta bg-brand-cta/10 px-3 py-1 text-[10px] font-semibold text-brand-cta disabled:opacity-40"
        >
          {isSavingAll ? 'Saving…' : `Save all (${Object.keys(draftFlags).length})`}
        </button>
      </div>

      {platformSettings === null ? (
        <div className="space-y-2">
          {GLOBAL_FLAGS.slice(0, 5).map((flag) => (
            <div key={flag.key} className="flex items-center justify-between py-1">
              <div className="h-3 w-32 rounded-lg bg-surface-elevated animate-pulse" />
              <div className="h-5 w-32 rounded-full bg-surface-elevated animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const flags = GLOBAL_FLAGS.filter((f) => f.group === group);
            const isOpen = expandedGroup === group;
            return (
              <div key={group} className="rounded-lg border border-surface-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedGroup(isOpen ? null : group)}
                  className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-content-tertiary hover:bg-surface-elevated"
                >
                  <span>{group}</span>
                  <span className="text-content-muted">{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen ? (
                  <div className="divide-y divide-surface-border/50">
                    {flags.map((flag) => {
                      const currentState = getFlagState(flag.key);
                      const isDraft = flag.key in draftFlags;
                      const isLoading = loadingFlag === flag.key;

                      return (
                        <div key={flag.key} className="flex items-center justify-between px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${isDraft ? 'text-amber-300' : 'text-content-primary'}`}>
                              {flag.label}
                            </span>
                            {isDraft ? (
                              <span className="rounded bg-amber-500/15 px-1 py-0.5 text-[9px] text-amber-300">unsaved</span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* 3-way toggle: Disabled | Beta | Enabled */}
                            <div className="flex rounded-lg border border-surface-border overflow-hidden">
                              {FLAG_STATES.map((state) => (
                                <button
                                  key={state}
                                  type="button"
                                  disabled={isLoading || !canManagePlatform}
                                  onClick={() => handleSetState(flag.key, state)}
                                  className={`px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-50 ${
                                    currentState === state
                                      ? state === 'enabled'
                                        ? 'bg-emerald-500 text-white'
                                        : state === 'beta'
                                          ? 'bg-amber-500 text-white'
                                          : 'bg-surface-elevated text-content-muted'
                                      : 'bg-surface-base text-content-tertiary hover:bg-surface-raised'
                                  }`}
                                >
                                  {state === 'enabled' ? 'On' : state === 'beta' ? 'Beta' : 'Off'}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              disabled={isLoading || !canManagePlatform || !isDraft}
                              onClick={() => void saveFlag(flag.key)}
                              className="rounded px-1.5 py-1 text-[10px] border border-surface-border text-content-tertiary hover:text-content-secondary disabled:opacity-30"
                            >
                              {isLoading ? '…' : 'Save'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
