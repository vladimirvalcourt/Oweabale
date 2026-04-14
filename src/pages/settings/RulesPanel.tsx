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
        title="Categorization Rules"
        icon={Filter}
        extraHeader={
          <span className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest">
            {categorizationRules.length} rule{categorizationRules.length !== 1 ? 's' : ''}
          </span>
        }
      >
        <div className="-mx-6 -my-6">
          <div className="p-6 border-b border-surface-border bg-surface-base">
            <p className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest mb-4">
              New Rule — applied automatically when a transaction name matches
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={ruleForm.match_type}
                onChange={(e) =>
                  setRuleForm((f) => ({ ...f, match_type: e.target.value as CategorizationRule['match_type'] }))
                }
                className="bg-surface-raised border border-surface-border text-white text-xs font-mono rounded-sm px-3 py-2 focus-app-field-indigo appearance-none w-full sm:w-36"
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
                className="flex-1 bg-surface-raised border border-surface-border text-white text-xs font-mono rounded-sm px-3 py-2 focus-app-field-indigo placeholder:text-content-muted"
              />
              <select
                value={ruleForm.category}
                onChange={(e) => setRuleForm((f) => ({ ...f, category: e.target.value }))}
                className="bg-surface-raised border border-surface-border text-white text-xs font-mono rounded-sm px-3 py-2 focus-app-field-indigo appearance-none w-full sm:w-44"
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
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-colors shrink-0"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          </div>

          {categorizationRules.length === 0 ? (
            <div className="p-10 text-center">
              <Filter className="w-7 h-7 text-content-muted mx-auto mb-3" />
              <p className="text-xs font-mono text-content-tertiary uppercase tracking-widest">No rules yet — add one above.</p>
              <p className="text-[10px] font-mono text-content-muted mt-2">Example: &quot;STARBUCKS&quot; → Coffee</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {categorizationRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between px-6 py-3 hover:bg-surface-elevated transition-colors group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-sm shrink-0">
                      {rule.match_type.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-mono text-white truncate">{rule.match_value}</span>
                    <span className="text-content-muted font-mono text-xs shrink-0">→</span>
                    <span className="text-xs font-mono text-emerald-400 truncate">{rule.category}</span>
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

      <CollapsibleModule title="Apply to Existing Transactions" icon={RefreshCw} defaultOpen={false}>
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
            className="flex items-center gap-2 px-4 py-2 bg-surface-elevated border border-surface-border text-content-secondary rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-surface-raised transition-colors disabled:opacity-50 shrink-0"
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
