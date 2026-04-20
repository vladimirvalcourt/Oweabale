# COMPONENTS.md — Oweable Component Reference

> Shared components → `src/components/`  
> UI primitives → `src/components/ui/`  
> Page components → `src/pages/`

---

## Shared Components

---

### `Layout`
**File:** `src/components/Layout.tsx`  
**Used in:** `src/App.tsx` — wraps all authenticated routes via `<Outlet />`

### `ErrorBoundary`
**File:** `src/components/ErrorBoundary.tsx`  
**Used in:** `src/App.tsx` — wraps React routing boundaries
Catches render-time crashes and prevents total white-screening of the SPA, dropping down to a recovery UI instead.

### `PageSkeleton`
**File:** `src/components/PageSkeleton.tsx`  
**Used in:** `src/App.tsx` and Page components
Contains `<AppLoader>`, `<DashboardSkeleton>`, and `<ListSkeleton>`, replacing text-based loading spinners with structural wireframes conforming to the UI.

The main app shell. Renders the collapsible sidebar, sticky top bar, animated page content area, and footer. Mounts `QuickAddModal` globally.

**Key features:**
- **Sidebar** — collapses to 80px (icon-only) or expands to 256px; hidden on mobile behind a backdrop overlay
- **Nav groups** — collapsible sections with spring animation (Overview / Activity / Planning)
- **Active route** — indigo left-border indicator + `bg-surface-highlight`
- **Badge** — `pendingIngestions.length` count shown on "Review Inbox" nav item
- **Global search** — desktop inline dropdown + mobile full-screen overlay. Searches bills, debts, transactions, subscriptions, goals. Max 8 results.
- **Theme engine** — reads `user.theme` from store, applies `data-theme` on `:root` or `theme-light` class
- **Page transitions** — `AnimatePresence` with opacity + y + scale on route change
- **Profile dropdown** — Headless UI `<Menu>`, avatar initials fallback

**Nav structure:**

| Group | Items |
|---|---|
| Overview | Dashboard, Income, Freelance / gigs, Regular Bills, Review Inbox |
| Activity | Subscriptions, Reports, Transactions |
| Planning | Net Worth, Savings, Budgets, Calendar, Goals, Taxes |

**Store dependencies:**  
`bills`, `debts`, `transactions`, `subscriptions`, `goals`, `user`, `isQuickAddOpen`, `openQuickAdd`, `closeQuickAdd`, `pendingIngestions`

---

### `CollapsibleModule`
**File:** `src/components/CollapsibleModule.tsx`  
**Used in:** Nearly every page as the standard section wrapper

```tsx
import { CollapsibleModule } from '../components/CollapsibleModule';

<CollapsibleModule title="Debt Tracker" icon={CreditCard}>
  {/* section content */}
</CollapsibleModule>

// With summary visible when collapsed
<CollapsibleModule
  title="Monthly Bills"
  icon={Receipt}
  defaultOpen={false}
  extraHeader={<span className="text-green-400">$2,150</span>}
>
  {/* ... */}
</CollapsibleModule>
```

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | required | Header label |
| `icon` | `React.ElementType` | — | Lucide icon left of title |
| `children` | `React.ReactNode` | required | Section body |
| `defaultOpen` | `boolean` | `true` | Whether expanded on mount |
| `extraHeader` | `React.ReactNode` | — | Right-aligned node, only shown when collapsed |
| `className` | `string` | `""` | Extra classes on outer wrapper |

**Behavior:**
- Clicking the header toggles open/closed
- Spring animation (`damping: 25, stiffness: 200`) on height change
- `extraHeader` is hidden when open — use it to show a summary stat
- Content always wrapped in `p-6` padding

---

### `QuickAddModal`
**File:** `src/components/QuickAddModal.tsx`  
**Used in:** Mounted once in `Layout`, controlled via store

Global entry modal for adding transactions, bills/debts, and income. Triggered from the "Quick Add" button in the top bar.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `isOpen` | `boolean` | Bound to `useStore().isQuickAddOpen` |
| `onClose` | `() => void` | Calls `useStore().closeQuickAdd()` |

**Triggering from any component:**
```ts
const { openQuickAdd } = useStore();

openQuickAdd('transaction')  // Transaction tab
openQuickAdd('obligation')   // Bill/Debt tab
openQuickAdd('income')       // Income tab
```

**Tabs & store actions:**

| Tab | Type field | Store action | Required fields |
|---|---|---|---|
| `transaction` | — | `addTransaction()` | amount, description, category, date |
| `obligation` | `bill` | `addBill()` | amount, vendor, due date, category |
| `obligation` | `debt` | `addDebt()` | amount, vendor |
| `income` | — | `addIncome()` | amount, source, date |

