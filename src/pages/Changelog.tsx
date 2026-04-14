import React from 'react';
import { ScrollText } from 'lucide-react';

const ENTRIES: { date: string; title: string; bullets: string[] }[] = [
  {
    date: '2026-04',
    title: 'Bank linking',
    bullets: [
      'Settings → Integrations: connect your bank for automatic transaction sync when available.',
      'Your institution name and last linked time show on your profile after you connect.',
    ],
  },
  {
    date: '2026-04',
    title: 'Navigation & focus',
    bullets: [
      'Sidebar: Cash flow anchor on Dashboard, Due soon badge on Bills, More section for Categories, Support, Changelog, and Auto-rules.',
      'Settings remembers which section you were in when you use the back button or share a link.',
      'Due soon highlights bills and active subscriptions in the next seven days (overdue bills are handled separately).',
    ],
  },
];

export default function Changelog() {
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-content-primary mb-1 flex items-center gap-2">
          <ScrollText className="w-7 h-7 text-brand-indigo shrink-0" aria-hidden />
          Changelog
        </h1>
        <p className="text-sm text-content-tertiary">Product updates and notable changes.</p>
      </div>
      <ul className="space-y-8">
        {ENTRIES.map((entry) => (
          <li key={`${entry.date}-${entry.title}`} className="border border-surface-border rounded-sm bg-surface-raised p-6">
            <p className="text-xs font-sans text-content-tertiary mb-1">{entry.date}</p>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-3">{entry.title}</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-content-secondary leading-relaxed">
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
