import React, { memo, useMemo, useState } from 'react';
import { AlertTriangle, CheckSquare } from 'lucide-react';
import { Filter, Plus, Trash2, RefreshCw, Loader2, Undo2 } from 'lucide-react';
import { CollapsibleModule } from '@/components/common';
import { toast } from 'sonner';
import { useStore } from '@/store';
import { applyCategorizationRules, type CategorizationRule } from "@/lib/api/services/categorizationRules";
import { formatCategoryLabel } from "@/lib/api/services/categoryDisplay";
import { getCustomIcon } from '@/lib/utils/customIcons';

type RuleScope = 'one' | 'merchant' | 'similar';

function looksLikeRawApiCategory(cat: string): boolean {
  const c = cat.trim();
  if (!c || c.length < 4) return false;
  if (!c.includes('_')) return false;
  if (c !== c.toUpperCase()) return false;
  return /^[A-Z0-9_]+$/.test(c);
}

/**
 * E-04: Returns true if the formatted label contains any word appearing more than
 * once (case-insensitive), e.g. "Food Food" or "Fees Other Fees".
 * These are low-confidence suggestions and should be routed to a review section.
 */
function hasDuplicateWord(label: string): boolean {
  const words = label.toLowerCase().split(/[\s-_/]+/).filter(Boolean);
  return words.length !== new Set(words).size;
}