**Speed Input (NLP parser):**  
The top textarea parses shorthand input in real-time:
- Detects `$amount` via regex
- Keywords → auto-selects tab: `spent/bought` → transaction, `bill/owe/due` → obligation, `earned/income` → income  
- Date keywords: `today`, `yesterday`, `tomorrow`
- Example: typing `WholeFoods 120 today` fills description + amount + date

**Notes:**
- All form state resets on modal open
- `BrandLogo` renders inline as user types merchant name
- New debts default to 19.99% APR, min payment = `max($25, 2% of balance)`
- Quick-add incomes always set `isTaxWithheld: false`

---

### `BrandLogo`
**File:** `src/components/BrandLogo.tsx`  
**Used in:** `QuickAddModal` (inline), and can be used anywhere a merchant logo is needed

Fetches brand logos from Clearbit CDN and renders them with graceful fallback.

```tsx
import { BrandLogo } from '../components/BrandLogo';

<BrandLogo name="Netflix" size="md" />
<BrandLogo name="Verizon" size="sm" fallbackIcon={<PhoneIcon />} />
```

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | required | Merchant/brand name |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | `w-6` / `w-8` / `w-10` |
| `className` | `string` | — | Extra wrapper classes |
| `fallbackIcon` | `React.ReactNode` | `<Building2>` | Shown when logo fails or domain unknown |

**Domain resolution:**
- Guesses: `Netflix` → `netflix.com`
- Hard-coded overrides for: Apple, Chase, Netflix, Starbucks, Amazon, Verizon, Spotify, Uber
- `Landlord` and other generics → no domain → fallback immediately

**Behavior:**
- Animated skeleton pulse while image loads
- Smooth blur-to-sharp transition on load
- Deterministic HSL color glow derived from brand name hash
- Falls back to `fallbackIcon` silently on any error

---

### `DeviceGuard`
**File:** `src/components/DeviceGuard.tsx`  
**Used in:** `src/App.tsx` — wraps the `<Layout />` route element

Blocks access to the app on screens narrower than 768px.

```tsx
// In App.tsx — do not change this structure
<Route element={<DeviceGuard><Layout /></DeviceGuard>}>
  <Route path="dashboard" element={<Dashboard />} />
  ...
</Route>
```

**Props:**

| Prop | Type | Description |
|---|---|---|
| `children` | `React.ReactNode` | App shell rendered on desktop |

**Behavior:**
- Listens to `window.resize` and updates on every change
- `< 768px` → renders a full-screen "Interface Restricted" message
- `≥ 768px` → renders `children` as a transparent fragment
- **Do not remove or bypass.** Mobile native app is in active development.

---

### `BankConnection`
**File:** `src/components/BankConnection.tsx`  
**Used in:** `src/pages/Settings.tsx` — "Data Sources" section

No props. Self-contained.

**State:** Reads `bankConnected` from store.

**Behavior:**
- Uses `react-plaid-link` with a mock token (no real Plaid integration yet)
- Clicking the button simulates a 1.5s secure handshake delay
- On success: calls `connectBank()` which seeds 5 transactions + 2 bills into local store state
- Shows "Chase Checking (...4429) ACTIVE" status after connection

> ⚠️ **Known gap:** Bank connection data is not persisted to Supabase. See `ARCHITECTURE.md → Known Gaps`.

---

## UI Primitives (`src/components/ui/`)

---

### `TactileIcon`
**File:** `src/components/ui/TactileIcon.tsx`  
**Used in:** `Layout.tsx` (nav items, notification bell)

A high-end icon wrapper that adds a 3D tilt effect and scale on hover using `motion/react`.

```tsx
import { TactileIcon } from '../components/ui/TactileIcon';

<TactileIcon icon={Bell} size={16} />
<TactileIcon icon={Home} size={16} active={isActive} />
```

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `LucideIcon` | required | Any Lucide icon component |
| `size` | `number` | `18` | Icon pixel size |
| `active` | `boolean` | `false` | Uses `brand-violet` when true, otherwise `content-tertiary` |
| `className` | `string` | — | Classes on the motion wrapper |
| `iconClassName` | `string` | — | Classes directly on the `<Icon>` element |

**Behavior:**
- Tracks mouse position within the element bounds
- Applies spring-based `rotateX` / `rotateY` (max ±15°) for a 3D tilt
- `whileHover`: scales to 1.1×
- `whileTap`: scales to 0.95×
- Renders a violet glow behind the icon on hover

---

### `MorphingMenuIcon`
**File:** `src/components/ui/TactileIcon.tsx` (exported from same file)  
**Used in:** `Layout.tsx` (mobile hamburger, sidebar collapse button)

An animated SVG that morphs between a 3-line hamburger menu and an X close icon.

