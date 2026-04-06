# Oweable — Architecture Guide

This document is written for the next engineer or architect picking up this codebase. Read it before touching anything.

---

## Core Philosophy

> **No AI Slop.** Every number displayed is the result of a deterministic algorithm in `lib/finance.ts`. No LLM inference, no vague estimates. Hard math only.

The UI is intentionally dense, monospace-heavy, and brutalist. Do not soften it. The target user wants data, not encouragement.

---

## State Architecture

### The Single Store

All application state lives in **`src/store/useStore.ts`** — one Zustand store. No Redux, no Context, no local state for anything that needs to persist or be shared.

```ts
// Correct — always destructure at the top of the component
const { bills, debts, addBill, deleteBill } = useStore();

// WRONG — never call inside render, useMemo, or dependency arrays
useStore.getState().bills  // causes stale closures and missed re-renders
```

### Adding a New State Entity

When you add a new entity (e.g. `Widget`), you must update **all four locations** or it will break:

1. **Interface** — define `Widget` interface at the top of `useStore.ts`
2. **AppState** — add `widgets: Widget[]` to the `AppState` interface
3. **Actions** — add `addWidget`, `editWidget`, `deleteWidget` to the `AppState` interface
4. **Implementation** — implement the actions inside `create()`
5. **Initial data** — add `widgets: []` (or seed data) to `initialData`
6. **Supabase sync** — add the table query to `fetchData()` Promise.all AND map it in the `set()` call below

Missing step 6 is the most common bug — the store works locally but resets on every login.

### Supabase Sync Pattern

```ts
// In fetchData() — add both the query AND the mapping
const [
  { data: widgets },  // 1. Add destructured variable
  ...
] = await Promise.all([
  supabase.from('widgets').select('*').eq('user_id', userId),  // 2. Add query
  ...
]);

set({
  widgets: (widgets || []).map((w: Record<string, unknown>) => ({  // 3. Add mapping
    id: w.id as string,
    name: w.name as string,
    // snake_case DB columns → camelCase TS fields
    someField: (w.some_field ?? w.someField) as string,
  })),
  ...
});
```

> Note: Supabase columns use `snake_case`. TypeScript interfaces use `camelCase`. Always handle both in the mapping using `(w.snake_case ?? w.camelCase)`.

---

## PDF Parsing

PDF parsing uses the **`pdfjs-dist` npm package** (v5). The worker is loaded via Vite's `?url` import — it does NOT use a CDN script tag.

```ts
// CORRECT — import at module level
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// WRONG — never do this. CDN global is unreliable and cross-origin workers fail silently.
const pdfjsLib = (window as any).pdfjsLib;
```

The CDN `<script>` tag for pdf.js has been removed from `index.html`. Do not add it back.

---

## Form & Validation Rules

Every form submit and every store action call must follow this pattern:

```ts
// 1. Validate strings — not just "truthy", but non-empty after trim
if (!formData.name.trim()) {
  toast.error('Name is required');
  return;
}

// 2. Validate numbers — check for NaN and positive value
const amount = parseFloat(formData.amount);
if (isNaN(amount) || amount <= 0) {
  toast.error('Enter a valid amount');
  return;
}

// 3. Call the store action
addWidget({ name: formData.name.trim(), amount });

// 4. Always confirm success
toast.success('Widget added');
```

**Never use `if (!x) return` without a `toast.error()` before it.** Silent returns are the primary source of bugs in this codebase — the user clicks a button, nothing happens, and they don't know why.

### Math Safety

When doing `Math.max` or `Math.min` on a mapped array (especially from parsed PDF text), always filter first:

```ts
// CORRECT
const amounts = rawMatches
  .map(m => parseFloat(m.replace(/[^0-9.]/g, '')))
  .filter(n => !isNaN(n) && isFinite(n));
const max = amounts.length > 0 ? Math.max(...amounts) : 0;

// WRONG — Math.max() returns -Infinity on empty array, NaN on NaN inputs
const max = Math.max(...rawMatches.map(m => parseFloat(m)));
```

---

## Component Patterns

