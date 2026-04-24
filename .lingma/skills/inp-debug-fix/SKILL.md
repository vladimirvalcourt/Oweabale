---
name: inp-debug-fix
description: Diagnose and fix Interaction to Next Paint (INP) issues flagged by Vercel Speed Insights. Identifies blocking event handlers and applies React-specific patterns to achieve <200ms INP scores.
user-invokable: true
args:
  - name: target
    description: The component or interaction causing INP issues (optional)
    required: false
---

# Skill: INP Debug & Fix (Vercel Core Web Vitals)

## Purpose
This skill helps diagnose and fix **Interaction to Next Paint (INP)** issues flagged by Vercel's Speed Insights, specifically when event handlers on UI elements block the main thread (e.g., 200ms+). INP replaced FID as a Core Web Vital and a "Good" score requires <200ms.

---

## What INP Measures
INP has 3 phases that sum to the total score:
1. **Input Delay** – Time from user interaction to when event handler starts
2. **Processing Time** – Time event handler takes to run (your main problem)
3. **Presentation Delay** – Time browser takes to render after handler finishes

The Vercel flag "Event handlers blocked UI updates for 232ms" means your **Processing Time** is the culprit.

---

## Diagnosis Checklist

Before fixing, identify the root cause. Ask:

### Step 1: Profile the interaction
- Open Chrome DevTools → **Performance tab**
- Click **Record**, perform the flagged interaction, click Stop
- Look for **Long Tasks** (red bars >50ms)
- Expand the task to see which function is blocking

### Step 2: Identify the pattern
Common INP offenders in React/Next.js:
- [ ] Heavy `onClick` or `onChange` handlers doing sync state updates
- [ ] Synchronous API calls or data transformations in handlers
- [ ] Layout thrashing (reading + writing DOM in same handler)
- [ ] Too many re-renders triggered by one interaction
- [ ] Third-party scripts (GTM, analytics) running on interaction
- [ ] Missing `useCallback` causing handlers to re-register on every render
- [ ] `useEffect` with heavy deps firing on interaction
- [ ] Unvirtualized long lists re-rendering on click

### Step 3: Confirm with LoAF (Long Animation Frame) API
Add this to your app temporarily:
```js
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

## Fix Patterns

### Fix 1: Yield to Main Thread with scheduler.yield()
**Use when:** Handler does heavy work after a UI update (e.g., saving, processing).

```js
// BEFORE (blocks UI for 232ms)
async function handleClick() {
  doHeavyWork(); // blocks main thread
  updateUI();
}

// AFTER (yields so browser can paint first)
async function handleClick() {
  updateUI(); // immediate visual feedback
  
  if ('scheduler' in window && 'yield' in scheduler) {
    await scheduler.yield(); // yield to browser, let it paint
  } else {
    await new Promise(resolve => setTimeout(resolve, 0)); // fallback
  }
  
  doHeavyWork(); // deferred non-critical work
}
```

### Fix 2: Defer Non-Critical Work with startTransition
**Use when:** A React state update causes expensive re-renders (navigation, filters, search).

```jsx
import { useTransition, useState } from 'react';