```tsx
import { MorphingMenuIcon } from '../components/ui/TactileIcon';

<MorphingMenuIcon isOpen={sidebarOpen} className="text-content-primary" />
```

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | required | Controls the morph state |
| `className` | `string` | — | Extra classes on the SVG |
| `color` | `string` | `"currentColor"` | Stroke color override |

**Behavior:**
- `isOpen: false` → 3-line hamburger
- `isOpen: true` → X icon
- Middle line fades out; top and bottom lines rotate to form the ×
- Spring transition: `stiffness: 260, damping: 20`

---

### `Card` / `CardHeader` / `CardContent`
**File:** `src/components/ui/Card.tsx`  
**Used in:** Available but not yet widely used — `CollapsibleModule` is the preferred wrapper

A simple card primitive for dashboard widgets.

```tsx
import { Card, CardHeader, CardContent } from '../components/ui/Card';

<Card>
  <CardHeader title="Monthly Summary" action={<button>View all</button>} />
  <CardContent>
    {/* content */}
  </CardContent>
</Card>
```

**`Card` props:**

| Prop | Type | Description |
|---|---|---|
| `children` | `React.ReactNode` | Card content |
| `className` | `string` | Extra classes |

**`CardHeader` props:**

| Prop | Type | Description |
|---|---|---|
| `title` | `string` | Bold heading |
| `action` | `React.ReactNode` | Optional right-aligned button/link |
| `className` | `string` | Extra classes |

**`CardContent` props:**

| Prop | Type | Description |
|---|---|---|
| `children` | `React.ReactNode` | Body content |
| `className` | `string` | Extra classes (default padding: `p-6`) |

> **Note:** In most pages, `CollapsibleModule` is used instead of `Card`. Use `Card` for non-collapsible, flat widgets.

---

## Pages (`src/pages/`)

| File | Route | Description |
|---|---|---|
| `Landing.tsx` | `/` | Public marketing homepage |
| `Onboarding.tsx` | `/onboarding` | Setup protocol (no auth required) |
| `Pricing.tsx` | `/pricing` | Plan tier comparison |
| `Privacy.tsx` | `/privacy` | Privacy policy |
| `Terms.tsx` | `/terms` | Terms of service |
| `Security.tsx` | `/security` | Security overview |
| `Dashboard.tsx` | `/dashboard` | Main financial command center with all widgets |
| `Income.tsx` | `/income` | Income sources, deposits, cash flow |
| `Freelance.tsx` | `/freelance` | Freelance income, deductions, PDF parsing |
| `Obligations.tsx` | `/bills` | Bills, debts, citations (Debt Detonator, Spending Pulse) |
| `Ingestion.tsx` | `/ingestion` | Review Inbox — scanned documents and pending entries |
| `Transactions.tsx` | `/transactions` | Transaction ledger with filtering |
| `NetWorth.tsx` | `/net-worth` | Assets, liabilities, net worth projection charts |
| `Budgets.tsx` | `/budgets` | Budget categories vs actual spend |
| `Calendar.tsx` | `/calendar` | Bill due date and income calendar |
| `Goals.tsx` | `/goals` | Savings and debt payoff goals |
| `Taxes.tsx` | `/taxes` | Tax deductions, freelance write-offs |
| `Categories.tsx` | `/categories` | Transaction category management |
| `Subscriptions.tsx` | `/subscriptions` | Subscription tracker with price history |
| `Reports.tsx` | `/reports` | Spending/income analytics charts |
| `Settings.tsx` | `/settings` | Profile, themes, data sources, account |

---

## Utilities (`src/lib/`)

| File | Purpose |
|---|---|
| `supabase.ts` | Supabase JS client + `getProfile()` helper |
| `finance.ts` | Pure financial math — amortization, cash flow, surplus routing, net worth projection |
| `utils.ts` | `cn()` — Tailwind class merging via `clsx` + `tailwind-merge` |
| `supabase_schema.sql` | Canonical DB schema (source of truth) |

---

## Third-Party Libraries

| Library | Version | Purpose |
|---|---|---|
| `react-router-dom` | v6 | Client-side routing |
| `zustand` | latest | Global state management |
| `@supabase/supabase-js` | v2 | Supabase client |
| `motion/react` | latest | Animations (`AnimatePresence`, springs, transforms) |
| `@headlessui/react` | latest | Accessible `Menu`, `Dialog`, `Transition` |
| `lucide-react` | latest | Icon library |
| `sonner` | latest | Toast notifications |
| `recharts` | latest | Charts (used in NetWorth, Reports, Dashboard) |
| `pdfjs-dist` | v5 | PDF parsing (Freelance, Ingestion pages) |
| `react-plaid-link` | latest | Bank connection (mocked) |
| `clsx` + `tailwind-merge` | latest | Conditional class merging via `cn()` |