### Page Components (`/pages`)

- One file per route. Keep them focused on layout and wiring.
- Pull store state at the top via `useStore()` destructuring.
- Heavy calculations go in `useMemo()` with correct dependency arrays.
- No direct Supabase calls from pages — that's the store's job.

### CollapsibleModule

Used everywhere as the standard card/section wrapper:

```tsx
<CollapsibleModule title="Section Title" icon={SomeLucideIcon}>
  {/* content */}
</CollapsibleModule>
```

Optionally accepts `extraHeader` for a right-aligned label/badge.

### QuickAddModal

The global quick-entry modal is triggered via `openQuickAdd(tab)`:

```ts
openQuickAdd('transaction')  // opens on transaction tab
openQuickAdd('obligation')   // opens on bill/debt tab
openQuickAdd('income')       // opens on income tab
```

Tab type must be one of: `'transaction' | 'obligation' | 'income'`

### DeviceGuard
Wraps the entire authenticated app in `App.tsx`. Blocks viewport widths below 768px with a full-screen restriction message. This is intentional — the app is desktop-only while native mobile is in development. Do not remove or bypass it.

### Resilience Layer: Boundaries & Loaders
To ensure perceived performance and error isolation:
- All pages are wrapped in `<ErrorBoundary>` to catch component-level hydration crashes and provide a recovery screen without breaking the entire SPA.
- Top-level suspenses use `<AppLoader/>` while route-level transitions use `<DashboardSkeleton/>` and `<ListSkeleton/>` to avoid UI "pops".

---

## Routing

All routes are defined in `src/App.tsx`. Authenticated routes are nested under the `Layout` component which provides the sidebar + header shell.

| Path | Component | Auth Required |
|---|---|---|
| `/` | `Landing` | No |
| `/pricing` | `Pricing` | No |
| `/onboarding` | `Onboarding` | No |
| `/privacy` | `Privacy` | No |
| `/terms` | `Terms` | No |
| `/security` | `Security` | No |
| `/dashboard` | `Dashboard` | Yes |
| `/income` | `Income` | Yes |
| `/freelance` | `Freelance` | Yes |
| `/taxes` | `Taxes` | Yes |
| `/bills` | `Obligations` | Yes |
| `/net-worth` | `NetWorth` | Yes |
| `/transactions` | `Transactions` | Yes |
| `/inbox` | `Ingestion` | Yes |
| `/settings` | `Settings` | Yes |
| `/goals` | `Goals` | Yes |
| `/education` | `Education` | Yes |
| `/subscriptions` | `Subscriptions` | Yes |
| `/budgets` | `Budgets` | Yes |
| `/calendar` | `Calendar` | Yes |
| `/categories` | `Categories` | Yes |
| `/reports` | `Reports` | Yes |

**Debt search results** in Layout's global search link to `/bills` (not `/debts` — that route does not exist).

---

## Financial Logic (`lib/finance.ts`)

Pure functions only. No side effects, no store access. Receives data as arguments, returns computed results.

| Function | Purpose |
|---|---|
| `generateAmortizationSchedule(debt)` | Month-by-month principal/interest breakdown |
| `calcMonthlyCashFlow(incomes, bills, subscriptions)` | Net monthly cash flow |
| `calcSurplusRouting(surplus, debts, goals)` | How to allocate surplus cash |
| `projectNetWorth(assets, debts, incomes, months)` | Forward-looking net worth projection |

These are used in `Obligations.tsx`, `NetWorth.tsx`, and `Dashboard.tsx`. Do not inline this logic into components.

---

## Design System

### Color Tokens (defined in `index.css` `@theme`)

| Token | Value | Use |
|---|---|---|
| `surface-base` | `#0E0F11` | Page background |
| `surface-raised` | `#151618` | Cards, panels |
| `surface-elevated` | `#1C1D21` | Hover states, inputs |
| `surface-border` | `rgba(255,255,255,0.08)` | All borders |
| `brand-indigo` | `#5E6AD2` | Primary actions |
| `brand-violet` | `#7170FF` | Hover states, accents |
| `content-primary` | `#F7F8F8` | Primary text |
| `content-secondary` | `#A0A5B0` | Labels |
| `content-tertiary` | `#6E7381` | Placeholder text |

