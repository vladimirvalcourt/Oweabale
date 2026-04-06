# Oweable — Financial Command Center

Ultra-premium personal finance dashboard for debt elimination, tax defense, and wealth tracking. Dark, brutalist, deterministic — no AI slop, just hard math.

---

## Quick Start

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
npm run lint      # TypeScript type check (tsc --noEmit)
```

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | React 19 + Vite 6 |
| Routing | React Router DOM v7 |
| State | Zustand v5 |
| Database | Supabase (PostgreSQL + Auth) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Animations | Motion (Framer Motion v12) |
| Notifications | Sonner |
| Icons | Lucide React |
| PDF Parsing | pdfjs-dist v5 (npm, NOT CDN) |
| OCR | Tesseract.js v7 |
| UI Primitives | Headless UI v2 |

---

## Actual Folder Structure

```
/src
  App.tsx                     # Route definitions
  main.tsx                    # Entry point
  index.css                   # Global styles + Tailwind theme tokens

  /pages                      # One file per route
    Dashboard.tsx             # /dashboard — main command center
    Income.tsx                # /income
    Freelance.tsx             # /freelance — gig income + tax shield
    Taxes.tsx                 # /taxes — quarterly estimates + deductions
    Obligations.tsx           # /bills — bills, debts, citations
    NetWorth.tsx              # /net-worth
    Transactions.tsx          # /transactions
    Ingestion.tsx             # /inbox — document scan + review queue
    Settings.tsx              # /settings
    Goals.tsx                 # /goals
    Subscriptions.tsx         # /subscriptions
    Budgets.tsx               # /budgets
    Calendar.tsx              # /calendar
    Categories.tsx            # /categories
    Reports.tsx               # /reports
    Landing.tsx               # / (public)
    Pricing.tsx               # /pricing (public)
    Onboarding.tsx            # /onboarding
    Privacy.tsx               # /privacy
    Terms.tsx                 # /terms
    Security.tsx              # /security

  /components
    Layout.tsx                # App shell: sidebar, header, search, QuickAdd
    QuickAddModal.tsx         # Global quick-entry modal (transaction/bill/income)
    DeviceGuard.tsx           # Blocks <768px viewports
    CollapsibleModule.tsx     # Shared collapsible card wrapper
    BrandLogo.tsx             # Auto-generates brand initials/logo
    BankConnection.tsx        # Plaid link integration
    /ui
      TactileIcon.tsx         # Animated icon components
      Card.tsx                # Base card primitive

  /features
    /dashboard
      /components
        NetWorthCard.tsx      # Extracted dashboard widget

  /store
    useStore.ts               # Single Zustand store — all state + actions

  /lib
    finance.ts                # Pure financial math (amortization, projections, routing)
    supabase.ts               # Supabase client init + getProfile helper
    utils.ts                  # cn() className utility
    supabase_schema.sql       # Full DB schema reference
    /migrations
      001_add_financial_depth.sql

  /env
    .env                      # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

---

## Environment Variables

Create `.env` in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Key Conventions

See `ARCHITECTURE.md` for full engineering rules. Quick summary:

- **All state lives in `useStore.ts`** — no local state for server data
- **Always destructure from `useStore()`** — never call `useStore.getState()` inside render or dependency arrays
- **Always show a toast** on user actions — no silent returns
- **PDF parsing uses `pdfjs-dist` npm package** — never `window.pdfjsLib` from CDN
- **Validate before storing** — check `isNaN`, `isFinite`, and non-empty strings before calling any store action
- **Mobile blocked by design** — `DeviceGuard` enforces ≥768px. Do not remove.
