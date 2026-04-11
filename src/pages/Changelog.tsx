import React from 'react';
import { ScrollText } from 'lucide-react';

const ENTRIES: { date: string; title: string; bullets: string[] }[] = [
  {
    date: '2026-04',
    title: 'Plaid bank linking',
    bullets: [
      'Settings → Integrations: real Plaid Link via Edge Functions (link token + public_token exchange). Access tokens stay in `plaid_items`; profile stores institution name and linked time.',
      'Requires Supabase secrets: PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV; deploy functions `plaid-link-token` and `plaid-exchange`.',
    ],
  },
  {
    date: '2026-04',
    title: 'Navigation & focus',
    bullets: [
      'Sidebar: Cash flow anchor on Dashboard, Due soon badge on Bills, More section for Categories, Support, Changelog, and Auto-rules.',
      'Settings: tab changes sync to the URL (?tab=); Profile clears the query.',
      'Due soon count: bills and active subscriptions in the next 7 days (overdue bills excluded); citations still use the 7-day urgency window.',
    ],
  },
];

export default function Changelog() {
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary mb-1 uppercase flex items-center gap-2">
          <ScrollText className="w-7 h-7 text-brand-indigo" />
          Changelog
        </h1>
        <p className="text-zinc-400 text-sm">Product updates and notable changes.</p>
      </div>
      <ul className="space-y-8">
        {ENTRIES.map((entry) => (
          <li key={`${entry.date}-${entry.title}`} className="border border-surface-border rounded-sm bg-surface-raised p-6">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{entry.date}</p>
            <h2 className="text-lg font-semibold text-content-primary mb-3">{entry.title}</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 leading-relaxed">
              {entry.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
