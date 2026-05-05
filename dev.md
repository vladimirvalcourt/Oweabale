# Oweable — Frontend Developer Guide

> Last updated: 2026-05-04  
> For: Next.js App Router frontend development  
> Stack: Next.js 16, React 19, Tailwind CSS v4, Supabase, shadcn/ui  
> Design System: Revolut-inspired dark-first UI (see `docs/` for audit history)

---

## 0. Development Log

### 2026-05-04 — Phase 1: Dark Theme + AppShell + Dashboard + Settings

**What was done:**

- Switched to dark-first Revolut-inspired theme (`globals.css`)
- Installed shadcn/ui primitives (Button, Card, Badge, Input, Label, Sheet, Tabs, Avatar, Separator, ScrollArea, Progress, Skeleton, Switch, Select)
- Built `AppShell` — collapsible sidebar (14 nav items), header with search/avatar dropdown, mobile drawer
- Rebuilt Dashboard — stats cards (Total Due, Overdue, Due Soon, Safe Spend), Quick Add strip, Priority Queue (auto-sorted by urgency), Goals preview, smart empty states
- Rebuilt Settings — tabbed layout with 7 sub-pages; Profile page uses shadcn components with working Supabase upsert save
- Created `src/lib/formatters.ts` — `formatMoney`, `formatDate`, `daysUntil`, `dueLabel`
- Added `components.json` for shadcn/ui registry

**Files changed/created:**

- `src/app/globals.css` — dark-first theme tokens
- `src/app/layout.tsx` — dark body class
- `src/app/(app)/layout.tsx` — AppShell wrapper
- `src/app/(app)/dashboard/page.tsx` — full dashboard with real data
- `src/app/(app)/settings/layout.tsx` — settings shell
- `src/app/(app)/settings/profile/page.tsx` — shadcn profile form
- `src/app/(app)/settings/*/page.tsx` — 6 placeholder settings pages
- `src/components/dashboard/AppShell.tsx` — sidebar + header component
- `src/components/ui/*.tsx` — 14 shadcn primitives
- `src/lib/utils.ts` — `cn()` helper
- `src/lib/formatters.ts` — formatting utilities
- `components.json` — shadcn config

### 2026-05-04 — Phase 2: Entity List Pages (Bills, Debts, Subscriptions, Goals)

**What was done:**

- Built `/bills` page — list with status badges, due labels, mark-paid/delete actions, Add Bill slide-over form (biller, amount, category, due date, frequency, auto-pay)
- Built `/debts` page — list with APR, payoff progress bar, remaining balance, min payment, mark-paid/delete, Add Debt slide-over form (name, type, balance, APR, min payment, term, due date)
- Built `/subscriptions` page — list with annual cost calculation, frequency badges, cancel/delete, Add Subscription slide-over form (name, amount, frequency, next billing)
- Built `/goals` page — card grid with progress bars, priority/type badges, quick-add buttons ($10/$50/$100), target dates, Add Goal slide-over form (name, target, current, type, priority, deadline)
- Created reusable `Table` shadcn primitive component
- All pages: server data fetch, client list with Supabase mutations, `router.refresh()` for revalidation, toast feedback

**Files changed/created:**

- `src/app/(app)/bills/page.tsx`, `BillsList.tsx`, `AddBillSheet.tsx`
- `src/app/(app)/debts/page.tsx`, `DebtsList.tsx`, `AddDebtSheet.tsx`
- `src/app/(app)/subscriptions/page.tsx`, `SubscriptionsList.tsx`, `AddSubscriptionSheet.tsx`
- `src/app/(app)/goals/page.tsx`, `GoalsList.tsx`, `AddGoalSheet.tsx`
- `src/components/ui/table.tsx`

### 2026-05-04 — Phase 3: Detail Pages + Safe Spend + Notification/Display Settings

**What was done:**

- Built detail pages for all core entities: `/bills/[id]`, `/debts/[id]`, `/subscriptions/[id]`, `/goals/[id]`, `/income/[id]`, `/assets/[id]`, `/transactions/[id]`
- Each detail page: back navigation, stat cards with entity-specific data (APR, payoff progress, annual cost, gain/loss), status badges
- Added `DeleteBillButton` client component for bill detail delete action
- Implemented Safe Spend calculation on dashboard: `(Monthly Income - Monthly Obligations) / 30`
- Added income fetch to dashboard for Safe Spend calculation
- Built notification settings page: 4 toggle switches (Email Reminders, Due Date Alerts, Goal Progress, Weekly Summary) using Switch component, saved to `profiles.metadata.notifications` JSONB
- Built display settings page: Dark/Light/System theme selector with active state + Compact mode toggle, saved to `profiles.theme` and `profiles.metadata.compactMode`

