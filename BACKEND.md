# BACKEND.md — Oweable Backend Reference

> Supabase: use project ref from `VITE_SUPABASE_URL` / Dashboard (see `.env.example`).  
> Region: set in Supabase Dashboard for your project.  
> Schema file: `src/lib/supabase_schema.sql`  
> Client: `src/lib/supabase.ts`

---

## Stack

| Layer | Technology |
|---|---|
| Database | PostgreSQL (via Supabase) |
| Auth | Supabase Auth (planned) |
| Client | `@supabase/supabase-js` v2 |
| State | Zustand store (`src/store/useStore.ts`) |
| Env | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |

---

## Current Build Mode

Auth is intentionally **not enforced** during development. The store falls back gracefully:

- **No session** → app runs on mock `initialData`, all UI works
- **Active session** → `fetchData()` hydrates state from Supabase, all mutations sync

When auth is added later, no store logic changes are needed.

---

## Tables

### `profiles`
Linked 1:1 to `auth.users`. Created on signup.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | FK → `auth.users(id)` |
| `first_name` | `TEXT` | |
| `last_name` | `TEXT` | |
| `email` | `TEXT` | Unique |
| `avatar` | `TEXT` | URL |
| `theme` | `TEXT` | Default: `'Dark'` |
| `tax_state` | `TEXT` | e.g. `'NY'` |
| `tax_rate` | `DECIMAL(5,2)` | e.g. `6.25` |
| `created_at` | `TIMESTAMPTZ` | |
| `updated_at` | `TIMESTAMPTZ` | Auto-trigger |

---

### `bills`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK → `auth.users` |
| `biller` | `TEXT` | |
| `amount` | `DECIMAL(12,2)` | |
| `category` | `TEXT` | |
| `due_date` | `DATE` | |
| `frequency` | `TEXT` | Monthly / Quarterly / Yearly |
| `status` | `TEXT` | `upcoming` \| `paid` \| `overdue` |
| `auto_pay` | `BOOLEAN` | Default: `false` |

---

### `debts`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK |
| `name` | `TEXT` | |
| `type` | `TEXT` | Credit Card / Auto Loan / Education |
| `apr` | `DECIMAL(5,2)` | Annual percentage rate |
| `remaining` | `DECIMAL(12,2)` | Current balance |
| `min_payment` | `DECIMAL(12,2)` | |
| `paid` | `DECIMAL(12,2)` | Total paid to date |
| `original_amount` | `DECIMAL(12,2)` | Optional |
| `origination_date` | `DATE` | Optional |
| `term_months` | `INTEGER` | Optional |

---

### `transactions`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK |
| `name` | `TEXT` | Merchant / description |
| `category` | `TEXT` | |
| `date` | `DATE` | |
| `amount` | `DECIMAL(12,2)` | |
| `type` | `TEXT` | `income` \| `expense` |

---

### `assets`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK |
| `name` | `TEXT` | |
| `value` | `DECIMAL(12,2)` | Current market value |
| `type` | `TEXT` | Cash / Investment / Real Estate |
| `appreciation_rate` | `DECIMAL(8,4)` | Annual decimal, e.g. `0.07` |
| `purchase_price` | `DECIMAL(12,2)` | Optional |
| `purchase_date` | `DATE` | Optional |

---

### `subscriptions`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK |
| `name` | `TEXT` | |
| `amount` | `DECIMAL(12,2)` | |
| `frequency` | `TEXT` | Monthly / Yearly |
| `next_billing_date` | `DATE` | |
| `status` | `TEXT` | `active` \| `paused` \| `cancelled` |
| `price_history` | `JSONB` | `[{ date, amount }]` array |

---

### `goals`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK |
| `name` | `TEXT` | |
| `target_amount` | `DECIMAL(12,2)` | |
| `current_amount` | `DECIMAL(12,2)` | Default: `0` |
| `deadline` | `DATE` | |
| `type` | `TEXT` | `debt` \| `savings` \| `emergency` |
| `color` | `TEXT` | Hex color code |

---

### `incomes`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK |
| `name` | `TEXT` | |
| `amount` | `DECIMAL(12,2)` | |
| `frequency` | `TEXT` | Weekly / Bi-weekly / Monthly / Yearly |
| `category` | `TEXT` | Salary / Freelance / Investments |
| `next_date` | `DATE` | Next expected deposit |
| `status` | `TEXT` | `active` \| `paused` |
| `is_tax_withheld` | `BOOLEAN` | `true` for W-2, `false` for freelance |

