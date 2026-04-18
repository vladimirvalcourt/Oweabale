create table if not exists public.categorization_exclusions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('transaction', 'merchant')),
  transaction_id uuid null references public.transactions(id) on delete cascade,
  merchant_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categorization_exclusions_target_check check (
    (scope = 'transaction' and transaction_id is not null)
    or
    (scope = 'merchant' and merchant_name is not null and length(trim(merchant_name)) > 0)
  )
);

create unique index if not exists categorization_exclusions_user_tx_unique
  on public.categorization_exclusions (user_id, transaction_id)
  where scope = 'transaction';

create unique index if not exists categorization_exclusions_user_merchant_unique
  on public.categorization_exclusions (user_id, lower(merchant_name))
  where scope = 'merchant';

create index if not exists categorization_exclusions_user_idx
  on public.categorization_exclusions (user_id);

alter table public.categorization_exclusions enable row level security;

drop policy if exists "Users can read own categorization exclusions" on public.categorization_exclusions;
create policy "Users can read own categorization exclusions"
  on public.categorization_exclusions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own categorization exclusions" on public.categorization_exclusions;
create policy "Users can insert own categorization exclusions"
  on public.categorization_exclusions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own categorization exclusions" on public.categorization_exclusions;
create policy "Users can update own categorization exclusions"
  on public.categorization_exclusions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own categorization exclusions" on public.categorization_exclusions;
create policy "Users can delete own categorization exclusions"
  on public.categorization_exclusions
  for delete
  using (auth.uid() = user_id);