**Files changed/created:**

- `src/app/(app)/bills/[id]/page.tsx`, `DeleteBillButton.tsx`
- `src/app/(app)/debts/[id]/page.tsx`
- `src/app/(app)/subscriptions/[id]/page.tsx`
- `src/app/(app)/goals/[id]/page.tsx`
- `src/app/(app)/income/[id]/page.tsx`
- `src/app/(app)/assets/[id]/page.tsx`
- `src/app/(app)/transactions/[id]/page.tsx`
- `src/app/(app)/settings/notifications/page.tsx`
- `src/app/(app)/settings/display/page.tsx`
- `src/app/(app)/dashboard/page.tsx` — added income fetch, Safe Spend calculation

### 2026-05-04 — Phase 4: Calendar Strip + Activity Feed + Settings Pages

**What was done:**

- Added Calendar Strip to dashboard: horizontal scrollable 14-day view with day names, dates, and colored dots indicating due/overdue/upcoming obligations
- Added Recent Activity feed to dashboard: last 5 transactions with income/expense indicators, category badges, amounts with +/- signs
- Built Security settings page: password change form with validation (min 6 chars, match confirmation) via `supabase.auth.updateUser()`, danger zone with account deletion warning
- Built Billing settings page: plan display (Free/Pro/Premium) with current plan badge, trial status, 3-tier pricing cards with feature lists
- Built Support settings page: contact form (subject + message textarea) with `feedback` table insert, email support card

**Files changed/created:**

- `src/app/(app)/dashboard/page.tsx` — added calendar strip, recent activity, transaction fetch
- `src/app/(app)/settings/security/page.tsx`
- `src/app/(app)/settings/billing/page.tsx`
- `src/app/(app)/settings/support/page.tsx`

### 2026-05-04 — Phase 5: Plaid Accounts + Avatar Upload

**What was done:**

- Built Accounts settings page: fetches `plaid_items` and `plaid_accounts` from Supabase, displays connected banks with sync status (recent/never synced), account list with type badges, masked account numbers, balances, disconnect action with confirmation
- Connect bank button shows info toast that Plaid Link backend setup is needed
- Added avatar upload to profile: clickable avatar with hover overlay, hidden file input accepting images up to 5MB, uploads to Supabase Storage `avatars` bucket (`user_id/timestamp.ext`), persists public URL to `profiles.avatar_url` immediately, shows loading spinner during upload

**Files changed/created:**

- `src/app/(app)/settings/accounts/page.tsx`
- `src/app/(app)/settings/profile/page.tsx` — added avatar upload state, file input ref, upload handler, clickable avatar with hover overlay

**Open items / next steps:**

### 2026-05-04 — Phase 6: Entity Detail Edit Forms

**What was done:**

- Built `EditBillSheet` — pre-filled slide-over form with all bill fields (biller, amount, category, due date, frequency, auto-pay, status), updates Supabase on save
- Built `EditDebtSheet` — pre-filled form with name, type, balance, APR, min payment, term, due date, status, original amount
- Built `EditSubscriptionSheet` — pre-filled form with name, amount, frequency, next billing date, status (active/cancelled)
- Built `EditGoalSheet` — pre-filled form with name, target/current amounts, type, priority, deadline, status (active/complete)
- Wired Edit buttons into all detail page headers: `/bills/[id]`, `/debts/[id]`, `/subscriptions/[id]`, `/goals/[id]`
- All edit forms: validation, toast feedback, `router.refresh()` for revalidation, loading states

**Files changed/created:**

- `src/app/(app)/bills/[id]/EditBillSheet.tsx`
- `src/app/(app)/debts/[id]/EditDebtSheet.tsx`
- `src/app/(app)/subscriptions/[id]/EditSubscriptionSheet.tsx`
- `src/app/(app)/goals/[id]/EditGoalSheet.tsx`
- `src/app/(app)/bills/[id]/page.tsx` — added EditBillSheet
- `src/app/(app)/debts/[id]/page.tsx` — added EditDebtSheet
- `src/app/(app)/subscriptions/[id]/page.tsx` — added EditSubscriptionSheet
- `src/app/(app)/goals/[id]/page.tsx` — added EditGoalSheet

**Open items / next steps:**

