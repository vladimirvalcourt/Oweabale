import React, { memo, useState } from 'react';
import { Filter, Plus, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';
import type { CategorizationRule } from '../../lib/categorizationRules';

function RulesPanelInner() {
  const categories = useStore((s) => s.categories);
  const categorizationRules = useStore((s) => s.categorizationRules);
  const addCategorizationRule = useStore((s) => s.addCategorizationRule);
  const deleteCategorizationRule = useStore((s) => s.deleteCategorizationRule);
  const applyRulesToExistingTransactions = useStore((s) => s.applyRulesToExistingTransactions);

  const [ruleForm, setRuleForm] = useState<{
    match_type: CategorizationRule['match_type'];
    match_value: string;
    category: string;
  }>({ match_type: 'contains', match_value: '', category: '' });
  const [isApplying, setIsApplying] = useState(false);

  return (
    <div className="space-y-6">
      <CollapsibleModule
        title="Smart Categories"
        icon={Filter}
        extraHeader={
          <span className="text-xs font-medium text-content-tertiary">
            {categorizationRules.length} rule{categorizationRules.length !== 1 ? 's' : ''}
          </span>
        }
      >
        <div className="-mx-6 -my-6">
          <div className="p-6 border-b border-surface-border bg-surface-base">
            <p className="mb-4 text-sm font-medium text-content-secondary">
              New auto-category — applied when a transaction name matches
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={ruleForm.match_type}
                onChange={(e) =>
                  setRuleForm((f) => ({ ...f, match_type: e.target.value as CategorizationRule['match_type'] }))
                }
                className="w-full appearance-none rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs font-medium text-content-primary focus-app-field sm:w-36"
              >
                <option value="contains">Contains</option>
                <option value="exact">Exact Match</option>
                <option value="starts_with">Starts With</option>
                <option value="ends_with">Ends With</option>
              </select>
              <input
                type="text"
                placeholder="e.g. STARBUCKS"
                value={ruleForm.match_value}
                onChange={(e) => setRuleForm((f) => ({ ...f, match_value: e.target.value }))}
                className="flex-1 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs font-medium text-content-primary placeholder:text-content-muted focus-app-field"
              />
              <select
                value={ruleForm.category}
                onChange={(e) => setRuleForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full appearance-none rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs font-medium text-content-primary focus-app-field sm:w-44"
              >
                <option value="">— Select category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={async () => {
                  if (!ruleForm.match_value.trim() || !ruleForm.category) {
                    toast.error('Fill in the match value and category');
                    return;
                  }
                  await addCategorizationRule({
                    match_type: ruleForm.match_type,
                    match_value: ruleForm.match_value.trim(),
                    category: ruleForm.category,
                    priority: 0,
                  });
                  setRuleForm((f) => ({ ...f, match_value: '' }));
                }}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          </div>

          {categorizationRules.length === 0 ? (
            <div className="p-10 text-center">
              <Filter className="w-7 h-7 text-content-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-content-secondary">No auto-categories yet — add one above.</p>
              <p className="mt-2 text-xs font-medium text-content-tertiary">Example: &quot;STARBUCKS&quot; → Coffee</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {categorizationRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between px-6 py-3 hover:bg-surface-elevated transition-colors group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="shrink-0 rounded-lg border border-surface-border bg-white/[0.05] px-2 py-0.5 text-[11px] font-medium capitalize text-content-primary">
                      {rule.match_type.replace('_', ' ')}
                    </span>
                    <span className="truncate text-sm font-medium text-content-primary">{rule.match_value}</span>
                    <span className="shrink-0 text-xs text-content-muted">→</span>
                    <span className="truncate text-xs font-medium text-emerald-500">{rule.category}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteCategorizationRule(rule.id)}
                    className="ml-4 text-content-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    title="Delete rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleModule>

      <CollapsibleModule title="Re-apply Smart Categories" icon={RefreshCw} defaultOpen={false}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-content-tertiary leading-relaxed">
              Re-run all your rules against every transaction already in the system. Matching transactions will have their
              category updated.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (categorizationRules.length === 0) {
                toast.error('Add at least one rule first');
                return;
              }
              setIsApplying(true);
              const count = await applyRulesToExistingTransactions();
              setIsApplying(false);
              if (count === 0) toast.success('All transactions already match your rules');
              else toast.success(`Updated ${count} transaction${count !== 1 ? 's' : ''}`);
            }}
            disabled={isApplying}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-surface-border bg-surface-elevated px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-raised disabled:opacity-50"
          >
            {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Apply Retroactively
          </button>
        </div>
      </CollapsibleModule>
    </div>
  );
}

export const RulesPanel = memo(RulesPanelInner);
