# Oweable — Product & Technical Reference

## Product Overview

Oweable is a personal finance command center built for users who want full visibility and control over their financial life. It tracks income (salaried and gig), obligations (bills, debts, fines), net worth, tax liability, and freelance earnings — all in a single dark, data-dense interface.

**Core Philosophy: No AI Slop.** Every number is the result of a deterministic algorithm. No LLM inference, no chatbots, no vague "insights". Hard math, displayed brutally.

---

## Deployment

| Item | Value |
|---|---|
| Domain | oweable.com |
| Hosting | Vercel |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Node version | 20.x |

---

## Tech Stack

| Layer | Tool | Version |
|---|---|---|
| Framework | React + Vite | React 19, Vite 6 |
| Routing | React Router DOM | v7 |
| State | Zustand | v5 |
| Database | Supabase | v2 |
| Styling | Tailwind CSS | v4 |
| Animations | Motion (Framer) | v12 |
| Charts | Recharts | v3 |
| Notifications | Sonner | v2 |
| Icons | Lucide React | v0.546 |
| PDF Parsing | pdfjs-dist | v5 (npm, NOT CDN) |
| OCR | Tesseract.js | v7 |
| UI Primitives | Headless UI | v2 |

---

## Feature Inventory

### Dashboard (`/dashboard`)
The main command center. Shows:
- **State Intelligence Profile** — estimated survival time (months of runway), disposable net, tax tank
- **Net Worth, Total Assets, Tax Reserve, Net Surplus** — top-level KPIs
- **Tax Shield** — lifetime write-offs scoured from freelance entries
- **Cash Safety** — overdraft risk detection based on rolling 72H burn
- **Spending Pulse** — burn velocity vs income
- **Citation Sniper** — urgent unpaid tickets with countdown
- **Balance Trend** — 30-day chart

### Income (`/income`)
Tracks recurring income sources (W-2 and freelance). Each entry tagged with `isTaxWithheld` — salaried income marked as withheld, gig income marked as gross (tax reserve applied automatically in Taxes page).

### Freelance / gigs (`/freelance`)
Dedicated gig and freelance income tracker. Features:
- PDF/image statement scanning via pdfjs-dist + Tesseract
- Automatic extraction of platform (Uber, Lyft, DoorDash), gross amount, mileage deductions, platform fees
- Per-entry tax liability calculation (SE tax 15.3% + state rate + 12% federal estimate)
- Tax reserve toggle to mark tax money as physically set aside

### Taxes (`/taxes`)
Freelance tax planning dashboard. Features:
- Real-time annual tax liability estimate (Federal brackets + SE tax + state)
- IRS quarterly deadline tracker with direct-pay links
- Manual deduction entry (write-offs)
- State selector (9 states currently mapped)
- Filing status toggle (single / married)

### Bills & Debts (`/bills`)
Unified obligations tracker. Three categories:
- **Regular Bills** — mock recurring fixed costs (rent, utilities, phone)
- **Loans & Credit** — user-entered debts with Avalanche/Snowball payoff calculator, amortization chart
- **Tickets & Fines** — citations with penalty countdown, resolve action

### Net Worth (`/net-worth`)
Assets minus liabilities with animated counters and a 12-month projection chart. Pie chart breakdown by asset/liability type.

### Transactions (`/transactions`)
Full ledger with advanced filtering (type, category, date range, amount range) and CSV export.

### Review Inbox (`/inbox`)
Document ingestion pipeline:
1. User uploads PDF or image -> **File is securely persisted to Supabase Storage Vault**.
2. Tesseract (images) or pdfjs-dist (PDFs) extracts text locally in browser.
3. Auto-extracts: merchant name, amount, due date, category.
4. User reviews and corrects in expandable panel, alongside a secure signed URL preview of their original document.
5. "Approve & Save" commits to the appropriate store entity (transaction, bill, or income).

### Settings (`/settings`)
Profile management, theme selection (default/cobalt/neon), tax state/rate configuration, danger zone (delete account).

### Financial Academy (`/education`)
Elite-tier curriculum teaching financial offense and defense. Features:
- 10 structured tracks covering Finance 101, Debt Strategies, Taxes, Real Estate, and Income Expansion.
- Smooth transition-based animated accordion course list.
- Immersive headless-UI powered lesson viewer (article type).
- Built-in progress tracking (0-100%).