### 2026-05-04 — Phase 7: Search/Filter on Entity List Pages

**What was done:**

- Added client-side search/filter to `BillsList`, `DebtsList`, `SubscriptionsList`, `GoalsList`
- Each list: search input with Search icon, case-insensitive filtering by name/title, category, type, frequency
- Results count shown when query is active ("X of Y results")
- Empty search state: "No [entity] match \"[query]\"" with dashed border container
- Used `React.useMemo` for efficient filtering, avoided ternary JSX issues by using separate `&&` conditional blocks

**Files changed/created:**

- `src/app/(app)/bills/BillsList.tsx`
- `src/app/(app)/debts/DebtsList.tsx`
- `src/app/(app)/subscriptions/SubscriptionsList.tsx`
- `src/app/(app)/goals/GoalsList.tsx`

**Open items / next steps:**

### 2026-05-04 — Phase 8: Sorting + Analytics on Dashboard

**What was done:**

- Added client-side sorting to all entity list pages: `BillsList`, `DebtsList`, `SubscriptionsList`, `GoalsList`
- Sortable by: due date (soonest/latest), amount (low-high/high-low), name (A-Z/Z-A); goals also by target amount and deadline
- Sort dropdown (native `<select>`) styled with Tailwind tokens, placed next to search input in a flex row
- Sort logic uses `useMemo` to chain filter then sort efficiently
- Added analytics section to dashboard: spending by category horizontal bar chart (custom CSS/SVG `BarChart` component), donut chart (`DonutChart` component), net worth snapshot card
- Analytics calculations: spending grouped by transaction category, net worth = assets - debts, monthly obligations vs income
- New `src/components/charts/BarChart.tsx` with `BarChart` and `DonutChart` components — no external charting library dependency

**Files changed/created:**

- `src/app/(app)/bills/BillsList.tsx` — sort state + dropdown
- `src/app/(app)/debts/DebtsList.tsx` — sort state + dropdown
- `src/app/(app)/subscriptions/SubscriptionsList.tsx` — sort state + dropdown
- `src/app/(app)/goals/GoalsList.tsx` — sort state + dropdown
- `src/components/charts/BarChart.tsx`
- `src/app/(app)/dashboard/page.tsx` — assets fetch, analytics section, charts

**Open items / next steps:**

### 2026-05-04 — Phase 9: Onboarding Flow for New Users

**What was done:**

- Converted `/` root page to async server component that checks auth + onboarding status
  - Authenticated + not onboarded → redirect to `/onboarding`
  - Authenticated + onboarded → redirect to `/dashboard`
  - Not authenticated → render `LandingPage` (client component extracted to `src/app/LandingPage.tsx`)
- Added onboarding redirect guard to `/dashboard` server component (redirects to `/onboarding` if `has_completed_onboarding` is false)
- Built `/onboarding/page.tsx` as a 4-step client wizard:
  1. **Welcome** — value proposition + CTA
  2. **Add first bill** — inline form (biller, amount, frequency, due date) with Skip option
  3. **Add income** — inline form (source, amount, frequency) with Skip option
  4. **Done** — completion screen, marks `has_completed_onboarding = true` in Supabase, redirects to dashboard
- Step progress bar with numbered circles and connector lines
- All forms use Tailwind design tokens, no inline styles
- `has_completed_onboarding` field already existed on `profiles` table

**Files changed/created:**

- `src/app/page.tsx` — converted to server component with redirect logic
- `src/app/LandingPage.tsx` — extracted client marketing page
- `src/app/onboarding/page.tsx` — new multi-step onboarding wizard
- `src/app/(app)/dashboard/page.tsx` — added `has_completed_onboarding` to select + redirect guard

**Open items / next steps:**

### 2026-05-04 — Phase 10: Export/Download Functionality

**What was done:**

- Created reusable `toCsv` and `downloadTextFile` utilities in `src/lib/export.ts`
- `toCsv`: converts array of objects to CSV with proper escaping (quotes, commas, newlines)
- `downloadTextFile`: creates a Blob and triggers a browser download via hidden anchor element
- Added export button (icon-only with title tooltip) next to sort dropdown on all entity list pages:
  - `BillsList` — exports biller, category, amount, due date, frequency, status
  - `DebtsList` — exports name, type, APR, remaining, min payment, due date, status
  - `SubscriptionsList` — exports name, amount, frequency, next billing date, status
  - `GoalsList` — exports name, type, target, current, deadline