function RulesPanelInner() {
  const RulesIcon = getCustomIcon('smart');
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const categorizationRules = useStore((s) => s.categorizationRules);
  const retagTransactionsByCategory = useStore((s) => s.retagTransactionsByCategory);
  const addCategorizationRule = useStore((s) => s.addCategorizationRule);
  const deleteCategorizationRule = useStore((s) => s.deleteCategorizationRule);
  const categorizationExclusions = useStore((s) => s.categorizationExclusions);
  const deleteCategorizationExclusion = useStore((s) => s.deleteCategorizationExclusion);
  const applyRulesToExistingTransactions = useStore((s) => s.applyRulesToExistingTransactions);
  const lastRuleApplication = useStore((s) => s.lastRuleApplication);
  const undoLastRuleApplication = useStore((s) => s.undoLastRuleApplication);
  const lastAutoCategorization = useStore((s) => s.lastAutoCategorization);
  const undoLastAutoCategorization = useStore((s) => s.undoLastAutoCategorization);

  const [ruleForm, setRuleForm] = useState<{
    scope: RuleScope;
    match_value: string;
    category: string;
  }>({ scope: 'similar', match_value: '', category: '' });
  const [isApplying, setIsApplying] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedChanges, setSimulatedChanges] = useState<
    Array<{ id: string; name: string; from: string; to: string; date: string }>
  >([]);
  // E-06: tracks which clear suggestions are selected for bulk accept
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [isBulkAccepting, setIsBulkAccepting] = useState(false);

  const derivedMatchType: CategorizationRule['match_type'] =
    ruleForm.scope === 'one' ? 'exact' : ruleForm.scope === 'merchant' ? 'starts_with' : 'contains';
  const previewCount =
    ruleForm.match_value.trim() && ruleForm.category
      ? transactions.filter((tx) => {
          const matched = applyCategorizationRules(tx.name, [
            {
              id: 'preview',
              match_type: derivedMatchType,
              match_value: ruleForm.match_value.trim(),
              category: ruleForm.category,
              priority: 0,
            },
          ]);
          return matched === ruleForm.category && tx.category !== ruleForm.category;
        }).length
      : 0;
  const previewExamples =
    ruleForm.match_value.trim() && ruleForm.category
      ? transactions
          .filter((tx) => {
            const matched = applyCategorizationRules(tx.name, [
              {
                id: 'preview',
                match_type: derivedMatchType,
                match_value: ruleForm.match_value.trim(),
                category: ruleForm.category,
                priority: 0,
              },
            ]);
            return matched === ruleForm.category && tx.category !== ruleForm.category;
          })
          .slice(0, 5)
      : [];

  const categoryRenameSuggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const c = tx.category || '';
      if (!looksLikeRawApiCategory(c)) continue;
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    // E-04: tag each suggestion with low_confidence when the formatted label
    // contains repeated words — these are surfaced in a separate review section.
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .map(([from, count]) => {
        const to = formatCategoryLabel(from);
        return { from, to, count, lowConfidence: hasDuplicateWord(to) };
      });
  }, [transactions]);

  // E-04: split into clear (auto-accept) and review (needs human check) lists.
  const clearSuggestions = categoryRenameSuggestions.filter((s) => !s.lowConfidence);
  const reviewSuggestions = categoryRenameSuggestions.filter((s) => s.lowConfidence);

  const runSimulation = () => {
    if (categorizationRules.length === 0) {
      toast.error('Add at least one rule first');
      return;
    }
    setIsSimulating(true);
    const changes = transactions
      .map((tx) => {
        const to = applyCategorizationRules(tx.name, categorizationRules);
        if (!to || to === tx.category) return null;
        return { id: tx.id, name: tx.name, from: tx.category, to, date: tx.date };
      })
      .filter((x): x is { id: string; name: string; from: string; to: string; date: string } => x !== null);
    setSimulatedChanges(changes);
    setIsSimulating(false);
    if (changes.length === 0) toast.success('No category changes needed.');
  };

  return (
    <div className="space-y-6">
      <CollapsibleModule
        title="Smart Categories"
        icon={RulesIcon}
        extraHeader={
          <span className="text-xs font-medium text-content-tertiary">
            {categorizationRules.length} rule{categorizationRules.length !== 1 ? 's' : ''}
          </span>
        }
      >
        <div className="-mx-6 -my-6">
          {(clearSuggestions.length > 0 || reviewSuggestions.length > 0) && (
            <div className="p-6 border-b border-surface-border bg-content-primary/[0.03] space-y-6">
              {clearSuggestions.length > 0 && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-medium text-content-primary">Suggested renames from your transactions</p>
                      <p className="text-xs text-content-tertiary mt-0.5">
                        We found labels that look like raw bank categories — accept a friendlier name for all matching transactions.
                      </p>
                    </div>
                    {/* E-06: bulk accept controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-content-secondary select-none">
                        <input
                          type="checkbox"
                          className="rounded border-surface-border"
                          checked={selectedSuggestions.size === clearSuggestions.length && clearSuggestions.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSuggestions(new Set(clearSuggestions.map((s) => s.from)));
                            } else {
                              setSelectedSuggestions(new Set());
                            }
                          }}
                        />
                        Select all
                      </label>
                      {selectedSuggestions.size > 0 && (
                        <button
                          type="button"
                          disabled={isBulkAccepting}
                          onClick={async () => {
                            setIsBulkAccepting(true);
                            const selected = clearSuggestions.filter((s) => selectedSuggestions.has(s.from));
                            let totalRenamed = 0;
                            for (const s of selected) {
                              const n = await retagTransactionsByCategory(s.from, s.to);
                              totalRenamed += n;
                            }
                            setSelectedSuggestions(new Set());
                            setIsBulkAccepting(false);
                            toast.success(
                              totalRenamed > 0
                                ? `Renamed ${totalRenamed} transaction${totalRenamed === 1 ? '' : 's'} across ${selected.length} categories`
                                : 'No transactions needed updating.',
                            );
                          }}
                          className="flex items-center gap-1.5 rounded-md bg-brand-cta px-3 py-1.5 text-xs font-medium text-surface-base hover:bg-brand-cta-hover disabled:opacity-50"
                        >
                          {isBulkAccepting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckSquare className="w-3 h-3" />
                          )}
                          Accept {selectedSuggestions.size} selected
                        </button>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {clearSuggestions.map((s) => (
                      <li
                        key={s.from}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-surface-border bg-surface-raised px-3 py-2"
                      >
                        {/* E-06: per-row checkbox */}
                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            className="shrink-0 rounded border-surface-border"
                            checked={selectedSuggestions.has(s.from)}
                            onChange={(e) => {
                              const next = new Set(selectedSuggestions);
                              if (e.target.checked) next.add(s.from);
                              else next.delete(s.from);
                              setSelectedSuggestions(next);
                            }}
                          />
                          <span className="text-xs text-content-secondary">
                            <span className="font-medium text-content-primary">{s.to}</span>
                            <span className="text-content-tertiary">
                              {' '}
                              · {s.count} transaction{s.count !== 1 ? 's' : ''} with raw bank codes
                            </span>
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const n = await retagTransactionsByCategory(s.from, s.to);
                              if (n === 0) toast.info('No transactions needed updating.');
                              else toast.success(`Renamed ${n} transaction${n === 1 ? '' : 's'}`);
                            }}
                            className="rounded-md bg-brand-cta px-3 py-1.5 text-xs font-medium text-surface-base hover:bg-brand-cta-hover"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRuleForm((f) => ({
                                ...f,
                                scope: 'similar',
                                match_value: s.from,
                                category: s.to,
                              }))
                            }
                            className="rounded-md border border-surface-border px-3 py-1.5 text-xs font-medium text-content-secondary hover:bg-surface-elevated"
                          >
                            Edit
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* E-04: Low-confidence suggestions — label contains a repeated word */}
              {reviewSuggestions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-status-amber-text)] shrink-0" aria-hidden />
                    <p className="text-sm font-medium text-content-primary">Needs your review</p>
                  </div>
                  <p className="text-xs text-content-tertiary mb-4">
                    These labels may not parse correctly — review before accepting.
                  </p>
                  <ul className="space-y-2">
                    {reviewSuggestions.map((s) => (
                      <li
                        key={s.from}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-full border border-[var(--color-status-amber-border)] bg-[var(--color-status-amber-bg)] px-3 py-2"
                      >
                        <span className="text-xs text-content-secondary">
                          <span className="font-medium text-content-primary">{s.to}</span>
                          <span className="text-content-tertiary">
                            {' '}
                            · {s.count} transaction{s.count !== 1 ? 's' : ''}
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const n = await retagTransactionsByCategory(s.from, s.to);
                              if (n === 0) toast.info('No transactions needed updating.');
                              else toast.success(`Renamed ${n} transaction${n === 1 ? '' : 's'}`);
                            }}
                            className="rounded-md border border-surface-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-content-secondary hover:bg-surface-elevated"
                          >
                            Accept anyway
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRuleForm((f) => ({
                                ...f,
                                scope: 'similar',
                                match_value: s.from,
                                category: s.to,
                              }))
                            }
                            className="rounded-md bg-brand-cta px-3 py-1.5 text-xs font-medium text-surface-base hover:bg-brand-cta-hover"
                          >
                            Edit
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="p-6 border-b border-surface-border bg-surface-base">
            <p className="mb-4 text-sm font-medium text-content-secondary">
              New auto-category — choose a safe scope before saving
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={ruleForm.scope}
                onChange={(e) =>
                  setRuleForm((f) => ({ ...f, scope: e.target.value as RuleScope }))
                }
                className="w-full appearance-none rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-xs font-medium text-content-primary focus-app-field sm:w-36"
              >
                <option value="one">One exact name</option>
                <option value="merchant">Merchant family</option>
                <option value="similar">All similar</option>
              </select>
              <input
                type="text"
                placeholder="e.g. STARBUCKS"
                value={ruleForm.match_value}
                onChange={(e) => setRuleForm((f) => ({ ...f, match_value: e.target.value }))}
                className="flex-1 rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-xs font-medium text-content-primary placeholder:text-content-muted focus-app-field"
              />
              <select
                value={ruleForm.category}
                onChange={(e) => setRuleForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full appearance-none rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-xs font-medium text-content-primary focus-app-field sm:w-44"
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
                    match_type: derivedMatchType,
                    match_value: ruleForm.match_value.trim(),
                    category: ruleForm.category,
                    priority: 0,
                  });
                  setRuleForm((f) => ({ ...f, match_value: '' }));
                }}
                className="flex shrink-0 items-center gap-2 rounded-md bg-brand-cta px-4 py-2 text-sm font-medium text-surface-base transition-colors hover:bg-brand-cta-hover"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            <p className="mt-3 text-xs text-content-tertiary">
              Preview: this rule would re-categorize <span className="text-content-primary font-medium">{previewCount}</span>{' '}
              existing transaction{previewCount !== 1 ? 's' : ''}.
            </p>
            {previewExamples.length > 0 && (
              <div className="mt-3 rounded-xl border border-surface-border bg-surface-raised p-3">
                <p className="text-xs font-medium text-content-secondary mb-2">Examples</p>
                <ul className="space-y-1">
                  {previewExamples.map((tx) => (
                    <li key={tx.id} className="text-xs text-content-tertiary">
                      <span className="text-content-primary">{tx.name}</span> ({tx.date}) →{' '}
                      {formatCategoryLabel(ruleForm.category)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
                    <span className="shrink-0 rounded-xl border border-surface-border bg-content-primary/[0.05] px-2 py-0.5 text-xs font-medium capitalize text-content-primary">
                      {rule.match_type.replace('_', ' ')}
                    </span>
                    <span className="truncate text-sm font-medium text-content-primary">{rule.match_value}</span>
                    <span className="shrink-0 text-xs text-content-muted">→</span>
                    <span className="truncate text-xs font-medium text-[var(--color-status-emerald-text)]">
                      {formatCategoryLabel(rule.category)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteCategorizationRule(rule.id)}
                    className="ml-4 text-content-muted hover:text-[var(--color-status-rose-text)] transition-colors opacity-0 group-hover:opacity-100 shrink-0"
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

      <CollapsibleModule title="Re-apply Smart Categories" icon={RulesIcon} defaultOpen={false}>
        <div className="space-y-4">
          {lastAutoCategorization && (
            <div className="rounded-xl border border-surface-border bg-surface-base p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-content-primary">
                  Auto-categorized “{lastAutoCategorization.name}” to {formatCategoryLabel(lastAutoCategorization.to)}
                </p>
                <p className="text-xs text-content-tertiary mt-0.5">
                  Was previously {formatCategoryLabel(lastAutoCategorization.from)}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void undoLastAutoCategorization()}
                className="inline-flex items-center gap-2 rounded-md border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-medium text-content-secondary hover:bg-surface-raised"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Undo
              </button>
            </div>
          )}
          {lastRuleApplication && (
            <div className="rounded-xl border border-surface-border bg-surface-base p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-content-primary">
                  Last bulk apply changed {lastRuleApplication.changes.length} transaction{lastRuleApplication.changes.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-content-tertiary mt-0.5">Use undo if this was too broad.</p>
              </div>
              <button
                type="button"
                onClick={() => void undoLastRuleApplication()}
                className="inline-flex items-center gap-2 rounded-md border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-medium text-content-secondary hover:bg-surface-raised"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Undo bulk apply
              </button>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-content-tertiary leading-relaxed">
              Re-run all your rules against every transaction already in the system. Matching transactions will have their
              category updated.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runSimulation}
              disabled={isSimulating}
              className="flex shrink-0 items-center gap-2 rounded-md border border-surface-border bg-surface-elevated px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-raised disabled:opacity-50"
            >
              {isSimulating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Simulate & Review
            </button>
            <button
              type="button"
              onClick={async () => {
                setIsApplying(true);
                const count = await applyRulesToExistingTransactions();
                setIsApplying(false);
                if (count === 0) toast.success('All transactions already match your rules');
                else toast.success(`Updated ${count} transaction${count !== 1 ? 's' : ''}`);
                setSimulatedChanges([]);
              }}
              disabled={isApplying || simulatedChanges.length === 0}
              className="flex shrink-0 items-center gap-2 rounded-md bg-brand-cta px-4 py-2 text-sm font-medium text-surface-base transition-colors hover:bg-brand-cta-hover disabled:opacity-50"
            >
              {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Confirm Apply
            </button>
          </div>
          </div>
          {simulatedChanges.length > 0 && (
            <div className="rounded-xl border border-surface-border bg-surface-base p-4">
              <p className="text-sm font-medium text-content-primary mb-2">
                Simulation found {simulatedChanges.length} change{simulatedChanges.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-content-tertiary mb-3">
                Review before applying. Showing first {Math.min(simulatedChanges.length, 20)}.
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {simulatedChanges.slice(0, 20).map((change) => (
                  <div key={change.id} className="rounded border border-surface-border bg-surface-raised px-3 py-2">
                    <p className="text-xs text-content-primary font-medium">{change.name}</p>
                    <p className="text-xs text-content-tertiary mt-0.5">
                      {change.date} · {formatCategoryLabel(change.from)} → {formatCategoryLabel(change.to)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleModule>

      <CollapsibleModule title="Rule Exclusions" icon={RulesIcon} defaultOpen={false}>
        {categorizationExclusions.length === 0 ? (
          <p className="text-sm text-content-tertiary">No exclusions yet. Add from Transaction History row actions.</p>
        ) : (
          <div className="divide-y divide-surface-border">
            {categorizationExclusions.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="text-sm text-content-primary">
                    {e.scope === 'transaction'
                      ? `Transaction ${e.transaction_id?.slice(0, 8)}…`
                      : `Merchant: ${e.merchant_name}`}
                  </p>
                  <p className="text-xs text-content-tertiary mt-0.5">
                    {e.scope === 'transaction' ? 'Only this transaction skips auto-categorization.' : 'All transactions from this merchant skip auto-categorization.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteCategorizationExclusion(e.id)}
                  className="inline-flex items-center gap-2 rounded-md border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-medium text-content-secondary hover:bg-surface-raised"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </CollapsibleModule>
    </div>
  );
}

export const RulesPanel = memo(RulesPanelInner);
