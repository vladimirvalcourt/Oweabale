import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { applyCategorizationRules, type RuleRow } from './categorization.ts';
import { plaidPost } from './plaid_client.ts';

const MAX_PAGES = 30;

interface PlaidTx {
  transaction_id: string;
  account_id: string;
  amount: number;
  date?: string;
  authorized_date?: string;
  name?: string;
  merchant_name?: string | null;
  personal_finance_category?: { primary?: string; detailed?: string } | null;
}

interface SyncPage {
  added: PlaidTx[];
  modified: PlaidTx[];
  removed: { transaction_id: string }[];
  next_cursor: string;
  has_more: boolean;
}

function mapPlaidRow(tx: PlaidTx, userId: string, rules: RuleRow[]) {
  const nameRaw = (tx.merchant_name || tx.name || 'Transaction').trim();
  const name = nameRaw.slice(0, 500);
  const date = (tx.date || tx.authorized_date || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const raw = Number(tx.amount);
  const type = raw >= 0 ? 'expense' : 'income';
  const amount = Math.abs(raw);
  const pfc = tx.personal_finance_category;
  const defaultCat = pfc?.detailed || pfc?.primary || null;
  const ruleCat = applyCategorizationRules(name, rules);
  const category = ruleCat ?? defaultCat;

  return {
    user_id: userId,
    name,
    category,
    date,
    amount,
    type,
    source: 'plaid' as const,
    plaid_transaction_id: tx.transaction_id,
    plaid_account_id: tx.account_id,
  };
}

async function loadRules(supabase: SupabaseClient, userId: string): Promise<RuleRow[]> {
  const { data, error } = await supabase
    .from('categorization_rules')
    .select('match_type, match_value, category, priority, created_at')
    .eq('user_id', userId)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RuleRow[];
}

async function markItemError(
  supabase: SupabaseClient,
  itemRowId: string,
  userId: string,
  message: string,
  loginRequired: boolean,
) {
  const now = new Date().toISOString();
  await supabase
    .from('plaid_items')
    .update({
      last_sync_error: message.slice(0, 2000),
      item_login_required: loginRequired,
      updated_at: now,
    })
    .eq('id', itemRowId);

  await supabase
    .from('profiles')
    .update({
      plaid_needs_relink: loginRequired,
      updated_at: now,
    })
    .eq('id', userId);
}

export async function runSyncForPlaidItem(
  supabase: SupabaseClient,
  item: {
    id: string;
    user_id: string;
    item_id: string;
    access_token: string;
    transactions_cursor: string | null;
  },
): Promise<{ ok: boolean; product_not_ready?: boolean; error?: string }> {
  const rules = await loadRules(supabase, item.user_id);
  let cursor: string | null | undefined = item.transactions_cursor;
  let lastNextCursor = cursor;

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await plaidPost<SyncPage>('/transactions/sync', {
        access_token: item.access_token,
        cursor: cursor || undefined,
        options: {
          include_personal_finance_category: true,
        },
      });

      const added = res.added ?? [];
      const modified = res.modified ?? [];
      const removed = res.removed ?? [];

      const upsertRows = [...added, ...modified].map((tx) => mapPlaidRow(tx, item.user_id, rules));
      if (upsertRows.length > 0) {
        const { error: upErr } = await supabase.from('transactions').upsert(upsertRows, {
          onConflict: 'user_id,plaid_transaction_id',
        });
        if (upErr) throw upErr;
      }

      if (removed.length > 0) {
        const ids = removed.map((r) => r.transaction_id).filter(Boolean);
        if (ids.length > 0) {
          const { error: delErr } = await supabase
            .from('transactions')
            .delete()
            .eq('user_id', item.user_id)
            .eq('source', 'plaid')
            .in('plaid_transaction_id', ids);
          if (delErr) throw delErr;
        }
      }

      lastNextCursor = res.next_cursor;
      cursor = res.has_more ? res.next_cursor : null;
      if (!res.has_more) break;
    }

    const now = new Date().toISOString();
    await supabase
      .from('plaid_items')
      .update({
        transactions_cursor: lastNextCursor ?? null,
        last_sync_at: now,
        last_sync_error: null,
        item_login_required: false,
        updated_at: now,
      })
      .eq('id', item.id);

    await supabase
      .from('profiles')
      .update({
        plaid_last_sync_at: now,
        plaid_needs_relink: false,
        updated_at: now,
      })
      .eq('id', item.user_id);

    return { ok: true };
  } catch (e) {
    const err = e as Error & { plaidCode?: string };
    const code = err.plaidCode ?? '';

    // Plaid hasn't finished loading transaction history yet — not a real error.
    // Webhooks (INITIAL_UPDATE / HISTORICAL_UPDATE) will trigger sync once ready.
    if (code === 'PRODUCT_NOT_READY') {
      return { ok: true, product_not_ready: true };
    }

    const loginRequired =
      code === 'ITEM_LOGIN_REQUIRED' ||
      code === 'PENDING_EXPIRATION' ||
      /login required|re-authenticate/i.test(err.message);
    const msg = err.message || 'Sync failed';
    await markItemError(supabase, item.id, item.user_id, msg, loginRequired);
    return { ok: false, error: msg };
  }
}

export async function runSyncForItemId(
  supabase: SupabaseClient,
  plaidItemId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: row, error } = await supabase
    .from('plaid_items')
    .select('id, user_id, item_id, access_token, transactions_cursor')
    .eq('item_id', plaidItemId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!row) return { ok: false, error: 'Unknown item_id' };

  return runSyncForPlaidItem(supabase, row as typeof row & { transactions_cursor: string | null });
}

export async function runSyncStaleItems(
  supabase: SupabaseClient,
  opts: { maxItems: number; olderThanHours: number },
): Promise<{ processed: number; errors: number }> {
  const cutoff = new Date(Date.now() - opts.olderThanHours * 3600 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from('plaid_items')
    .select('id, user_id, item_id, access_token, transactions_cursor')
    .eq('item_login_required', false)
    .or(`last_sync_at.is.null,last_sync_at.lt."${cutoff}"`)
    .order('last_sync_at', { ascending: true, nullsFirst: true })
    .limit(opts.maxItems);

  if (error) throw error;

  let processed = 0;
  let errors = 0;
  for (const row of rows ?? []) {
    const r = await runSyncForPlaidItem(
      supabase,
      row as typeof row & { transactions_cursor: string | null },
    );
    processed++;
    if (!r.ok) errors++;
  }
  return { processed, errors };
}

export async function runSyncAllForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ processed: number; errors: number; product_not_ready: boolean }> {
  const { data: rows, error } = await supabase
    .from('plaid_items')
    .select('id, user_id, item_id, access_token, transactions_cursor')
    .eq('user_id', userId);

  if (error) throw error;

  let processed = 0;
  let errors = 0;
  let product_not_ready = false;
  for (const row of rows ?? []) {
    const r = await runSyncForPlaidItem(
      supabase,
      row as typeof row & { transactions_cursor: string | null },
    );
    processed++;
    if (!r.ok) errors++;
    if (r.product_not_ready) product_not_ready = true;
  }
  return { processed, errors, product_not_ready };
}