- Filename includes entity type and current date (e.g. `bills-2026-05-04.csv`)
- Exports respect current filter + sort state (exports `filtered` array)
- Toast confirmation on successful download

**Files changed/created:**

- `src/lib/export.ts` — new CSV + download utilities
- `src/app/(app)/bills/BillsList.tsx` — export button + handler
- `src/app/(app)/debts/DebtsList.tsx` — export button + handler
- `src/app/(app)/subscriptions/SubscriptionsList.tsx` — export button + handler
- `src/app/(app)/goals/GoalsList.tsx` — export button + handler

**Open items / next steps:**

### 2026-05-04 — Phase 11: Recurring Item Automation

**What was done:**

- Created Supabase Edge Function `auto-process-recurring` at `supabase/functions/auto-process-recurring/index.ts`
- Runs daily (intended for Vercel cron or pg_cron trigger via POST with Bearer token auth)
- For each **bill** that is `active` with `due_date <= today`:
  - Marks status as `paid` (or bumps due date for next cycle)
  - Calculates next due date based on frequency (`daily`, `weekly`, `biweekly`, `monthly`, `quarterly`, `yearly`)
  - Creates a `transactions` record: amount, description, category, date, source_type = 'bill'
- For each **subscription** that is `active` with `next_billing_date <= today`:
  - Bumps `next_billing_date` by frequency days
  - Creates a `transactions` record: amount, description, category, date, source_type = 'subscription'
- Uses `SUPABASE_SERVICE_ROLE_KEY` for privileged DB access
- Protected by `AUTO_PROCESS_CRON_SECRET` env var for cron trigger authorization

**Files changed/created:**

- `supabase/functions/auto-process-recurring/index.ts`

**Open items / next steps:**

- Implement real Plaid Link flow (backend token exchange)
- Add 2FA / MFA setup to security settings
- Add session management to security settings

---

### 2026-05-04 — Phase 13: 2FA/MFA + Session Management in Security Settings

**What was done:**

- Rebuilt `/settings/security` page with four sections:
  1. **Change password** (existing)
  2. **Two-factor authentication** — Supabase TOTP MFA integration:
     - `mfa.enroll({ factorType: 'totp' })` to start enrollment
     - Displays QR code as `<img>` from `totp.qr_code` data URI
     - User enters 6-digit code, calls `mfa.challenge()` then `mfa.verify()`
     - Lists enabled factors with option to remove (`mfa.unenroll`)
     - Gracefully handles projects where MFA is not configured
  3. **Active sessions** — client-side session display:
     - Shows current session with device info from `navigator.userAgent`
     - "Sign out all other sessions" button using `supabase.auth.signOut({ scope: 'others' })`
     - Includes note that full multi-session listing requires server-side service role
  4. **Danger zone** — account deletion placeholder (unchanged)
- All UI uses existing Tailwind design tokens and shadcn components

**Files changed/created:**

- `src/app/(app)/settings/security/page.tsx` — fully rewritten with MFA + sessions

---

### 2026-05-04 — Phase 12: Data Import (CSV Upload)

**What was done:**

- Created lightweight CSV parser `src/lib/csv.ts`:
  - `parseCsv()` — handles quoted fields, escaped quotes (`""`), commas inside quotes, and line breaks
  - `normalizeTransactionRow()` — maps common column names (`Date`, `Amount`, `Description`, `Category`) to transaction shape
  - Supports ISO, US (`MM/DD/YYYY`), and EU (`DD-MM-YYYY`) date formats
  - Amount parsing strips `$` and `,` characters
- Built `/import` page at `src/app/(app)/import/page.tsx`:
  - Drag-and-drop or click-to-upload CSV file zone
  - Parses CSV client-side and displays preview table (first 20 rows)
  - Shows count of valid vs total parsed rows
  - Warning banner about duplicates not being detected automatically
  - One-click "Import" button inserts all valid rows into `transactions` table via Supabase
  - Toast confirmation on success
  - Example CSV format shown below upload area for user guidance
- Added "Import" link to AppShell sidebar navigation

**Files changed/created:**

- `src/lib/csv.ts` — CSV parser + transaction normalizer
- `src/app/(app)/import/page.tsx` — full import UI
- `src/components/dashboard/AppShell.tsx` — added Import nav item

---

### 2026-05-04 — Phase 14: Plaid Link Integration

**What was done:**

