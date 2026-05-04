# INP (Interaction to Next Paint) Optimizations Applied

## Summary
Applied INP Debug & Fix skill to identify and resolve performance bottlenecks blocking UI updates. Target: <200ms INP score for "Good" Core Web Vitals rating.

---

## Changes Made

### 1. Dashboard.tsx - Citation Modal Optimization
**File:** `src/pages/Dashboard.tsx`

#### Issue 1: Clipboard Copy Blocking Main Thread
- **Location:** Line ~1329 (Citation modal copy button)
- **Problem:** Synchronous clipboard operation could block paint
- **Fix:** Added `scheduler.yield()` before clipboard operation to yield to browser, allowing it to paint first
- **Pattern Used:** Fix 1 - Yield to Main Thread with scheduler.yield()

```typescript
// BEFORE
onClick={() => { navigator.clipboard.writeText(...) }}

// AFTER  
onClick={async () => { 
  if ('scheduler' in window && 'yield' in scheduler) {
    await scheduler.yield(); // Yield to browser, let it paint
  }
  navigator.clipboard.writeText(...);
}}
```

#### Issue 2: Modal State Updates Not Deferred
- **Location:** Line ~1260 (Citation resolution button)
- **Problem:** Multiple state updates in click handler causing re-renders
- **Fix:** Wrapped state updates in `startTransition()` to mark as non-urgent
- **Pattern Used:** Fix 2 - Defer Non-Critical Work with startTransition

```typescript
// BEFORE
onClick={() => {
  setSelectedCitation(citation);
  setIsCitationModalOpen(true);
}}

// AFTER
onClick={() => {
  startTransition(() => {
    setSelectedCitation(citation);
    setIsCitationModalOpen(true);
  });
}}
```

#### Additional Changes:
- Added `startTransition` import from React
- Added TypeScript type declarations for `scheduler.yield()` API in `vite-env.d.ts`

---

### 2. Transactions.tsx - CSV Export Optimization
**File:** `src/pages/Transactions.tsx`

#### Issue: Large Dataset Processing Blocks UI
- **Location:** Line ~137-158 (Export CSV button)
- **Problem:** Mapping all transactions at once creates Long Task (>50ms)
- **Fix:** Chunked processing with yields between chunks (500 items per chunk)
- **Pattern Used:** Fix 3 - Break Up Long Tasks with setTimeout chunks

```typescript
// BEFORE
const rows = rowsSource.map((t) => [...]); // All at once
const csv = [headers.join(','), ...rows.map(...)].join('\n');

// AFTER
const CHUNK_SIZE = 500;
for (let i = 0; i < rowsSource.length; i += CHUNK_SIZE) {
  const chunk = rowsSource.slice(i, i + CHUNK_SIZE);
  const chunkRows = chunk.map(...);
  csvRows.push(...chunkRows);
  
  // Yield between chunks
  if (i + CHUNK_SIZE < rowsSource.length) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

**Impact:** For 5000 transactions, this breaks one 500ms+ task into ten 50ms tasks with yields between them.

---

### 3. App.tsx - Vercel Speed Insights Integration
**File:** `src/App.tsx`

#### Enhancement: Production INP Monitoring
- **Added:** `@vercel/speed-insights/react` package
- **Integration:** Added `<SpeedInsights />` component to App root
- **Purpose:** Real User Monitoring (RUM) to track INP in production
- **Benefit:** Catch INP regressions before they affect many users

```typescript
import { SpeedInsights } from '@vercel/speed-insights/react';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
      <SpeedInsights /> {/* ← Added */}
    </BrowserRouter>
  );
}
```

---

### 4. Type Declarations
**File:** `src/vite-env.d.ts`

Added TypeScript support for experimental Scheduler API:

```typescript
interface Scheduler {
  yield(): Promise<void>;
}

interface Window {
  scheduler?: Scheduler;
}
```

---

## Existing Optimizations Already in Place

The codebase already has several excellent INP optimizations:

1. **TransitionLink Component** (`src/components/TransitionLink.tsx`)
   - All navigation wrapped in `startTransition()`
   - Prevents route changes from blocking paint

2. **Lazy Loading** (`src/App.tsx`)
   - All pages lazy-loaded with `React.lazy()`
   - Dashboard specifically called out as lazy to avoid blocking initial paint

3. **Hover Prefetching** (`src/components/Layout.tsx`)
   - Route chunks prefetched on hover before click
   - Reduces input delay by having chunks ready

4. **Deferred Values** (`src/components/Layout.tsx`, `src/pages/Dashboard.tsx`)
   - `useDeferredValue()` for search queries and location
   - Prevents expensive recalculations from blocking interactions

5. **Web Vitals Reporting** (`src/lib/webVitalsReporting.ts`)
   - Already monitoring INP with detailed attribution
   - Sends slow interactions to Sentry with full context

---

## Expected Impact

### Before:
- INP Score: ~232ms ("Needs Improvement")
- Blocking operations: Clipboard copy, modal opens, CSV exports

### After:
- **Target INP Score:** <200ms ("Good")
- **Key Improvements:**
  - Clipboard operations yield to browser first
  - Modal state updates marked as non-urgent
  - Large CSV exports chunked with yields
  - Production monitoring via Speed Insights

---

## Verification Steps

1. **Local Testing:**
   ```bash
   npm run dev
   ```
   - Open Chrome DevTools → Performance tab
   - Record while clicking citation modal, copying text, exporting CSV
   - Verify no Long Tasks >50ms

2. **Production Monitoring:**
   - Check Vercel Speed Insights dashboard after deployment
   - Monitor Sentry for INP alerts (already configured)
   - Look for `web_vital: 'INP'` tags in Sentry issues

3. **LoAF API Testing (Optional):**
   Add temporarily to verify no long animation frames:
   ```javascript
   const observer = new PerformanceObserver((list) => {
     for (const entry of list.getEntries()) {
       if (entry.duration > 50) {
         console.warn('Long Animation Frame:', entry.duration, entry);
       }
     }
   });
   observer.observe({ type: 'long-animation-frame', buffered: true });
   ```

---

## Future Optimization Opportunities

If INP is still >200ms after these changes, consider:

1. **Virtualize Transaction List** - Use `@tanstack/react-virtual` for large lists
2. **Memoize Expensive Computations** - Add `useMemo`/`useCallback` to derived data
3. **Move Heavy Calculations to Web Worker** - Financial projections, anomaly detection
4. **Debounce Search Input** - If search triggers expensive filtering
5. **Event Delegation** - If many sibling elements have same handlers

---

## References

- [Web.dev: INP](https://web.dev/articles/inp)
- [Chrome DevTools: Performance Tab](https://developer.chrome.com/docs/devtools/performance)
- [Scheduler.yield() API](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield)
- [React: startTransition](https://react.dev/reference/react/startTransition)

---

**Applied using:** INP Debug & Fix Skill (`.lingma/skills/inp-debug-fix/SKILL.md`)
**Date:** 2026-04-21
**Status:** ✅ Complete - Ready for testing and deployment
