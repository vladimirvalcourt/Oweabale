# Defensive Coding Audit - April 30, 2026

## Overview
Comprehensive scan and fix of potential runtime crashes caused by undefined/null data across the application. This audit focused on array operations (map, filter, reduce) that could fail when receiving malformed or missing data from the store or API responses.

## Root Cause
The Dashboard crash occurred when clicking "Linked bank activity" because the `summarizeBankTransactions` function didn't validate transaction data before processing. When Plaid sync returned incomplete or malformed transactions (missing dates, null amounts, etc.), array methods would throw errors.

## Files Fixed

### 1. `/src/pages/Dashboard.tsx`
**Issue:** Transaction summarization crashed with invalid data
**Fixes:**
- Added `Array.isArray()` check for transactions parameter
- Enhanced filter to validate `date` exists and `amount` is a number
- Added fallback values (`|| 0`) for amount calculations
- Added array type check before mapping `recentBankTransactions`
- Added fallback text for missing transaction names

**Impact:** Prevents Dashboard crashes during initial bank connection or when Plaid returns incomplete data

---

### 2. `/src/pages/Reports.tsx`
**Issues:** Multiple array operations without defensive checks
**Fixes:**

#### Net Worth Projection (Lines 107-138)
- Added safe array checks for `assets` and `debts`
- Added fallback values for all numeric properties (`value || 0`, `remaining || 0`, etc.)

#### Debt Progress Calculation (Lines 140-148)
- Added `Array.isArray()` check for debts
- Added null-safe property access with defaults
- Protected against division by zero in percentage calculation
- Added fallback name for unknown debts

#### Filtered Transactions (Lines 72-75)
- Wrapped Date parsing in try-catch block
- Added array type validation
- Returns false for invalid dates instead of crashing

#### Monthly Data Aggregation (Lines 89-104)
- Added safe transactions array check
- Added date existence check before `startsWith()` call
- Added fallback values for amount in reduce operations

#### Category Data (Lines 78-86)
- Added fallback values for amount and category
- Defaults to 'Uncategorized' for missing categories

**Impact:** Reports page now handles missing or malformed financial data gracefully

---

### 3. `/src/pages/Obligations.tsx`
**Issues:** Bill, debt, and citation mapping without null checks
**Fixes:**

#### All Obligations Construction (Lines 184-222)
- Added safe array checks for `bills`, `debts`, and `citations`
- Added fallback values for all properties:
  - Bills: `biller || 'Unknown Biller'`, `amount || 0`, due date fallback
  - Debts: `name || 'Unknown Debt'`, `remaining || 0`, `type || 'Debt'`
  - Citations: `type || 'Citation'`, `jurisdiction || 'Unknown'`, `daysLeft || 0`, `amount || 0`

#### Financial Calculations (Lines 249-251)
- Added safe debts array for active principal calculation
- Added fallback values in reduce operations

**Impact:** Obligations page handles incomplete bill/debt/citation data without crashes

---

### 4. `/src/pages/Transactions.tsx`
**Issue:** Category extraction crashed with undefined transactions
**Fixes:**
- Added `Array.isArray()` check for transactions
- Added fallback category value ('Uncategorized') for missing categories

**Impact:** Transaction filtering and categorization works even with incomplete data

---

### 5. `/src/pages/Savings.tsx`
**Issues:** Plaid account and transaction filtering without validation
**Fixes:**

#### Tracked Plaid IDs (Lines 36-39)
- Added safe array check for plaidAccounts
- Added fallback for plaidAccountId (`|| ''`)

#### Savings Transactions (Lines 41-43)
- Added safe array check for transactions
- Maintains existing plaidAccountId filter logic

**Impact:** Savings page handles missing Plaid accounts or transactions gracefully

---

### 6. `/src/pages/Subscriptions.tsx`
**Issues:** Multiple subscription operations without defensive coding
**Fixes:**

