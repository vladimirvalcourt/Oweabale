import type { Transaction } from '../store/useStore';

export type SubscriptionCandidate = {
  id: string;
  name: string;
  typicalAmount: number;
  frequencyLabel: string;
  confidence: 'high' | 'medium';
  sampleDates: string[];
};

const MS_DAY = 86400000;

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Detect recurring expense charges from transaction history (merchant + amount cadence). */
export function detectSubscriptionCandidates(
  transactions: Transaction[],
  existingNamesLower: Set<string>,
): SubscriptionCandidate[] {
  const expenses = transactions.filter((t) => t.type === 'expense' && t.amount > 0 && t.name?.trim());
  const byMerchant = new Map<string, Transaction[]>();
  for (const t of expenses) {
    const key = t.name.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!byMerchant.has(key)) byMerchant.set(key, []);
    byMerchant.get(key)!.push(t);
  }

  const out: SubscriptionCandidate[] = [];

  for (const [key, txs] of byMerchant) {
    if (txs.length < 3) continue;
    if (existingNamesLower.has(key)) continue;

    const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
    const amounts = sorted.map((t) => t.amount);
    const med = median(amounts);
    const amountSpread = Math.max(...amounts) / Math.max(med, 0.01);
    if (amountSpread > 1.35) continue;

    const dates = sorted.map((t) => new Date(t.date.includes('T') ? t.date : `${t.date}T12:00:00`).getTime());
    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      gaps.push((dates[i] - dates[i - 1]) / MS_DAY);
    }
    const medGap = median(gaps);
    let frequencyLabel = '';
    let confidence: 'high' | 'medium' = 'medium';
    if (medGap >= 26 && medGap <= 35) {
      frequencyLabel = 'Monthly';
      confidence = txs.length >= 4 ? 'high' : 'medium';
    } else if (medGap >= 6 && medGap <= 8) {
      frequencyLabel = 'Weekly';
    } else if (medGap >= 13 && medGap <= 16) {
      frequencyLabel = 'Bi-weekly';
    } else {
      continue;
    }

    out.push({
      id: `cand-${key.slice(0, 24).replace(/\W/g, '-')}-${Math.round(med)}`,
      name: sorted[sorted.length - 1].name.trim(),
      typicalAmount: Math.round(med * 100) / 100,
      frequencyLabel,
      confidence,
      sampleDates: sorted.slice(-4).map((t) => t.date),
    });
  }

  return out.sort((a, b) => b.sampleDates.length - a.sampleDates.length).slice(0, 12);
}