---

### `budgets`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK |
| `category` | `TEXT` | |
| `amount` | `DECIMAL(12,2)` | Budget cap |
| `period` | `TEXT` | `Monthly` \| `Yearly` |

---

### `categories`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK |
| `name` | `TEXT` | |
| `color` | `TEXT` | Hex |
| `type` | `TEXT` | `income` \| `expense` |

---

### `citations`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK |
| `type` | `TEXT` | SPEEDING / TOLL VIOLATION / etc. |
| `jurisdiction` | `TEXT` | |
| `days_left` | `INT` | Days until deadline |
| `amount` | `DECIMAL(12,2)` | |
| `penalty_fee` | `DECIMAL(12,2)` | Late fee if unpaid |
| `date` | `DATE` | Issued date |
| `citation_number` | `TEXT` | |
| `payment_url` | `TEXT` | |
| `status` | `TEXT` | `open` \| `resolved` |

---

### `deductions`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK |
| `name` | `TEXT` | e.g. Home Office |
| `category` | `TEXT` | Business / Transportation |
| `amount` | `DECIMAL(12,2)` | |
| `date` | `DATE` | Tax year date |

---

## Row Level Security (RLS) & Deep Security

All 12 tables have RLS **enabled**. The policy pattern uses strictly granular commands (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) ensuring full coverage. 

```sql
-- Read / Write / Delete — own rows only
CREATE POLICY "Users can manage their own [table]"
  ON [table] FOR SELECT
  USING (auth.uid() = user_id);
-- ... corresponding explicit policies for INSERT, UPDATE, DELETE with WITH CHECK
```

### Table-Level Data Validation Arrays
To prevent API bypass invalid data injection, extensive `CHECK` constraints are configured on the schema:
- `amount > 0` constraints ensuring negative budgets/balances are rejected mechanically.
- `char_length` bounding on strings.
- Immutability trigger checks preventing modification of the `auth.uid` assignment on an existing row.

### The Audit Log
An append-only `audit_log` structural table tracks DML events (`INSERT`, `UPDATE`, `DELETE`) across critical financial components. 
Triggers intercept these operations and append immutable JSON snapshots to this table out-of-band.

### Supabase Storage Vault
A dedicated storage bucket named `financial_vault` handles ingested PDF/image statements.
It enforces RLS just as rigidly: users can only upload to and read from `their_user_id/` prefixed root directories.

> The anon key used in the frontend **cannot** bypass RLS. Every query is scoped to the authenticated user automatically.

---

## Auto-Updated Timestamps

All mutable tables have an `updated_at` trigger:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Tables covered: `profiles`, `bills`, `debts`, `assets`, `subscriptions`, `goals`, `incomes`, `budgets`, `citations`.

---

## Store ↔ Supabase Mapping

The store uses camelCase; Supabase uses snake_case. The `fetchData()` function handles the mapping:

| Store field | DB column |
|---|---|
| `dueDate` | `due_date` |
| `autoPay` | `auto_pay` |
| `minPayment` | `min_payment` |
| `originalAmount` | `original_amount` |
| `originationDate` | `origination_date` |
| `termMonths` | `term_months` |
| `appreciationRate` | `appreciation_rate` |
| `purchasePrice` | `purchase_price` |
| `purchaseDate` | `purchase_date` |
| `nextBillingDate` | `next_billing_date` |
| `priceHistory` | `price_history` |
| `targetAmount` | `target_amount` |
| `currentAmount` | `current_amount` |
| `nextDate` | `next_date` |
| `isTaxWithheld` | `is_tax_withheld` |
| `penaltyFee` | `penalty_fee` |
| `daysLeft` | `days_left` |
| `citationNumber` | `citation_number` |
| `paymentUrl` | `payment_url` |

---

## Auth Plan (Future)

When ready to add auth:

1. **Create** `src/pages/Login.tsx` using `supabase.auth.signInWithPassword()`
2. **Add** an auth listener in `App.tsx`:
   ```ts
   supabase.auth.onAuthStateChange((event, session) => {
     if (session) useStore.getState().fetchData();
   });
   ```
3. **Create** a `ProtectedRoute` wrapper that redirects to `/login` if no session
4. **Add** profile auto-creation via a Supabase DB trigger on `auth.users` insert

No store logic changes needed — `fetchData()` and all mutations are already auth-aware.

---

## Environment Variables

```bash
# .env (never commit to git)
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

See `.env.example` for the template.