#### Safe Array Initialization (Lines 145-147)
- Created `safeSubscriptions` and `safeTransactions` constants
- Used throughout the component for all array operations

#### Active Subscriptions & Monthly Cost (Lines 149-152)
- Uses safe arrays
- Added fallback for amount (`|| 0`)

#### Subscription Candidates Detection (Lines 154-157)
- Uses safe arrays
- Added fallback for subscription name (`|| ''`)

#### Unused Subscriptions & Price Hikes (Lines 159-181)
- All filters now use safe arrays
- Maintains existing logic with null-safe property access

#### Subscription Rendering (Line 539)
- Changed from `subscriptions.map` to `safeSubscriptions.map`

**Impact:** Subscriptions page handles missing or incomplete subscription data

---

## Common Patterns Applied

### 1. Array Type Validation
```typescript
// Before
data.map(item => ...)

// After
const safeData = Array.isArray(data) ? data : [];
safeData.map(item => ...)
```

### 2. Property Access with Fallbacks
```typescript
// Before
item.amount

// After
item.amount || 0
item.name || 'Default Name'
item.date || new Date().toISOString().split('T')[0]
```

### 3. Safe Reduce Operations
```typescript
// Before
items.reduce((sum, item) => sum + item.value, 0)

// After
items.reduce((sum, item) => sum + (item.value || 0), 0)
```

### 4. Division Protection
```typescript
// Before
Math.round((paid / total) * 100)

// After
total > 0 ? Math.round((paid / total) * 100) : 0
```

### 5. Date Parsing Safety
```typescript
// Before
new Date(item.date) >= cutoffDate

// After
try {
  return new Date(item.date) >= cutoffDate;
} catch {
  return false;
}
```

---

## Testing Results
✅ Build completes successfully with no errors
✅ All TypeScript compilation passes
✅ No runtime errors in development mode
✅ PWA service worker generated correctly

---

## Risk Mitigation

### What This Prevents
1. **Dashboard crashes** when Plaid sync returns incomplete transaction data
2. **Reports page failures** when assets/debts arrays are undefined
3. **Obligations page errors** when bills/debts/citations have missing fields
4. **Transaction page crashes** when filtering by category with undefined data
5. **Savings page errors** when Plaid accounts aren't loaded yet
6. **Subscriptions page failures** when subscription data is incomplete

### Edge Cases Handled
- Empty arrays from API
- Null/undefined object properties
- Missing required fields (dates, amounts, names)
- Malformed data from third-party integrations (Plaid)
- Race conditions during data loading
- Stale cache with outdated schema

---

## Recommendations

### Immediate Actions
1. ✅ Deploy these fixes to production
2. Monitor error logs for any remaining crashes
3. Test Plaid integration flow end-to-end

### Future Improvements
1. **Add TypeScript strict null checks** in tsconfig.json
2. **Implement Zod/Joi validation** for API responses
3. **Add unit tests** for edge cases with null/undefined data
4. **Create reusable utility functions** for safe array operations
5. **Add Sentry/error tracking** to catch remaining edge cases
6. **Implement React Error Boundaries** at page level for graceful degradation

### Code Review Checklist
When reviewing future code, check for:
- [ ] Array operations have type guards (`Array.isArray()`)
- [ ] Property access uses optional chaining or fallbacks
- [ ] Numeric operations handle NaN/undefined
- [ ] Date parsing is wrapped in try-catch
- [ ] Division operations check for zero denominators
- [ ] Map/filter/reduce callbacks handle null items

---

## Related Documentation
- [Dashboard Crash Fix](./DASHBOARD_CRASH_FIX.md) - if created
- [Plaid Integration Guide](./PLAID_INTEGRATION.md)
- [Error Handling Best Practices](./ERROR_HANDLING.md)

---

**Audit Date:** April 30, 2026  
**Auditor:** AI Assistant  
**Status:** ✅ Complete  
**Build Status:** ✅ Passing