- Installed `react-plaid-link@^3.6.0` dependency
- Updated `/settings/accounts` page (`src/app/(app)/settings/accounts/page.tsx`) to use real Plaid Link flow:
  - On "Connect bank" click, calls `supabase.functions.invoke('plaid-link-token')` to fetch a link token from the existing edge function
  - Sets the link token into `react-plaid-link` via `usePlaidLink({ token, onSuccess, onExit })`
  - When `ready && linkToken`, opens the Plaid Link modal automatically via `useEffect`
  - `onSuccess` callback receives `public_token` and `metadata`, then calls `supabase.functions.invoke('plaid-exchange')` to exchange for an `access_token`
  - After successful exchange, refreshes connected banks list via `loadData()`
  - Handles errors gracefully: paid-access gating, disabled plaid, missing tokens, and general failures all show toast notifications
- Disconnect flow remains unchanged (deletes from `plaid_items` and refreshes UI)

**Files changed/created:**

- `src/app/(app)/settings/accounts/page.tsx` — wired up `react-plaid-link` + Supabase edge functions

---

## 1. Quick Start

```bash
npm install          # install deps
npm run dev          # start dev server on localhost:3000
```

Required env vars in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 2. Tech Stack & Versions

| Layer     | Technology   | Version   | Notes                                                       |
| --------- | ------------ | --------- | ----------------------------------------------------------- |
| Framework | Next.js      | 16.2.4    | App Router only. No Pages Router.                           |
| React     | React        | 19.2.4    | Server Components by default.                               |
| Styling   | Tailwind CSS | v4        | CSS-first config in `globals.css`. No `tailwind.config.js`. |
| UI Lib    | shadcn/ui    | latest    | Components live in `src/components/ui/`. Install via CLI.   |
| Icons     | Lucide React | ^0.400+   | Import from `lucide-react`.                                 |
| Auth      | Supabase SSR | ^0.10     | `@supabase/ssr` for cookies.                                |
| Client    | Supabase JS  | ^2.105    | Browser client for client components.                       |
| Toast     | Sonner       | ^2.0      | `import { toast } from 'sonner'`                            |
| Font      | Inter        | next/font | Variable font loaded in `layout.tsx`.                       |

**Critical:** This is Next.js 16. Read docs in `node_modules/next/dist/docs/` before assuming standard Next.js patterns. Some APIs differ from training data.

---

## 3. Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (app)/                  # Protected route group
│   │   ├── layout.tsx          # App shell: sidebar + header + auth check
│   │   ├── dashboard/
│   │   │   └── page.tsx        # Dashboard hub
│   │   ├── bills/
│   │   │   ├── page.tsx        # Bills list
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Bill detail
│   │   ├── debts/
│   │   ├── subscriptions/
│   │   ├── transactions/
│   │   ├── goals/
│   │   ├── budgets/
│   │   ├── income/
│   │   ├── assets/
│   │   ├── citations/
│   │   ├── deductions/
│   │   ├── mileage/
│   │   ├── invoices/
│   │   ├── credit/
│   │   ├── plaid/              # Bank sync management
│   │   └── settings/           # Settings route group
│   │       ├── layout.tsx      # Settings tab shell
│   │       ├── profile/
│   │       │   └── page.tsx    # Profile editing
│   │       ├── billing/
│   │       ├── notifications/
│   │       ├── accounts/
│   │       ├── display/
│   │       ├── security/
│   │       └── support/
│   ├── auth/
│   │   ├── page.tsx            # Sign-in (Google OAuth)
│   │   └── callback/
│   │       └── route.ts        # OAuth callback handler
│   ├── layout.tsx              # Root layout (font, Toaster, html)
│   ├── page.tsx                # Marketing landing page (public)
│   └── globals.css             # Tailwind v4 theme tokens
├── components/
│   ├── ui/                     # shadcn/ui components (auto-generated)
│   ├── dashboard/              # Dashboard-specific components
│   ├── forms/                  # Reusable form drawers
│   └── SignOutButton.tsx       # Client sign-out
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Async server Supabase client
│   │   └── middleware.ts       # Session refresh middleware
│   └── utils.ts                # cn() helper, formatters
└── hooks/
    └── use-user.ts             # Reusable user data hook