### Typography

- **`font-sans`** (Inter): Body text, paragraphs
- **`font-mono`** (JetBrains Mono): All financial figures, labels, badges, buttons

### Scrollbars

Hidden globally via `html, body` CSS rules in `index.css`. Scrolling still works — bars are just not visible. Do not override this.

### Themes

Three themes available: `default`, `cobalt`, `neon`. Toggled via `data-theme` attribute on `:root`. Configured in Settings.

---

## Known Gaps & Future Work

These are incomplete or missing features:

1. **`deleteDebt` has no Supabase sync** — deletes locally but the record remains in the database. Needs an async implementation matching `deleteBill`.

2. **`freelanceEntries` not synced to Supabase** — `addFreelanceEntry`, `toggleFreelanceVault`, `deleteFreelanceEntry` work in local state only. A `freelance_entries` table needs to be created and the `fetchData()` function updated.

3. **Settings form has ghost inputs** — phone, timezone, and language fields render but are not wired to `formData` state and are not submitted. These need to be added to the user profile.

4. **`connectBank` (Plaid) not persisted** — `connectBank()` in the store updates local state but does not sync the resulting transactions/bills to Supabase. This requires edge functions.

5. **Security Configuration** — "Compromised password protection" needs to be enabled in the Supabase Dashboard as per advisors.

---

## Bugs Fixed (June 2026 Audit)

For traceability, here is a record of all bugs found and fixed:

| File | Bug | Fix |
|---|---|---|
| `Dashboard.tsx` | `freelanceEntries` used but not destructured from store → ReferenceError | Added to `useStore()` destructuring |
| `Dashboard.tsx` | `useStore.getState().freelanceEntries` in `useMemo` dependency array | Changed to `freelanceEntries` |
| `Dashboard.tsx` | `mockCitations` used `penalty` / `id: number` — mismatched `Citation` interface | Updated to `penaltyFee`, `id: string`, `status: 'open'` |
| `Freelance.tsx` | `addDeduction` called but not destructured | Added to `useStore()` destructuring |
| `Freelance.tsx` | PDF parsing used `window.pdfjsLib` CDN global — cross-origin worker fails | Replaced with `pdfjs-dist` npm import |
| `Freelance.tsx` | `Math.max` over unvalidated `parseFloat` array → potential `NaN` | Added `.filter()` guard |
| `Freelance.tsx` | Form submit silent on empty fields | Added `toast.error` validation |
| `Ingestion.tsx` | Same `window.pdfjsLib` CDN pattern | Replaced with `pdfjs-dist` npm import |
| `Ingestion.tsx` | Same `Math.max` NaN bug | Added `.filter()` guard |
| `Ingestion.tsx` | `as any` cast on ingestion type dropdown | Replaced with literal union type |
| `Taxes.tsx` | `addDeduction` called with no validation — NaN amount stored silently | Added `parseFloat` + empty check validation |
| `Taxes.tsx` | No toast on deduction added | Added `toast.success` |
| `Obligations.tsx` | `toast.success` fired even when citation not found in store | Moved toast inside `if (cit)` block |
| `Transactions.tsx` | `categories` destructured from store but never used | Removed |
| `Layout.tsx` | `/debts` search result route — route does not exist | Changed to `/bills` |
| `Layout.tsx` | `UploadIcon`, `ExternalLink` imported but never used | Removed |
| `NetWorth.tsx` | `addAsset` destructured but never called | Removed |
| `QuickAddModal.tsx` | `addIncome()` missing required `isTaxWithheld` field | Added `isTaxWithheld: false` |
| `useStore.ts` | `isTaxWithheld` missing from Supabase incomes mapping in `fetchData` | Added to mapping |
| `useStore.ts` | `commitIngestion` income object missing `isTaxWithheld` | Added `isTaxWithheld: false` |
| `index.css` | Native browser scrollbar visible on page body | Added global `html, body` scrollbar-hide rules |
