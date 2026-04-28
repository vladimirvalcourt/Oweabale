# Technical Debt Register

This document tracks known technical debt items, future enhancements, and cosmetic issues that have been identified but deferred for later resolution. These items do not impact current functionality or user experience.

---

## ✅ Resolved Items

### 1. Duplicate CSS Definition: `.noise-overlay` - RESOLVED ✅
**Resolved:** April 26, 2026  
**Commit:** b2dea40  
**Action Taken:** Removed duplicate definition at lines 63-65, kept preferred version at line 328 with `background-size` property.

### 2. Unused Theme Variants - RESOLVED ✅
**Resolved:** April 26, 2026  
**Commit:** b2dea40  
**Action Taken:** Deleted all 6 unused theme variants (terminal, solar, nordic, crimson, ghost, neon) - removed 54 lines of dead CSS code.

### 3. Transaction Pagination Limit - RESOLVED ✅
**Resolved:** April 26, 2026  
**Commit:** b2dea40  
**Action Taken:** Implemented cursor-based pagination:
- Changed from hard limit of 500 to paginated fetches of 100 transactions
- Added `hasMoreTransactions` and `lastTransactionCursor` state fields
- Created `loadMoreTransactions()` method for infinite scroll
- Transactions now append when loading more pages
- Users can access unlimited transaction history

---

## Low-Priority Items (Deferred)

### 1. Duplicate CSS Definition: `.noise-overlay`

**Severity:** ⚪ Low (Cosmetic)  
**File:** `src/index.css`  
**Lines:** 63-65 and 328-331  
**Impact:** None (second definition overwrites first)  
**Priority:** Cleanup / Maintenance  

#### Description
The `.noise-overlay` class is defined twice with different SVG data URIs:

```css
/* Line 63 */
.noise-overlay {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256'...");
}

/* Line 328 - overwrites previous definition */
.noise-overlay {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180'...");
  background-size: 180px 180px;
}
```

The second definition (line 328) includes an additional `background-size` property and uses a different SVG noise pattern. The first definition is effectively dead code.

#### Recommended Fix
Consolidate into a single definition with the preferred noise pattern:

```css
/* Consolidated noise overlay */
.noise-overlay {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}
```

Add a comment explaining the choice of noise pattern if relevant to design decisions.

#### Why Deferred
- No functional impact on users
- Current behavior is correct (second definition wins)
- Low risk of confusion since both definitions serve the same purpose
- Can be addressed during next major CSS refactoring

---

### 2. Unused Theme Variants

**Severity:** ⚪ Low (Dead Code)  
**File:** `src/index.css`  
**Lines:** 454-506  
**Impact:** None (CSS only, no JavaScript references)  
**Priority:** Cleanup / Decision Required  

#### Description
Six theme variants are defined in the CSS but never activated by application logic:

- `terminal` (green-tinted)
- `solar` (amber-tinted)
- `nordic` (cyan-tinted)
- `crimson` (red-tinted)
- `ghost` (monochrome white)
- `neon` (pink-tinted)

Example:
```css
:root[data-theme="terminal"] {
  --color-brand-indigo: #10b981;
  --color-brand-violet: #34d399;
  --color-surface-base: #050607;
  /* ... */
}
```

Only the default dark theme and `theme-light` class are actively used via the theme toggle system.

#### Options for Resolution

**Option A: Remove Dead Code**
Delete all unused theme variant blocks to reduce CSS bundle size (~50 lines).

**Option B: Implement Theme Selector UI**
Build a settings panel allowing users to choose from these themes, activating them via:
```typescript
document.documentElement.setAttribute('data-theme', 'terminal');
```

**Option C: Document as Future Feature**
Keep the CSS definitions as "reserved" for potential future use, adding comments to clarify intent.

#### Why Deferred
- No user-facing impact (themes simply aren't accessible)
- Requires product decision: remove vs. implement
- If implementing, needs UI design, state management, persistence logic
- If removing, needs verification that no edge cases reference these themes

---

### 3. Transaction Pagination Limit

**Severity:** 🟢 Medium (Scalability Enhancement)  
**File:** `src/store/slices/dataSyncSlice.ts`  
**Line:** 97  
**Impact:** Potential data truncation for users with >500 transactions  
**Priority:** Enhancement / Performance Optimization  

#### Description
Transaction fetching is hardcoded to retrieve a maximum of 500 records:

```typescript
supabase.from('transactions')
  .select('*')
  .eq('user_id', resolvedUserId)
  .order('date', { ascending: false })
  .limit(500),  // Hard limit
```

This means:
- Users with extensive transaction history (>500 records) will only see the most recent 500
- Historical analysis beyond this window is impossible
- No mechanism exists to load older transactions on demand

#### Recommended Implementation

**Phase 1: Cursor-Based Pagination**
Implement infinite scroll or "Load More" button using Supabase cursor pagination:

```typescript
const PAGE_SIZE = 100;

async function fetchTransactionsPage(cursor?: string) {
  const query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', resolvedUserId)
    .order('date', { ascending: false })
    .limit(PAGE_SIZE);
  
  if (cursor) {
    query.gt('id', cursor); // Use ID as cursor for stable ordering
  }
  
  return await query;
}
```

**Phase 2: Smart Caching Strategy**
- Cache first page (most recent 100) aggressively
- Lazy-load subsequent pages on scroll/demand
- Implement stale-while-revalidate pattern for background updates

**Phase 3: Analytics-Specific Queries**
For historical charts/analytics, provide separate endpoint with date range filtering:
```typescript
supabase
  .from('transactions')
  .select('*')
  .eq('user_id', userId)
  .gte('date', startDate)
  .lte('date', endDate)
  .order('date', { ascending: true });
```

#### Why Deferred
- Most users have <500 transactions (not yet a widespread issue)
- Requires significant architectural changes:
  - Zustand store modifications for paginated state
  - UI components for pagination controls
  - Loading states and error handling
  - Backward compatibility with existing features
- Current workaround: Users can export data for full historical analysis
- Higher priority items (theme consistency, error handling) took precedence

#### Monitoring Metric
Track transaction count distribution:
```sql
SELECT 
  COUNT(*) as user_count,
  CASE 
    WHEN tx_count <= 100 THEN '0-100'
    WHEN tx_count <= 500 THEN '101-500'
    WHEN tx_count > 500 THEN '500+'
  END as transaction_range
FROM (
  SELECT user_id, COUNT(*) as tx_count
  FROM transactions
  GROUP BY user_id
) subquery
GROUP BY transaction_range
ORDER BY transaction_range;
```

If >5% of active users exceed 500 transactions, escalate priority.

---

## Summary

| Item | Severity | Effort | User Impact | Status |
|------|----------|--------|-------------|--------|
| Duplicate `.noise-overlay` | ⚪ Low | 5 min | None | ✅ Resolved |
| Unused theme variants | ⚪ Low | 10 min | None | ✅ Resolved |
| Transaction pagination | 🟢 Medium | 1-2 weeks | Scalability | ✅ Resolved |

**All items resolved in commit b2dea40 on April 26, 2026**

## Review Cadence

Revisit this register quarterly or when:
- CSS bundle size becomes a concern (audit unused styles)
- User feedback indicates missing historical data
- Product roadmap includes theme customization feature
- Transaction volume metrics show >5% of users affected

---

**Last Updated:** April 26, 2026  
**Reviewed By:** AI Audit System  
**Next Review:** July 26, 2026