```

---

## 4. Route Groups Explained

| Group         | Pattern             | Purpose                                                                 |
| ------------- | ------------------- | ----------------------------------------------------------------------- |
| `(app)`       | `src/app/(app)/...` | All authenticated pages. Shares `layout.tsx` with sidebar + auth guard. |
| `(marketing)` | none yet            | Landing page sits at root level, public.                                |

The `(app)` layout **server-checks auth** and redirects to `/auth` if no user. Every page inside inherits this protection.

---

## 5. Auth Patterns

### 5.1 Server Components (default)

Fetch user + data on the server. Redirect if unauthenticated.

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SomePage() {
  const supabase = await createClient(); // ← MUST await
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: items } = await supabase
    .from("bills")
    .select("*")
    .eq("user_id", user.id);

  return <div>{/* render */}</div>;
}
```

**Rule:** Always `await createClient()`. The server client is async because of Next.js 16 cookies API.

### 5.2 Client Components

Use `'use client'` + browser client for interactivity.

```tsx
"use client";

import { createClient } from "@/lib/supabase/client";

export function SomeClientComponent() {
  const supabase = createClient(); // ← synchronous

  const handleAction = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // ... do work
  };
}
```

### 5.3 Proxy

`src/proxy.ts` refreshes the Supabase session on every request. Do not remove it.

---

## 6. Design System Tokens

All styling uses **CSS custom properties** defined in `src/app/globals.css`:

```css
@theme inline {
  --font-sans: var(--font-inter);

  /* Surface */
  --color-surface: #000000; /* page background */
  --color-surface-raised: #0f1011; /* cards, panels */
  --color-surface-elevated: #191a1b; /* hover states */
  --color-surface-border: rgba(255, 255, 255, 0.08); /* borders */

  /* Content */
  --color-content: #f7f8f8; /* primary text */
  --color-content-secondary: #d0d6e0; /* body text */
  --color-content-tertiary: #8a8f98; /* labels, hints */

  /* Accent (Cobalt Violet) */
  --color-accent: #494fdf;
  --color-accent-hover: #5a62f0;
  --color-accent-muted: rgba(73, 79, 223, 0.15);

  /* CTA */
  --color-cta: #f7f8f8; /* primary button bg (white on dark) */
  --color-cta-hover: #d0d6e0;
  --color-cta-text: #000000;

  /* Status */
  --color-danger: #ef4444;
  --color-danger-bg: rgba(239, 68, 68, 0.1);
  --color-danger-border: rgba(239, 68, 68, 0.4);
  --color-warning: #f59e0b;
  --color-warning-bg: rgba(245, 158, 11, 0.1);
  --color-warning-border: rgba(245, 158, 11, 0.4);
  --color-success: #22c55e;
  --color-success-bg: rgba(34, 197, 94, 0.1);
  --color-success-border: rgba(34, 197, 94, 0.4);
  --color-info: #3b82f6;
  --color-info-bg: rgba(59, 130, 246, 0.1);
  --color-info-border: rgba(59, 130, 246, 0.4);

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-panel: 22px;
  --radius-full: 9999px;
}
```

Use them in JSX with Tailwind's CSS var syntax:

```tsx
<div className="bg-(--color-surface) text-(--color-content)" />
<div className="border border-(--color-surface-border)" />
```

**Dark mode:** Dark-first design. No light mode toggle yet — add `@media (prefers-color-scheme: light)` if needed.

### Status Colors (semantic)

| Status             | Token                                                                                  | Use                             |
| ------------------ | -------------------------------------------------------------------------------------- | ------------------------------- |
| Danger / Overdue   | `text-(--color-danger)`, `bg-(--color-danger-bg)`, `border-(--color-danger-border)`    | Critical alerts, overdue items  |
| Warning / Due Soon | `text-(--color-warning)`, `bg-(--color-warning-bg)`, `border-(--color-warning-border)` | Warnings, approaching deadlines |
| Success / Paid     | `text-(--color-success)`, `bg-(--color-success-bg)`                                    | Completed, on-track states      |
| Info / Neutral     | `text-(--color-info)`, `bg-(--color-info-bg)`                                          | General info, neutral badges    |

---

## 7. Component Conventions

### 7.1 Server vs Client

| Type             | File                  | When to use                                                   |
| ---------------- | --------------------- | ------------------------------------------------------------- |
| Server Component | No directive          | Data fetching, static layout, auth checks. Default.           |
| Client Component | `'use client'` at top | Event handlers, `useState`, `useEffect`, browser APIs, forms. |

**Pattern:** Fetch data in server component, pass to client child for interactivity:

```tsx
// page.tsx — server
export default async function BillsPage() {
  const bills = await fetchBills(); // server fetch
  return <BillsList data={bills} />; // client component for interactivity
}

// BillsList.tsx — client
("use client");
export function BillsList({ data }: { data: Bill[] }) {
  const [filter, setFilter] = useState("");
  // ... interactive filtering
}
```