---

## Database Schema

See `src/lib/supabase_schema.sql` for the full SQL schema. Key tables:

| Table | Maps To |
|---|---|
| `profiles` | `user` in AppState |
| `bills` | `Bill[]` |
| `debts` | `Debt[]` |
| `transactions` | `Transaction[]` |
| `assets` | `Asset[]` |
| `subscriptions` | `Subscription[]` |
| `goals` | `Goal[]` |
| `incomes` | `IncomeSource[]` |
| `budgets` | `Budget[]` |
| `categories` | `Category[]` |
| `citations` | `Citation[]` |
| `deductions` | `Deduction[]` |

> `freelance_entries` table does not yet exist in Supabase. Freelance data is local-only. See ARCHITECTURE.md Known Gaps.

All tables use Row Level Security (RLS). Every query is filtered by `user_id`. Never bypass this.

---

## Security Model

- **Auth**: Supabase JWT. Sessions managed client-side via `@supabase/supabase-js`.
- **RLS**: All tables have `user_id` policies. Users cannot read or write each other's data.
- **No secrets on client**: `VITE_SUPABASE_ANON_KEY` is the public key only. No service role key is used client-side.
- **Sensitive operations**: Plaid token exchange and any future payment operations should go through Supabase Edge Functions, not client-side code.
- **PDF processing**: Done entirely client-side in the browser. No file is uploaded to any server. The extracted text never leaves the user's browser session.

---

## State Management Rules

The entire app state lives in `src/store/useStore.ts`. See `ARCHITECTURE.md` for the full guide. The one rule that matters most:

**Always destructure from `useStore()`. Never call `useStore.getState()` inside a component.**

```ts
// Correct
const { bills, addBill } = useStore();

// Wrong — causes stale data and missed re-renders
const bills = useStore.getState().bills;
```

## Resilience Layer
The app includes high-usability fail-safes:
- **ErrorBoundary.tsx**: Catches component crashes without white-screening the app, rendering an actionable error report.
- **PageSkeletons.tsx**: Uses `AppLoader`, `DashboardSkeleton`, and `ListSkeleton` for initial rendering states. No raw text loaders.

---

## Design Language

- **Dark only**. `surface-base: #0E0F11`. No light mode.
- **Monospace for data** (`JetBrains Mono`). Sans-serif for prose (`Inter`).
- **No rounded corners** — `rounded-none` or `rounded-sm` maximum. Sharp edges everywhere.
- **No gradients** — flat surfaces with subtle border differentiation.
- **Color encodes meaning**: indigo = action, emerald = positive/saved, rose = danger/debt, amber = warning.
- **Desktop only** — `DeviceGuard` blocks <768px. Native app is planned.

---

## Development Workflow

### Adding a New Page
1. Create `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx` inside the `Layout` wrapper
3. Add nav link in `src/components/Layout.tsx` navGroups array
4. If it needs new data, add state entity to `useStore.ts` (all 6 locations — see ARCHITECTURE.md)

### Adding a Store Action
1. Add the action signature to the `AppState` interface
2. Implement it in the `create()` body
3. If it mutates user data, make it async and sync to Supabase
4. If a new entity, add to `fetchData()` (query + mapping)

### Touching Financial Calculations
All financial math lives in `src/lib/finance.ts`. Functions are pure — no side effects. Test them independently before wiring to UI.

---

## What to Build Next

Priority order based on current gaps:

1. **`freelance_entries` Supabase table** — create migration, update `fetchData()`, add async sync to `addFreelanceEntry` / `toggleFreelanceVault` / `deleteFreelanceEntry`
2. **`deleteDebt` Supabase sync** — currently only updates local state
3. **Settings ghost inputs** — phone, timezone, language fields render but submit nothing
4. **ESLint setup** — `@typescript-eslint` plugin with `no-explicit-any`, `no-unused-vars`
5. **TypeScript strict mode** — enable `"strict": true` in tsconfig and fix resulting errors
6. **Mobile app** — React Native / Expo. DeviceGuard can be removed once parity is reached.
