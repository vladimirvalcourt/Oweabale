export interface CategorizationRule {
  id: string;
  match_type: 'contains' | 'exact' | 'starts_with' | 'ends_with';
  match_value: string;
  category: string;
  priority: number;
}

export interface CategorizationExclusion {
  id: string;
  scope: 'transaction' | 'merchant';
  transaction_id?: string | null;
  merchant_name?: string | null;
}

export function merchantKey(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Given a transaction name and a set of user rules, returns the first matching
 * category (highest priority wins, then most recently created).
 * Rules should be pre-sorted by priority DESC, created_at DESC.
 */
export function applyCategorizationRules(
  name: string,
  rules: CategorizationRule[]
): string | null {
  const n = name.toLowerCase().trim();
  for (const rule of rules) {
    const v = rule.match_value.toLowerCase().trim();
    if (!v) continue;
    switch (rule.match_type) {
      case 'contains':    if (n.includes(v))    return rule.category; break;
      case 'exact':       if (n === v)           return rule.category; break;
      case 'starts_with': if (n.startsWith(v))  return rule.category; break;
      case 'ends_with':   if (n.endsWith(v))    return rule.category; break;
    }
  }
  return null;
}