### 7.2 shadcn/ui Components

Install new components via the shadcn CLI:

```bash
npx shadcn add button card input label select dialog sheet table badge tabs avatar dropdown-menu switch separator tooltip calendar popover progress skeleton scroll-area collapsible
```

Components install to `src/components/ui/`. They are **unstyled primitives** — wrap them in app-specific components for consistency.

**Example wrapper pattern:**

```tsx
// src/components/ui/AppButton.tsx
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return <Button className={cn("min-h-11", className)} {...props} />;
}
```

### 7.3 Lucide Icons

```tsx
import {
  Plus,
  Settings,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
```

Always use `aria-hidden` on decorative icons. Add `aria-label` or visible text for icon-only buttons.

---

## 8. Adding a New Entity Page

Let's say you need to add a **Tax Documents** page:

### Step 1: Create the route

```bash
mkdir -p src/app/(app)/tax-documents
```

### Step 2: Create the page (server component for data)

```tsx
// src/app/(app)/tax-documents/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TaxDocumentsList } from "@/components/tax-documents/TaxDocumentsList";

export default async function TaxDocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: docs } = await supabase
    .from("tax_documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <TaxDocumentsList documents={docs ?? []} />;
}
```

### Step 3: Create the client list component

```tsx
// src/components/tax-documents/TaxDocumentsList.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface TaxDoc {
  id: string;
  name: string;
  year: number;
  status: "pending" | "filed" | "received";
}

export function TaxDocumentsList({ documents }: { documents: TaxDoc[] }) {
  const [items, setItems] = useState(documents);
  const supabase = createClient();

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("tax_documents")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    setItems(items.filter((i) => i.id !== id));
    toast.success("Document deleted");
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-(--color-content)">
        Tax Documents
      </h1>
      {/* render list */}
    </div>
  );
}
```

### Step 4: Add to sidebar navigation

Edit `src/app/(app)/layout.tsx` and add the nav link in the sidebar map.

### Step 5: Add database table + RLS (separate migration)

Create a Supabase migration in `supabase/migrations/` or use the SQL Editor.

---

## 9. Database Tables (Frontend Awareness)

These tables exist. You do not create them from the frontend, but you query them.

| Table                 | What it holds              | Key fields                                                                                                          |
| --------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `profiles`            | User profile data          | `id`, `first_name`, `last_name`, `email`, `avatar`, `timezone`, `plan`, `trial_ends_at`, `has_completed_onboarding` |
| `bills`               | Recurring bills            | `user_id`, `biller`, `amount`, `category`, `due_date`, `frequency`, `status`, `auto_pay`                            |
| `debts`               | Loans & credit cards       | `user_id`, `name`, `type`, `apr`, `remaining`, `min_payment`, `payment_due_date`                                    |
| `subscriptions`       | Recurring subscriptions    | `user_id`, `name`, `amount`, `frequency`, `next_billing_date`, `status`                                             |
| `transactions`        | All financial transactions | `user_id`, `name`, `category`, `date`, `amount`, `type`                                                             |
| `assets`              | Owned assets & accounts    | `user_id`, `name`, `value`, `type`, `purchase_price`                                                                |
| `incomes`             | Income sources             | `user_id`, `name`, `amount`, `frequency`, `next_date`                                                               |
| `goals`               | Savings goals              | `user_id`, `name`, `target_amount`, `current_amount`, `deadline`, `priority`                                        |
| `budgets`             | Budget categories          | `user_id`, `category`, `amount`, `period`                                                                           |
| `categories`          | Custom categories          | `user_id`, `name`, `type`, `color`, `icon`                                                                          |
| `citations`           | Tickets, fines, tolls      | `user_id`, `type`, `amount`, `penalty_fee`, `date`, `status`                                                        |
| `deductions`          | Tax deductions             | `user_id`, `name`, `category`, `amount`, `date`                                                                     |
| `mileage_log`         | Business mileage           | `user_id`, `trip_date`, `miles`, `purpose`, `deduction_amount`                                                      |
| `freelance_entries`   | Freelance income           | `user_id`, `client`, `amount`, `date`, `is_vaulted`                                                                 |
| `client_invoices`     | Invoices sent to clients   | `user_id`, `client_name`, `amount`, `due_date`, `status`                                                            |
| `credit_fixes`        | Credit disputes            | `user_id`, `item_type`, `description`, `status`                                                                     |
| `plaid_items`         | Plaid connections          | `user_id`, `institution_name`, `last_sync_at`                                                                       |
| `plaid_accounts`      | Synced bank accounts       | `user_id`, `name`, `account_type`, `mask`                                                                           |
| `net_worth_snapshots` | Historical net worth       | `user_id`, `date`, `net_worth`, `assets`, `debts`                                                                   |

