# Plaid Bank Sync Dashboard Population Audit

## Issue Summary
When users sync their bank account through Plaid, the synced accounts and transactions don't immediately populate on the dashboard. Users must manually refresh or navigate away and back to see their data.

## Root Cause Analysis

### 1. Race Condition in Data Fetching
**Location**: `src/store/slices/plaidSlice.ts` (lines 29-84)

After a successful Plaid connection:
1. `onConnected()` triggers `fetchData()` immediately
2. `onInitialSync()` calls the Edge Function to sync transactions
3. **Problem**: The Edge Function writes to Supabase asynchronously, but `fetchData()` may read stale data before writes complete

**Existing Mitigation**: There's polling logic (lines 40-63) that attempts to wait for data changes:
```typescript
const previousTransactionCount = get().transactions.length;
while (attempts < maxAttempts) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  await get().fetchData();
  const newTransactionCount = get().transactions.length;
  // ... check if data changed
}
```

**Issue**: This only checks transaction count, not plaidAccounts or other synced data.

### 2. Missing Auto-Refresh After Sync
**Location**: `src/hooks/usePlaidFlow.ts` (lines 70-105)

The `onSuccess` callback:
```typescript
await onConnected();  // fetchData()
setStage('syncing');
const synced = await onInitialSync();  // syncPlaidTransactions()
```

After sync completes successfully, there's no second `fetchData()` call to ensure the latest data is loaded.

### 3. Dashboard Doesn't Subscribe to Bank Connection Changes
**Location**: `src/pages/Dashboard.tsx`

The dashboard reads from Zustand store but doesn't trigger re-fetch when:
- `bankConnected` changes from false → true
- `plaidAccounts` array populates
- `transactions` array updates after sync

### 4. RLS Policy Complexity
**Location**: `supabase/migrations/20260429033754_fix_transactions_rls_for_plaid_and_non_household_users.sql`

The transactions table has complex RLS policies that might cause edge cases:
- Non-household users should see their own transactions
- Household members should see household transactions
- Plaid-synced transactions with `household_id = NULL` owned by `user_id`

If RLS policies are misconfigured, queries might return empty results even though data exists.

## Data Flow Diagram

```
User clicks "Connect Bank"
    ↓
Plaid Link opens → User authenticates
    ↓
Public token received
    ↓
Edge Function: plaid-exchange
    - Exchanges public_token for access_token
    - Creates plaid_items row
    - Updates profile.plaid_linked_at
    ↓
Client: onConnected() called
    ↓
Zustand: fetchData() triggered
    - Queries profiles, bills, debts, transactions, plaid_accounts, etc.
    - Sets bankConnected = true if profile.plaid_linked_at exists
    ↓
Client: onInitialSync() called
    ↓
Edge Function: plaid-sync
    - Calls /transactions/sync API
    - Writes transactions to DB (async)
    - Calls /accounts/get API  
    - Writes plaid_accounts to DB (async)
    - Updates plaid_items.last_sync_at
    - Updates profiles.plaid_last_sync_at
    ↓
Client: Polling loop (5 attempts × 500ms)
    - fetchData() called repeatedly
    - Checks if transaction count changed
    ↓
User sees dashboard
    ❌ PROBLEM: Data might still be stale if sync hasn't completed
```

## Recommended Fixes

### Fix 1: Enhanced Polling with Comprehensive State Check
**File**: `src/store/slices/plaidSlice.ts`

```typescript
syncPlaidTransactions: async (opts?: { quiet?: boolean }) => {
  const result = await invokePlaidSync();
  if ('error' in result) {
    console.error('[Plaid Sync] Error:', result.error);
    if (!opts?.quiet) toast.error(result.error);
    return false;
  }

  // Enhanced polling: check multiple state indicators
  const previousState = {
    transactionCount: get().transactions.length,
    plaidAccountCount: get().plaidAccounts.length,
    lastSyncAt: get().plaidLastSyncAt,
    relinkState: get().plaidNeedsRelink,
  };
  
  let attempts = 0;
  const maxAttempts = 8; // Increase from 5 to 8
  
  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 750)); // Increase delay
    console.log(`[Plaid Sync] Polling for updates (attempt ${attempts + 1}/${maxAttempts})...`);
    await get().fetchData();
    
    const currentState = {
      transactionCount: get().transactions.length,
      plaidAccountCount: get().plaidAccounts.length,
      lastSyncAt: get().plaidLastSyncAt,
      relinkState: get().plaidNeedsRelink,
    };
    
    const dataChanged = 
      currentState.transactionCount !== previousState.transactionCount ||
      currentState.plaidAccountCount !== previousState.plaidAccountCount ||
      currentState.lastSyncAt !== previousState.lastSyncAt ||
      currentState.relinkState !== previousState.relinkState;
    
    if (dataChanged) {
      console.log('[Plaid Sync] Data changes detected, stopping poll');
      break;
    }
    
    attempts++;
  }

  // Final fetch to ensure consistency
  await get().fetchData();
  
  // ... rest of existing code
}
```

### Fix 2: Force Refresh After Successful Sync
**File**: `src/hooks/usePlaidFlow.ts`

