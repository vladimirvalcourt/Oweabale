import React from 'react';
import Footer from '../components/Footer';
import PublicHeader from '../components/PublicHeader';

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
    <div className="min-h-screen bg-surface-base text-content-primary selection:bg-content-primary/15">
      <PublicHeader
        links={[
          { href: '/pricing', label: 'Plans' },
          { href: '/support', label: 'Support' },
          { href: '/faq', label: 'FAQ' },
        ]}
      />

      <main className="pt-32 pb-24">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-profit mb-4">Changelog</p>
            <h1 className="text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl">
              What changed and why it matters.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-content-secondary">
              A simple running log of product updates so you can see what is improving without digging through announcements.
            </p>
          </div>

          <ul className="space-y-6">
            {ENTRIES.map((entry) => (
              <li key={`${entry.date}-${entry.title}`} className="rounded-[12px] border border-surface-border bg-surface-raised p-8 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-content-tertiary mb-3">{entry.date}</p>
                <h2 className="text-lg font-semibold text-content-primary mb-4">{entry.title}</h2>
                <ul className="list-disc pl-5 space-y-2 text-sm text-content-secondary leading-relaxed">
                  {entry.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}