**All tables have RLS enabled.** Every query must include `.eq('user_id', user.id)` or it returns zero rows.

---

## 10. Common Patterns

### 10.1 Formatting Money

```tsx
function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// Usage
<p className="font-mono tabular-nums">{formatMoney(1250.5)}</p>;
```

Always use `font-mono tabular-nums` for amounts so columns align.

### 10.2 Loading State

```tsx
import { Loader2 } from "lucide-react";

function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-5 w-5 animate-spin text-(--color-content-tertiary)" />
    </div>
  );
}
```

### 10.3 Empty State

```tsx
function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-12 text-center">
      <p className="text-sm font-medium text-(--color-content-secondary)">
        {message}
      </p>
      {action}
    </div>
  );
}
```

### 10.4 Form Input Pattern

```tsx
<div>
  <label className="mb-1.5 block text-sm font-medium text-(--color-content)">
    Label <span className="text-rose-500">*</span>
  </label>
  <input
    type="text"
    value={value}
    onChange={(e) => setValue(e.target.value)}
    className="w-full rounded-md border border-(--color-surface-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-content) placeholder:text-(--color-content-tertiary) focus:outline-none focus:ring-2 focus:ring-(--color-content-secondary)"
  />
</div>
```

Use shadcn `<Input />` instead when available — it applies these styles automatically.

### 10.5 Slide-over Drawer (Sheet)

Use shadcn `<Sheet>` from the `sheet` component for add/edit forms:

```tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

<Sheet>
  <SheetTrigger asChild>
    <button>Add Item</button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Add New Bill</SheetTitle>
    </SheetHeader>
    {/* form */}
  </SheetContent>
</Sheet>;
```

---

## 11. Important Gotchas

1. **Server client is async:** `const supabase = await createClient()` — never forget `await` in server components.

2. **No `useState` in server components:** If you need state, extract to a `'use client'` child.

3. **RLS requires user_id filter:** Every Supabase `.from()` query must include `.eq('user_id', user.id)`.

4. **Do not import server client into client components:** Only use `@/lib/supabase/client` in `'use client'` files.

5. **Tailwind v4 has no `tailwind.config.js`:** Theme tokens live in `globals.css` as CSS variables inside `@theme inline`.

6. **Next.js 16 ≠ Next.js 14:** Check `node_modules/next/dist/docs/` if an API seems off. Async cookies, new cache behaviors, etc.

7. **Sonner toasts only work client-side:** Cannot call `toast.success()` from a server component. Use them in client components and event handlers.

8. **Supabase `auth.getUser()` in server components:** This is the source of truth for auth. `getSession()` can be stale.

---

## 12. Building & Deploying

```bash
npm run build     # Production build
npm run lint      # ESLint check
```

Deployment target: **Vercel** (configured in `vercel.json`).

---

## 13. Adding shadcn/ui Components

```bash
npx shadcn add <component-name>
```

This creates files in `src/components/ui/`. Commit them. Do not edit shadcn base components for app-specific styling — wrap them instead (see 7.2).

---

## 14. File Naming Conventions

| Type                    | Pattern          | Example                        |
| ----------------------- | ---------------- | ------------------------------ |
| Page                    | `page.tsx`       | `src/app/(app)/bills/page.tsx` |
| Layout                  | `layout.tsx`     | `src/app/(app)/layout.tsx`     |
| API Route               | `route.ts`       | `src/app/api/webhook/route.ts` |
| Client Component        | `PascalCase.tsx` | `BillsList.tsx`                |
| Server Component helper | `kebab-case.ts`  | `fetch-bills.ts`               |
| Hook                    | `use-*.ts`       | `use-user.ts`                  |
| Utility                 | `kebab-case.ts`  | `format-money.ts`              |

---

## 15. Contact & Resources

- **Supabase Project:** `horlyscpspctvceddcup` (us-west-2)
- **Design Reference:** Revolut-inspired dark UI (see `docs/` for audits)
- **shadcn/ui Registry:** Install via CLI or browse at https://ui.shadcn.com
- **Lucide Icons:** Browse at https://lucide.dev
