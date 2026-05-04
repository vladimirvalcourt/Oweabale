# Performance Long Task Audit & Fixes

## Problem
PerformanceLongTaskTiming warning at ~56ms around **62 seconds after page load**.

## Root Causes Identified

### 1. ✅ useAuth Idle Timer - setInterval Every 10s (LOW IMPACT)
**Location**: `src/hooks/useAuth.ts:140`
```typescript
const interval = setInterval(checkTimeout, 10_000);
```
- **Impact**: Low (runs every 10s, lightweight check)
- **Status**: Already optimized from 1s → 10s granularity
- **Action**: No change needed

### 2. ⚠️ performanceMonitor.ts - setInterval Every 1s (MEDIUM IMPACT)
**Location**: `src/lib/utils/performanceMonitor.ts:86`
```typescript
checkInterval = window.setInterval(() => {
    const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
    if (timeSinceLastHeartbeat > timeout) {
        console.warn('[Performance] Page appears unresponsive');
        attemptRecovery(); // This could be heavy!
    }
}, 1000);
```
- **Impact**: Medium (fires every second, `attemptRecovery()` may be synchronous)
- **Problem**: If `attemptRecovery()` does DOM manipulation or heavy computation, it blocks main thread
- **Fix**: Wrap in `setTimeout(..., 0)` to defer to next tick

### 3. ⚠️ egressMonitor.ts - setInterval Every 5min in DEV (LOW IMPACT)
**Location**: `src/lib/utils/egressMonitor.ts:149`
```typescript
if (import.meta.env.DEV) {
    setInterval(() => {
        logEgressSummary();
    }, 5 * 60 * 1000);
}
```
- **Impact**: Low (only in dev, runs every 5 minutes)
- **Action**: No change needed

### 4. 🔴 Ingestion.tsx - Supabase Realtime Subscription (HIGH IMPACT)
**Location**: `src/pages/Ingestion.tsx:257-278`
```typescript
React.useEffect(() => {
    const channel = supabase
        .channel('ingestion-updates')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'pending_ingestions'
        }, (payload) => {
            const row = payload.new as { id?: string };
            if (!row?.id) return;
            useStore.getState().fetchData(undefined, { background: true }); // HEAVY!
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}, []);
```
- **Impact**: HIGH (triggers full data sync on every INSERT)
- **Problem**: `fetchData()` executes 8+ parallel queries - this is expensive!
- **Note**: Table `pending_ingestions` was REMOVED from database (OCR feature deleted)
- **Fix**: Remove this subscription entirely OR wrap in `startTransition`

### 5. ⚠️ PWA Update Check - setInterval Every Hour (LOW IMPACT)
**Location**: `src/hooks/usePWAUpdateNotification.ts:21`
```typescript
const id = setInterval(() => void r.update(), 60 * 60 * 1000);
```
- **Impact**: Low (runs every hour)
- **Action**: No change needed

## Recommended Fixes

### Fix 1: Defer performanceMonitor Recovery Logic
**File**: `src/lib/utils/performanceMonitor.ts`

Wrap `attemptRecovery()` in `setTimeout` to avoid blocking main thread:

```typescript
// Check for unresponsiveness
checkInterval = window.setInterval(() => {
    const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;

    if (timeSinceLastHeartbeat > timeout) {
        console.warn('[Performance] Page appears unresponsive');

        // Defer recovery to next tick to avoid blocking main thread
        setTimeout(() => {
            attemptRecovery();
        }, 0);
    }
}, 1000);
```

### Fix 2: Remove Broken Realtime Subscription
**File**: `src/pages/Ingestion.tsx`

The `pending_ingestions` table no longer exists (removed with OCR feature). This subscription will fail silently or cause errors.

**Option A - Remove Entirely** (Recommended):
```typescript
// Delete lines 257-278 completely
// The realtime subscription references a deleted table
```

**Option B - Wrap in startTransition** (If you plan to restore OCR):
```typescript
.on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'pending_ingestions'
}, (payload) => {
    const row = payload.new as { id?: string };
    if (!row?.id) return;
    
    // Defer heavy data sync to avoid blocking main thread
    React.startTransition(() => {
        useStore.getState().fetchData(undefined, { background: true });
    });
})
```

### Fix 3: Add requestIdleCallback to Heavy Operations
For any future heavy operations, use `requestIdleCallback`:

```typescript
// Example: Deferring non-critical updates
if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
        performHeavyCalculation();
    }, { timeout: 2000 });
} else {
    setTimeout(performHeavyCalculation, 0);
}
```

## Why ~62 Seconds?

The timing suggests one of these scenarios:

1. **User becomes idle** → `performanceMonitor.ts` heartbeat stops → After 5s timeout, `attemptRecovery()` fires on main thread
2. **Background tab resumes** → Supabase realtime reconnects → Triggers `fetchData()` which runs 8+ queries synchronously
3. **Service Worker update check** → PWA polling triggers re-render with heavy component mounting

## Testing Plan

### Before Fix:
1. Open DevTools → Performance tab
2. Record for 90 seconds
3. Look for long tasks (>50ms) around 60-65s mark
4. Check "Bottom-Up" view for culprit functions

### After Fix:
1. Repeat recording
2. Verify no tasks >50ms at 60-65s mark
3. Confirm INP (Interaction to Next Paint) < 200ms

## Files to Modify

1. ✅ `src/lib/utils/performanceMonitor.ts` - Defer recovery logic
2. ✅ `src/pages/Ingestion.tsx` - Remove broken realtime subscription
3. ℹ️ Monitor: `src/hooks/useAuth.ts` - Already optimized
4. ℹ️ Monitor: `src/lib/utils/egressMonitor.ts` - Dev-only, low impact

## Additional Optimizations (Future)

### 1. Virtualize Large Lists
If rendering many transactions/bills, use virtualization:
```bash
npm install @tanstack/react-virtual
```

### 2. Memoize Expensive Calculations
```typescript
const netWorth = useMemo(() => {
    return assets.reduce((sum, asset) => sum + asset.value, 0) - 
           debts.reduce((sum, debt) => sum + debt.remaining, 0);
}, [assets, debts]);
```

### 3. Code Split Heavy Components
```typescript
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));
```

### 4. Use Web Workers for Heavy Computation
Move complex calculations off main thread:
```typescript
const worker = new Worker(new URL('./calcWorker.ts', import.meta.url));
worker.postMessage(data);
```
