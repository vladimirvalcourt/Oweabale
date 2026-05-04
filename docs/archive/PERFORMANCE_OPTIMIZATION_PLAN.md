# Performance Optimization Action Plan

Based on dashboard performance trace analysis (LCP: 2,713ms).

## Priority 1: Quick Wins (Immediate Impact)

### ✅ Already Implemented
- **Font Loading**: Using `@fontsource` with `font-display: swap` (no render-blocking)
- **Deferred Initialization**: Web Vitals, Service Worker, and analytics loaded after LCP
- **Code Splitting**: Heavy libs (charts, motion, PDF) in separate chunks
- **Lazy Loading**: Analytics wrapped in `<Suspense>` to defer rendering
- **Performance Monitoring**: Long task detection and idle initialization ready

### 🎯 Test in Incognito Mode
**Issue**: Browser extensions consuming 462ms of main thread time
- Capital One Shopping: 385ms
- AdBlock: 77ms

**Action**: 
```bash
# Open Chrome Incognito (Cmd+Shift+N) and test dashboard load
# Compare LCP - should drop from 2,713ms to ~2,200ms baseline
```

---

## Priority 2: DOM Optimization (Medium Effort)

### Issue: Forced Reflows & Large DOM
**Symptoms**:
- Layout tasks taking 96ms + 413ms total
- Multiple synchronous style recalculations

**Actions**:

#### 1. Audit Component Tree for Unnecessary Renders
```typescript
// Add React DevTools Profiler to identify re-renders
// Look for components that re-render without prop changes
```

**Files to Review**:
- `/src/components/Dashboard.tsx` - Main dashboard component
- `/src/store/slices/dataSyncSlice.ts` - Data fetching logic
- `/src/pages/DashboardPage.tsx` - Page wrapper

#### 2. Virtualize Large Lists
If you have transaction lists, bill lists, or any scrollable data:
```typescript
// Use react-window or @tanstack/react-virtual for lists >50 items
import { useVirtualizer } from '@tanstack/react-virtual';

// Example: Transaction list virtualization
const rowVirtualizer = useVirtualizer({
  count: transactions.length,
  getScrollElement: () => containerRef.current,
  estimateSize: () => 60, // estimated row height
  overscan: 5, // render 5 extra rows above/below viewport
});
```

#### 3. Batch DOM Updates
Already available in `/src/lib/utils/performanceMonitor.ts`:
```typescript
import { batchDOMOperations } from '@/lib/utils/performanceMonitor';

// Instead of:
element.style.height = '100px'; // Triggers reflow
const height = element.offsetHeight; // Forces sync layout

// Use:
batchDOMOperations(
  () => { /* read operations */ },
  () => { /* write operations */ }
);
```

---

## Priority 3: Production Build Testing

### Issue: Vite Checker Runtime Overhead (36ms)
**This is dev-only** - doesn't affect production.

**Verify Production Performance**:
```bash
# Build production version
npm run build

# Preview it locally
npm run preview

# Test LCP in Chrome DevTools → Performance tab
# Expected: LCP should be <2,000ms in production
```

**Why it matters**:
- Dev mode includes HMR, type checking, error overlays
- Production strips all dev overhead
- Always measure against production builds for accurate metrics

---

## Priority 4: React Component Optimization

### Issue: Single Task Taking 188ms in React Render Cycle

**Profiling Steps**:

1. **Enable React DevTools Profiler**:
   ```bash
   npm install --save-dev react-devtools
   ```

2. **Record Profile**:
   - Open DevTools → Components tab → Profiler
   - Click "Record" → Interact with dashboard → Stop
   - Look for components with high "Self Time"

3. **Common Fixes**:

#### A. Memoize Expensive Components
```typescript
import { memo, useMemo, useCallback } from 'react';

// Wrap heavy components
const DashboardStats = memo(({ data }: { data: StatsData }) => {
  // Only re-renders when data reference changes
  return <div>...</div>;
});

// Memoize expensive calculations
const sortedTransactions = useMemo(() => {
  return transactions.sort((a, b) => b.date.localeCompare(a.date));
}, [transactions]);

// Memoize callbacks passed to children
const handleDelete = useCallback((id: string) => {
  deleteTransaction(id);
}, [deleteTransaction]);
```

