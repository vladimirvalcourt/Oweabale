/** Mirrors src/lib/categorizationRules.ts for Edge runtime. */

export interface RuleRow {
  match_type: string;
  match_value: string;
  category: string;
  priority: number;
  created_at: string;
}

export function applyCategorizationRules(name: string, rules: RuleRow[]): string | null {
  const n = name.toLowerCase().trim();
  for (const rule of rules) {
    const v = rule.match_value.toLowerCase().trim();
    if (!v) continue;
    switch (rule.match_type) {
      case 'contains':
        if (n.includes(v)) return rule.category;
        break;
      case 'exact':
        if (n === v) return rule.category;
        break;
      case 'starts_with':
        if (n.startsWith(v)) return rule.category;
        break;
      case 'ends_with':
        if (n.endsWith(v)) return rule.category;
        break;
    }
  }
  return null;
}