```typescript
const onSuccess = useCallback<PlaidLinkOnSuccess>(
  async (publicToken, metadata) => {
    setStage('exchanging');
    setErrorMessage(null);
    try {
      const exchanged = await exchangePlaidPublicToken(publicToken, metadata);
      if ('error' in exchanged) {
        throw new Error(normalizePlaidFlowErrorMessage(exchanged.error));
      }

      await onConnected();
      setStage('syncing');
      const synced = await onInitialSync();
      
      // NEW: Force another refresh after sync completes
      if (synced) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
        await onConnected(); // fetchData() again
      }
      
      if (!synced) {
        toast.error('Connection saved, but initial sync failed — try Sync now.');
        track('plaid_initial_sync_failed', { intent: activeIntent });
      } else {
        toast.success(activeIntent === 'update' ? 'Bank connection updated.' : 'Bank connected successfully.');
        track('plaid_link_success', { intent: activeIntent });
      }

      setStage('success');
    } catch (e) {
      // ... error handling
    }
  },
  [activeIntent, clearOauthQuery, onConnected, onInitialSync],
);
```

### Fix 3: Add useEffect to Monitor Bank Connection State
**File**: `src/pages/Dashboard.tsx`

```typescript
import { useEffect } from 'react';

// Inside Dashboard component
const bankConnected = useStore((state) => state.bankConnected);
const plaidAccounts = useStore((state) => state.plaidAccounts);
const syncPlaidTransactions = useStore((state) => state.syncPlaidTransactions);
const fetchData = useStore((state) => state.fetchData);

// NEW: Auto-refresh when bank connection state changes
useEffect(() => {
  if (bankConnected && plaidAccounts.length === 0) {
    // Bank just connected but no accounts yet - trigger sync
    console.log('[Dashboard] Bank connected, triggering initial sync');
    syncPlaidTransactions({ quiet: true }).then(() => {
      fetchData();
    });
  }
}, [bankConnected, plaidAccounts.length, syncPlaidTransactions, fetchData]);
```

### Fix 4: Verify RLS Policies Are Correct
**Run this SQL in Supabase SQL Editor**:

```sql
-- Check current RLS policies on transactions
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'transactions';

-- Check current RLS policies on plaid_accounts
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'plaid_accounts';

-- Verify transactions table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

-- Test query as authenticated user (replace USER_ID)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "USER_ID"}';

SELECT COUNT(*) FROM transactions WHERE user_id = auth.uid();
SELECT COUNT(*) FROM plaid_accounts WHERE user_id = auth.uid();
```

### Fix 5: Add Debug Logging to Track Data Flow
**File**: `src/store/slices/dataSyncSlice.ts`

Add logging at line 120 after fetching plaid_accounts:
```typescript
console.log('[fetchData] Plaid accounts fetched:', plaidAccountsRows?.length || 0, 'accounts');
if (plaidAccountsRows && plaidAccountsRows.length > 0) {
  console.log('[fetchData] First account:', plaidAccountsRows[0]);
}
```

Add logging after setting state at line 197:
```typescript
console.log('[fetchData] Setting plaidAccounts state:', (plaidAccountsRows || []).length, 'accounts');
```

## Testing Checklist

After implementing fixes, test these scenarios:

1. **Fresh Connection**
   - [ ] Disconnect all banks
   - [ ] Connect a new bank via Plaid
   - [ ] Verify plaidAccounts appear within 5 seconds
   - [ ] Verify transactions appear in Ledger page
   - [ ] Verify dashboard shows updated financial metrics

2. **Reconnection**
   - [ ] Use "Reconnect" button on existing bank
   - [ ] Verify data refreshes without page reload

3. **Manual Sync**
   - [ ] Click "Sync now" button
   - [ ] Verify new transactions appear
   - [ ] Verify plaid_accounts update timestamps

4. **Edge Cases**
   - [ ] Connect bank with no transaction history
   - [ ] Connect bank with 100+ transactions
   - [ ] Network interruption during sync
   - [ ] Multiple browser tabs open

5. **RLS Verification**
   - [ ] Non-household user sees only their transactions
   - [ ] Household member sees household transactions
   - [ ] Admin can see all transactions (if applicable)

## Immediate Action Items

1. **Priority 1**: Implement Fix 1 (Enhanced Polling) - Most impactful
2. **Priority 2**: Implement Fix 5 (Debug Logging) - Helps diagnose issues
3. **Priority 3**: Run Fix 4 (RLS Verification) - Rule out permission issues
4. **Priority 4**: Implement Fix 2 (Force Refresh) - Additional safety net
5. **Priority 5**: Implement Fix 3 (Dashboard useEffect) - UX improvement

## Monitoring

Add these console logs temporarily to production to monitor:
```typescript
// In plaidSlice.ts
console.log('[Plaid Sync] Previous state:', previousState);
console.log('[Plaid Sync] Current state:', currentState);
console.log('[Plaid Sync] Data changed:', dataChanged);

// In dataSyncSlice.ts
console.log('[fetchData] Transactions count:', transactions?.length);
console.log('[fetchData] Plaid accounts count:', plaidAccountsRows?.length);
console.log('[fetchData] Bank connected:', !!profile?.plaid_linked_at);
```

Remove these logs after confirming the fix works in production.