function NavItem({ href, label }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      // Mark as non-urgent — React can interrupt this
      setActiveRoute(href);
      setExpandedMenu(false);
    });
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={isPending ? 'opacity-50' : ''}
    >
      {label}
    </a>
  );
}
```

### Fix 3: Break Up Long Tasks with setTimeout chunks
**Use when:** You must process a large array or run multiple sync operations.

```js
async function handleBulkAction(items) {
  const CHUNK_SIZE = 50;
  
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    processChunk(chunk);
    
    // Yield between chunks
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

### Fix 4: Debounce/Throttle Frequent Handlers
**Use when:** Handler fires on input, scroll, mousemove, or rapid clicks.

```js
import { useMemo } from 'react';
import { debounce } from 'lodash-es'; // or implement manually

function SearchBar() {
  const debouncedSearch = useMemo(
    () => debounce((value) => {
      performSearch(value); // heavy work deferred by 200ms
    }, 200),
    []
  );

  return <input onChange={(e) => debouncedSearch(e.target.value)} />;
}
```

### Fix 5: Move Heavy Work to a Web Worker
**Use when:** Pure computation (no DOM access) is blocking — data parsing, encryption, sorting large datasets.

```js
// worker.js
self.onmessage = ({ data }) => {
  const result = expensiveComputation(data);
  self.postMessage(result);
};

// Component
function useWorker() {
  const worker = useMemo(() => new Worker(
    new URL('./worker.js', import.meta.url)
  ), []);

  const runInWorker = (data) => new Promise((resolve) => {
    worker.onmessage = ({ data }) => resolve(data);
    worker.postMessage(data);
  });

  return runInWorker;
}
```

### Fix 6: Prevent Layout Thrashing
**Use when:** Handler reads and writes DOM layout properties (offsetHeight, getBoundingClientRect, etc.).

```js
// BAD — forces multiple reflows
function badHandler() {
  const h1 = el1.offsetHeight; // READ
  el2.style.height = h1 + 'px'; // WRITE
  const h2 = el2.offsetHeight; // READ again (forces reflow!)
  el3.style.height = h2 + 'px'; // WRITE
}

// GOOD — batch reads, then writes
function goodHandler() {
  // Batch all reads
  const h1 = el1.offsetHeight;
  const h2 = el2.offsetHeight;
  
  // Batch all writes
  requestAnimationFrame(() => {
    el2.style.height = h1 + 'px';
    el3.style.height = h2 + 'px';
  });
}
```

### Fix 7: Add Passive Event Listeners
**Use when:** Using scroll, touch, or wheel listeners.

```js
// In vanilla JS
element.addEventListener('scroll', handler, { passive: true });

// In React (add this to global.css or _document for touch events)
// React automatically marks most listeners as passive in React 17+
// but for manual useEffect listeners:
useEffect(() => {
  const el = ref.current;
  el.addEventListener('touchstart', handler, { passive: true });
  return () => el.removeEventListener('touchstart', handler);
}, []);
```

### Fix 8: Use Event Delegation
**Use when:** Many sibling elements have the same click handler (navigation menus, lists, tabs).

```jsx
// BAD — individual listeners on every item
{items.map(item => (
  <button key={item.id} onClick={() => handleSelect(item.id)}>
    {item.label}
  </button>
))}

// GOOD — single delegated listener on parent
<div onClick={(e) => {
  const id = e.target.closest('[data-id]')?.dataset.id;
  if (id) handleSelect(id);
}}>
  {items.map(item => (
    <button key={item.id} data-id={item.id}>
      {item.label}
    </button>
  ))}
</div>
```

---

## React-Specific INP Patterns

### Memoize expensive renders triggered by interaction
```jsx
import { memo, useCallback, useMemo } from 'react';

// Prevent children from re-rendering on parent interaction
const ExpensiveChild = memo(({ data }) => <HeavyComponent data={data} />);

function Parent() {
  const [active, setActive] = useState(null);
  
  // Stable handler reference — doesn't cause child re-renders
  const handleClick = useCallback((id) => {
    setActive(id);
  }, []);

  // Memoized derived data
  const processed = useMemo(() => expensiveTransform(data), [data]);

  return <ExpensiveChild data={processed} onSelect={handleClick} />;
}
```

### Virtualize long lists (react-virtual / @tanstack/virtual)
```jsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }) {
  const parentRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
  });

  return (
    <div ref={parentRef} style={{ height: 400, overflow: 'auto' }}>
      <div style={{ height: rowVirtualizer.getTotalSize() }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            {items[virtualRow.index].label}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Vercel Speed Insights Integration

Add Real User Monitoring to catch INP in production:

```js
// app/layout.tsx (Next.js App Router)
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

Track INP manually with the web-vitals package:

```js
import { onINP } from 'web-vitals';

onINP((metric) => {
  // Log to your analytics
  console.log('INP:', metric.value, 'ms | Rating:', metric.rating);
  console.log('Attributed to:', metric.attribution?.interactionTarget);
});
```

---

## INP Score Thresholds

| Score | Rating |
|-------|--------|
| ≤ 200ms | ✅ Good |
| 201–500ms | ⚠️ Needs Improvement |
| > 500ms | ❌ Poor |

Your current flag at 232ms is in "Needs Improvement" — close to good, fixable with 1-2 of the above patterns.

---

## Quick Decision Tree

```
Event handler blocked UI for 200ms+?
│
├─ Is it a React state update causing re-renders?
│   └─ YES → Use startTransition or memo
│
├─ Is it a computation (no DOM)?  
│   └─ YES → Move to Web Worker
│
├─ Does it fire rapidly (input/scroll)?
│   └─ YES → Debounce or throttle
│
├─ Is it doing DOM reads + writes?
│   └─ YES → Batch with requestAnimationFrame
│
└─ Is it doing work AFTER showing feedback?
    └─ YES → scheduler.yield() or setTimeout(0)
```

---

## When to Use This Skill

Use this skill when:
- Vercel Speed Insights flags INP issues (>200ms)
- Users report sluggish interactions
- Chrome DevTools shows Long Tasks during interactions
- You're optimizing Core Web Vitals before production launch
- Performance profiling reveals blocking event handlers
- You need to improve Interaction to Next Paint scores

This skill covers everything from the exact Vercel flag you're seeing to React-specific patterns. The 232ms score you're hitting is just above the 200ms "Good" threshold, meaning a single targeted fix — most likely `startTransition` for navigation clicks or `scheduler.yield()` to defer post-click work — should push you into the green.

---

## Anti-patterns

**NEVER** perform heavy synchronous work in click handlers without deferring.

**NEVER** trigger multiple state updates in sequence without `startTransition` or batching.

**NEVER** read and write DOM layout properties in the same handler without batching.

**NEVER** attach individual event listeners to hundreds of elements — use event delegation.

**NEVER** skip performance profiling — always verify fixes reduce Long Task duration.

**NEVER** assume React.memo fixes everything — profile to find the actual bottleneck.