#### B. Avoid Inline Object/Array Props
```typescript
// ❌ BAD - Creates new object every render
<Card style={{ padding: '1rem' }} />

// ✅ GOOD - Stable reference
const cardStyle = useMemo(() => ({ padding: '1rem' }), []);
<Card style={cardStyle} />
```

#### C. Split Large Components
```typescript
// If Dashboard.tsx is >300 lines, split into:
// - DashboardHeader.tsx
// - DashboardStats.tsx  
// - DashboardCharts.tsx
// - DashboardLists.tsx
```

---

## Priority 5: Network Optimization

### Current State
✅ Supabase API uses `NetworkFirst` strategy (good)
✅ Static assets cached for 30 days
✅ Google Fonts use `StaleWhileRevalidate`

### Additional Optimizations

#### 1. Preload Critical Data
```typescript
// In App.tsx or root layout, prefetch user profile
useEffect(() => {
  const prefetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id,first_name,last_name,email')
      .eq('id', userId)
      .maybeSingle();
    
    // Store in Zustand cache for instant access
    useProfileStore.setState({ profile: data });
  };
  
  prefetchProfile();
}, [userId]);
```

#### 2. Optimize Image Loading
```html
<!-- Add loading="lazy" to below-fold images -->
<img src="/hero.png" alt="..." loading="lazy" decoding="async" />

<!-- Preload above-fold critical images -->
<link rel="preload" as="image" href="/critical-image.webp" />
```

#### 3. Compress Images
```bash
# Use sharp or imagemin to compress images
npm install sharp

# Convert PNGs to WebP (50-80% smaller)
# Add to build script or use Vite plugin
```

---

## Monitoring & Validation

### 1. Track Core Web Vitals
Already implemented in `/src/lib/utils/webVitalsReporting.ts`:
- **LCP** (Largest Contentful Paint): Target <2,500ms
- **FID** (First Input Delay): Target <100ms
- **CLS** (Cumulative Layout Shift): Target <0.1

### 2. Set Up Real User Monitoring (RUM)
```typescript
// Already using Vercel Analytics
// Check Vercel Dashboard → Analytics → Web Vitals
// Filter by device type, connection speed, geography
```

### 3. Performance Budget
Add to `vite.config.ts`:
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: { /* ... */ }
    },
    plugins: [
      // Add bundle size budget enforcement
      {
        name: 'bundle-budget',
        writeBundle(options, bundle) {
          for (const [fileName, chunk] of Object.entries(bundle)) {
            if (chunk.type === 'chunk' && chunk.code.length > 500_000) {
              console.warn(`⚠️  ${fileName} exceeds 500KB: ${(chunk.code.length / 1024).toFixed(2)}KB`);
            }
          }
        }
      }
    ]
  }
}
```

---

## Implementation Checklist

### Week 1: Quick Wins
- [ ] Test in Incognito mode (baseline performance)
- [ ] Build and test production version locally
- [ ] Document current LCP/FID/CLS metrics

### Week 2: DOM Optimization
- [ ] Profile React component tree with DevTools
- [ ] Identify top 3 re-rendering components
- [ ] Add `memo()` to expensive components
- [ ] Virtualize any lists with >50 items

### Week 3: Advanced Optimizations
- [ ] Split large components (>300 lines)
- [ ] Implement `useMemo`/`useCallback` for stable props
- [ ] Add image lazy loading
- [ ] Compress images to WebP

### Week 4: Validation
- [ ] Re-test LCP in production build
- [ ] Compare before/after metrics
- [ ] Set up performance regression tests in CI

---

## Expected Results

| Metric | Current | After Optimization | Improvement |
|--------|---------|-------------------|-------------|
| LCP | 2,713ms | <2,000ms | ~26% faster |
| Extension Impact | 462ms | 0ms (Incognito) | Baseline clarity |
| Forced Reflows | 509ms | <100ms | ~80% reduction |
| React Render | 188ms | <100ms | ~47% faster |

**Note**: Actual improvements depend on specific bottlenecks found during profiling.

---

## Resources

- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)
- [Web Vitals Guide](https://web.dev/vitals/)
- [React Performance Best Practices](https://react.dev/learn/render-and-commit)
- [Virtual List Libraries](https://tanstack.com/virtual/latest)
