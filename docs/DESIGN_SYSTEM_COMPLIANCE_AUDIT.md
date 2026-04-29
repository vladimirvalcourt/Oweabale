# Design System Compliance Audit Report

**Date:** 2026-04-29
**Scope:** All pages in src/pages/ directory
**Design System Reference:** DESIGN.md

---

## Executive Summary

- **Files Scanned:** 48
- **Total Lines Analyzed:** 18723
- **Critical Violations:** 19
- **Medium Violations:** 544
- **Low Violations:** 0
- **Total Violations:** 563

---

## 🔴 Critical Violations

Hardcoded colors that break theme consistency and light/dark mode support.

### 1. Hardcoded Color
- **File:** `src/pages/AuthPage.tsx`
- **Line:** 109
- **Code:** `<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3....`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 2. Hardcoded Color
- **File:** `src/pages/AuthPage.tsx`
- **Line:** 110
- **Code:** `<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86...`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 3. Hardcoded Color
- **File:** `src/pages/AuthPage.tsx`
- **Line:** 111
- **Code:** `<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 ...`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 4. Hardcoded Color
- **File:** `src/pages/AuthPage.tsx`
- **Line:** 112
- **Code:** `<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3....`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 5. Hardcoded Color
- **File:** `src/pages/Categories.tsx`
- **Line:** 15
- **Code:** `color: '#737373',`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 6. Hardcoded Color
- **File:** `src/pages/Categories.tsx`
- **Line:** 33
- **Code:** `setFormData({ name: '', type: 'expense', color: '#737373' });`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 7. Hardcoded Color
- **File:** `src/pages/Categories.tsx`
- **Line:** 48
- **Code:** `setFormData({ name: '', type: 'expense', color: '#737373' });`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 8. Hardcoded Color
- **File:** `src/pages/Categories.tsx`
- **Line:** 56
- **Code:** `color: category.color || '#737373',`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 9. Hardcoded Color
- **File:** `src/pages/Categories.tsx`
- **Line:** 63
- **Code:** `setFormData({ name: '', type: 'expense', color: '#737373' });`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 10. Hardcoded Color
- **File:** `src/pages/Categories.tsx`
- **Line:** 84
- **Code:** `setFormData({ name: '', type: 'expense', color: '#737373' });`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 11. Hardcoded Color
- **File:** `src/pages/Categories.tsx`
- **Line:** 194
- **Code:** `style={{ borderLeftColor: category.color || '#737373', borderLeftWidth: '3px' }}`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 12. Hardcoded Color
- **File:** `src/pages/Categories.tsx`
- **Line:** 196
- **Code:** `<Tag className="w-5 h-5" style={{ color: category.color || '#737373' }} />`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 13. Hardcoded Color
- **File:** `src/pages/Freelance.tsx`
- **Line:** 560
- **Code:** `className="rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emeral...`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 14. Hardcoded Color
- **File:** `src/pages/Goals.tsx`
- **Line:** 98
- **Code:** `color: newGoal.type === 'debt' ? '#dc3545' : newGoal.type === 'emergency' ? '#f59e0b' : '#d4d4d4',`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 15. Hardcoded Color
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 330
- **Code:** `className="flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-md bg-brand-indigo ...`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 16. Hardcoded Color
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 354
- **Code:** `<div className="mt-8 inline-block px-8 py-3 rounded-md bg-brand-indigo text-white text-sm font-sans ...`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 17. Hardcoded Color
- **File:** `src/pages/Obligations.tsx`
- **Line:** 875
- **Code:** `? 'bg-rose-600 text-white hover:bg-rose-500'`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 18. Hardcoded Color
- **File:** `src/pages/Obligations.tsx`
- **Line:** 928
- **Code:** `? 'border border-rose-500 bg-rose-600 text-white hover:bg-rose-500'`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

### 19. Hardcoded Color
- **File:** `src/pages/settings/ProfilePanel.tsx`
- **Line:** 540
- **Code:** `<div className="relative mt-4 h-64 w-full overflow-hidden rounded-md bg-black md:h-80">`
- **Fix:** Replace with semantic token (e.g., bg-surface-base, text-content-primary)

---

## 🟡 Medium Violations

Border radius and typography inconsistencies that affect visual harmony.

### 1. Incorrect Border Radius
- **File:** `src/pages/Analytics.tsx`
- **Line:** 274
- **Code:** `<div className="flex bg-surface-raised border border-surface-border rounded-lg p-1">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 2. Incorrect Border Radius
- **File:** `src/pages/Analytics.tsx`
- **Line:** 279
- **Code:** `className={`px-3 py-1 text-xs font-sans font-medium rounded-lg transition-colors ${`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 3. Incorrect Border Radius
- **File:** `src/pages/Analytics.tsx`
- **Line:** 291
- **Code:** `<div className="bg-surface-elevated border border-surface-border rounded-lg p-5">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 4. Incorrect Border Radius
- **File:** `src/pages/Analytics.tsx`
- **Line:** 305
- **Code:** `<div className="bg-surface-elevated border border-surface-border rounded-lg p-5">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 5. Incorrect Border Radius
- **File:** `src/pages/Analytics.tsx`
- **Line:** 327
- **Code:** `<div className="bg-surface-elevated border border-surface-border rounded-lg p-5">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 6. Incorrect Border Radius
- **File:** `src/pages/Analytics.tsx`
- **Line:** 343
- **Code:** `<div className="bg-surface-elevated border border-surface-border rounded-lg p-5">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 7. Incorrect Border Radius
- **File:** `src/pages/Analytics.tsx`
- **Line:** 446
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-base p-4">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 8. Incorrect Border Radius
- **File:** `src/pages/Analytics.tsx`
- **Line:** 455
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-base p-4">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 9. Incorrect Border Radius
- **File:** `src/pages/Analytics.tsx`
- **Line:** 464
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-base p-4">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 10. Incorrect Border Radius
- **File:** `src/pages/Analytics.tsx`
- **Line:** 488
- **Code:** `className="flex items-center justify-between gap-4 rounded-lg border border-surface-border bg-surfac...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 11. Incorrect Border Radius
- **File:** `src/pages/AuthPage.tsx`
- **Line:** 167
- **Code:** `<div className="mt-10 divide-y divide-white/[0.06] rounded-lg border border-surface-border-subtle bg...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 12. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 263
- **Code:** `className="px-4 py-2.5 rounded-lg bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm fo...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 13. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 271
- **Code:** `<div className="bg-surface-raised border border-surface-border rounded-lg p-12 text-center">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 14. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 272
- **Code:** `<div className="w-16 h-16 bg-surface-elevated rounded-lg flex items-center justify-center mx-auto mb...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 15. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 280
- **Code:** `className="px-6 py-3 rounded-lg bg-brand-cta hover:bg-brand-cta-hover active:scale-[0.98] text-surfa...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 16. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 290
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-elevated p-4">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 17. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 301
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg pl-7 pr-3 py-2 text-sm fon...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 18. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 308
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-elevated p-3">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 19. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 312
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-elevated p-3">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 20. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 316
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-elevated p-3">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 21. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 342
- **Code:** `<div key={suggestion.id} className="rounded-lg border border-surface-border bg-surface-elevated p-4"...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 22. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 349
- **Code:** `<span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-mo...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 23. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 360
- **Code:** `<div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 24. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 396
- **Code:** `className="bg-surface-elevated rounded-lg border border-surface-border p-5 flex flex-col relative gr...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 25. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 477
- **Code:** `<div className="w-full bg-surface-raised border border-surface-border rounded-lg h-1.5 mb-2 overflow...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 26. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 507
- **Code:** `<Dialog.Panel className="mx-auto max-w-sm w-full rounded-lg bg-surface-raised border border-surface-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 27. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 524
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 28. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 547
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg pl-7 pr-3 py-2 text-sm fon...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 29. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 552
- **Code:** `<div className="mt-2 flex items-center justify-between rounded-lg border border-surface-border bg-su...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 30. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 562
- **Code:** `className="text-[11px] font-medium text-content-primary hover:text-content-secondary focus-app round...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 31. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 575
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 32. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 583
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-base p-3">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 33. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 605
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 34. Incorrect Border Radius
- **File:** `src/pages/Budgets.tsx`
- **Line:** 623
- **Code:** `className="px-6 py-2 rounded-lg bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 35. Arbitrary Font Size
- **File:** `src/pages/Budgets.tsx`
- **Line:** 403
- **Code:** `<span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[1...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 36. Arbitrary Font Size
- **File:** `src/pages/Budgets.tsx`
- **Line:** 410
- **Code:** `<p className="mt-1 text-[11px] font-medium text-amber-400 uppercase tracking-wide">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 37. Arbitrary Font Size
- **File:** `src/pages/Budgets.tsx`
- **Line:** 415
- **Code:** `<p className="mt-1 text-[11px] font-medium text-emerald-400">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 38. Arbitrary Font Size
- **File:** `src/pages/Budgets.tsx`
- **Line:** 553
- **Code:** `<p className="text-[11px] text-content-secondary">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 39. Arbitrary Font Size
- **File:** `src/pages/Budgets.tsx`
- **Line:** 562
- **Code:** `className="text-[11px] font-medium text-content-primary hover:text-content-secondary focus-app round...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 40. Incorrect Border Radius
- **File:** `src/pages/Calendar.tsx`
- **Line:** 221
- **Code:** `<div className="bg-surface-raised border border-surface-border rounded-lg overflow-hidden -mx-6 -my-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 41. Incorrect Border Radius
- **File:** `src/pages/Calendar.tsx`
- **Line:** 256
- **Code:** `className="p-1.5 text-content-tertiary hover:text-content-primary hover:bg-surface-border rounded-lg...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 42. Incorrect Border Radius
- **File:** `src/pages/Calendar.tsx`
- **Line:** 267
- **Code:** `className="p-1.5 text-content-tertiary hover:text-content-primary hover:bg-surface-border rounded-lg...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 43. Incorrect Border Radius
- **File:** `src/pages/Calendar.tsx`
- **Line:** 306
- **Code:** `<div className={`w-6 h-6 flex items-center justify-center text-xs font-mono mb-1 rounded-lg`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 44. Incorrect Border Radius
- **File:** `src/pages/Calendar.tsx`
- **Line:** 317
- **Code:** `className={`flex items-center gap-1 px-1 py-0.5 rounded-lg bg-surface-elevated border border-surface...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 45. Incorrect Border Radius
- **File:** `src/pages/Calendar.tsx`
- **Line:** 340
- **Code:** `className="fixed z-50 bg-surface-raised border border-surface-border rounded-lg shadow-2xl p-4 min-w...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 46. Incorrect Border Radius
- **File:** `src/pages/Calendar.tsx`
- **Line:** 384
- **Code:** `<div key={ev.id} className="flex items-center justify-between py-2 border-b border-surface-raised la...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 47. Incorrect Border Radius
- **File:** `src/pages/Calendar.tsx`
- **Line:** 389
- **Code:** `<span className={`text-[9px] font-mono ${cfg.text} uppercase tracking-widest border border-surface-b...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 48. Arbitrary Font Size
- **File:** `src/pages/Calendar.tsx`
- **Line:** 210
- **Code:** `<span className="text-[11px] font-mono text-content-tertiary capitalize">{type}</span>`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 49. Arbitrary Font Size
- **File:** `src/pages/Calendar.tsx`
- **Line:** 219
- **Code:** `extraHeader={<span className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest"...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 50. Arbitrary Font Size
- **File:** `src/pages/Calendar.tsx`
- **Line:** 227
- **Code:** `<p className="mt-1 text-[11px] text-content-secondary">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 51. Arbitrary Font Size
- **File:** `src/pages/Calendar.tsx`
- **Line:** 276
- **Code:** `<div key={d} className="py-2 text-center text-[10px] font-mono text-content-secondary uppercase trac...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 52. Arbitrary Font Size
- **File:** `src/pages/Calendar.tsx`
- **Line:** 320
- **Code:** `<span className="text-[9px] font-mono text-content-primary truncate">{ev.label}</span>`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 53. Arbitrary Font Size
- **File:** `src/pages/Calendar.tsx`
- **Line:** 325
- **Code:** `<div className="text-[9px] font-mono text-content-muted pl-1">+{events.length - 3} more</div>`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 54. Arbitrary Font Size
- **File:** `src/pages/Calendar.tsx`
- **Line:** 386
- **Code:** `<div className={`text-[10px] font-mono text-content-tertiary w-8 text-center uppercase tracking-wide...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 55. Arbitrary Font Size
- **File:** `src/pages/Calendar.tsx`
- **Line:** 389
- **Code:** `<span className={`text-[9px] font-mono ${cfg.text} uppercase tracking-widest border border-surface-b...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 56. Incorrect Border Radius
- **File:** `src/pages/Categories.tsx`
- **Line:** 86
- **Code:** `className="inline-flex items-center gap-2 rounded-lg bg-brand-cta px-4 py-2 text-sm font-medium text...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 57. Incorrect Border Radius
- **File:** `src/pages/Categories.tsx`
- **Line:** 94
- **Code:** `<div className="bg-surface-raised rounded-lg border border-surface-border p-6 mb-6">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 58. Incorrect Border Radius
- **File:** `src/pages/Categories.tsx`
- **Line:** 113
- **Code:** `className="mt-1 focus-app-field block w-full sm:text-sm border-surface-border bg-surface-base text-c...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 59. Incorrect Border Radius
- **File:** `src/pages/Categories.tsx`
- **Line:** 122
- **Code:** `className="mt-1 focus-app-field block w-full sm:text-sm border-surface-border bg-surface-base text-c...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 60. Incorrect Border Radius
- **File:** `src/pages/Categories.tsx`
- **Line:** 135
- **Code:** `className="h-9 w-14 p-1 border border-surface-border bg-surface-base rounded-lg cursor-pointer"`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 61. Incorrect Border Radius
- **File:** `src/pages/Categories.tsx`
- **Line:** 145
- **Code:** `className="px-4 py-2 bg-transparent border border-surface-border rounded-lg text-sm font-medium text...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 62. Incorrect Border Radius
- **File:** `src/pages/Categories.tsx`
- **Line:** 151
- **Code:** `className="px-4 py-2 bg-brand-cta text-surface-base hover:bg-brand-cta-hover rounded-lg text-sm font...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 63. Incorrect Border Radius
- **File:** `src/pages/Categories.tsx`
- **Line:** 161
- **Code:** `<div className="bg-surface-raised rounded-lg border border-surface-border p-12 text-center">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 64. Incorrect Border Radius
- **File:** `src/pages/Categories.tsx`
- **Line:** 172
- **Code:** `className="inline-flex items-center justify-center px-4 py-2 bg-brand-cta text-surface-base hover:bg...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 65. Incorrect Border Radius
- **File:** `src/pages/Categories.tsx`
- **Line:** 184
- **Code:** `<div className="bg-surface-raised rounded-lg border border-surface-border overflow-hidden -mx-6 -my-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 66. Incorrect Border Radius
- **File:** `src/pages/Categories.tsx`
- **Line:** 193
- **Code:** `className="w-10 h-10 rounded-lg flex items-center justify-center text-content-primary border border-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 67. Incorrect Border Radius
- **File:** `src/pages/Categories.tsx`
- **Line:** 207
- **Code:** `className="p-2 text-content-tertiary hover:text-content-primary active:scale-95 rounded-lg hover:bg-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 68. Incorrect Border Radius
- **File:** `src/pages/Categories.tsx`
- **Line:** 215
- **Code:** `className="p-2 text-content-tertiary hover:text-red-400 active:scale-95 rounded-lg hover:bg-surface-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 69. Arbitrary Font Size
- **File:** `src/pages/Categories.tsx`
- **Line:** 182
- **Code:** `extraHeader={<span className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest"...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 70. Arbitrary Font Size
- **File:** `src/pages/Categories.tsx`
- **Line:** 200
- **Code:** `<p className="text-[9px] font-mono text-content-tertiary uppercase tracking-widest mt-1">{category.t...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 71. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 148
- **Code:** `className="bg-surface-raised border border-surface-border p-8 rounded-lg shrink-0 w-full md:w-64 tex...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 72. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 170
- **Code:** `<section className="bg-surface-raised border border-surface-border rounded-lg overflow-hidden shadow...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 73. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 186
- **Code:** `<span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase border ${getImpa...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 74. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 201
- **Code:** `<section className="bg-content-primary/[0.03] border border-surface-border rounded-lg p-8 relative o...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 75. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 218
- **Code:** `<div className="inline-flex items-center bg-black/30 border border-surface-border px-4 py-2 rounded-...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 76. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 296
- **Code:** `<section className="bg-surface-raised border border-surface-border rounded-lg flex flex-col h-full s...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 77. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 331
- **Code:** `<span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border ${`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 78. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 351
- **Code:** `className="focus-app flex flex-1 items-center justify-center gap-2 rounded-lg border border-surface-...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 79. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 358
- **Code:** `className="focus-app flex-1 rounded-lg border border-content-primary/5 bg-surface-elevated py-1.5 te...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 80. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 381
- **Code:** `<a href="https://www.annualcreditreport.com" target="_blank" rel="noreferrer" className="flex items-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 81. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 384
- **Code:** `<a href="https://www.experian.com" target="_blank" rel="noreferrer" className="flex items-center jus...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 82. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 411
- **Code:** `<Dialog.Panel className="bg-surface-elevated border border-surface-border rounded-lg shadow-none p-8...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 83. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 424
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-3 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 84. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 435
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-3 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 85. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 443
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-3 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 86. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 458
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-3 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 87. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 471
- **Code:** `className="flex-1 py-3 bg-brand-cta text-surface-base hover:bg-brand-cta-hover rounded-lg text-xs fo...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 88. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 506
- **Code:** `<Dialog.Panel className="bg-brand-cta text-surface-base rounded-lg shadow-2xl p-10 font-serif border...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 89. Incorrect Border Radius
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 558
- **Code:** `className="px-6 py-2 bg-surface-base text-content-primary font-sans font-bold text-xs uppercase trac...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 90. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 151
- **Code:** `<p className="text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-widest mb-2">...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 91. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 154
- **Code:** `<div className="flex items-center justify-center gap-2 text-[11px] font-mono uppercase tracking-wide...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 92. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 159
- **Code:** `<p className="text-[11px] font-mono uppercase tracking-widest text-content-muted">No score recorded ...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 93. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 175
- **Code:** `className="focus-app rounded text-[10px] font-mono uppercase tracking-widest text-content-primary fl...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 94. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 186
- **Code:** `<span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase border ${getImpa...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 95. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 274
- **Code:** `<p className="text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-widest mb-3">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 96. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 304
- **Code:** `className="focus-app rounded border border-surface-border bg-surface-elevated p-1 px-3 text-[10px] f...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 97. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 318
- **Code:** `<p className="text-[10px] text-content-muted mt-1 uppercase tracking-tight max-w-xs mx-auto leading-...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 98. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 329
- **Code:** `<p className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest">{fix.bureau}</p...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 99. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 331
- **Code:** `<span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border ${`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 100. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 351
- **Code:** `className="focus-app flex flex-1 items-center justify-center gap-2 rounded-lg border border-surface-...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 101. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 358
- **Code:** `className="focus-app flex-1 rounded-lg border border-content-primary/5 bg-surface-elevated py-1.5 te...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 102. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 377
- **Code:** `<div className="flex items-center gap-2 text-[10px] font-mono font-bold text-content-tertiary upperc...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 103. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 381
- **Code:** `<a href="https://www.annualcreditreport.com" target="_blank" rel="noreferrer" className="flex items-...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 104. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 384
- **Code:** `<a href="https://www.experian.com" target="_blank" rel="noreferrer" className="flex items-center jus...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 105. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 417
- **Code:** `<label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-wid...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 106. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 429
- **Code:** `<label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-wid...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 107. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 439
- **Code:** `<label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-wid...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 108. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 453
- **Code:** `<label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-wid...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 109. Arbitrary Font Size
- **File:** `src/pages/CreditCenter.tsx`
- **Line:** 549
- **Code:** `<p className="text-[10px] font-sans text-content-tertiary italic">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 110. Incorrect Border Radius
- **File:** `src/pages/Dashboard.tsx`
- **Line:** 430
- **Code:** `<div className="h-8 w-48 rounded-lg bg-surface-border" />`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 111. Incorrect Border Radius
- **File:** `src/pages/Education.tsx`
- **Line:** 253
- **Code:** `className={`w-full flex items-start gap-4 p-4 rounded-lg border text-left transition-all ${`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 112. Incorrect Border Radius
- **File:** `src/pages/Education.tsx`
- **Line:** 259
- **Code:** `<div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-content-primary/[0.05] text-content-prim...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 113. Incorrect Border Radius
- **File:** `src/pages/Education.tsx`
- **Line:** 315
- **Code:** `extraHeader={<span className="text-xs font-sans font-medium text-content-tertiary px-2 py-0.5 border...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 114. Incorrect Border Radius
- **File:** `src/pages/Education.tsx`
- **Line:** 327
- **Code:** `className="group flex items-center justify-between p-4 bg-surface-base border border-surface-border ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 115. Incorrect Border Radius
- **File:** `src/pages/Education.tsx`
- **Line:** 330
- **Code:** `<div className={`p-1.5 rounded-lg ${isDone ? 'text-emerald-500' : 'text-content-tertiary group-hover...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 116. Incorrect Border Radius
- **File:** `src/pages/Education.tsx`
- **Line:** 353
- **Code:** `className="px-6 py-2.5 rounded-lg bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm fo...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 117. Incorrect Border Radius
- **File:** `src/pages/Education.tsx`
- **Line:** 393
- **Code:** `<Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-surface-base border border...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 118. Incorrect Border Radius
- **File:** `src/pages/Education.tsx`
- **Line:** 420
- **Code:** `className="inline-flex items-center gap-2 justify-center rounded-lg bg-brand-cta px-6 py-2.5 text-xs...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 119. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 280
- **Code:** `className="border border-surface-border hover:bg-surface-elevated text-content-secondary text-sm fon...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 120. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 288
- **Code:** `className="bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font-sans font-semibold p...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 121. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 311
- **Code:** `className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-cta px-5 py-2.5 text-sm font-semi...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 122. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 329
- **Code:** `<span className="text-[10px] font-mono tabular-nums text-rose-500 border border-rose-500/20 px-1.5 p...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 123. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 330
- **Code:** `<span className="text-[10px] font-mono tabular-nums text-emerald-400 border border-emerald-400/20 px...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 124. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 332
- **Code:** `<span className="text-[10px] font-sans bg-surface-elevated text-content-primary border border-surfac...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 125. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 350
- **Code:** `className={`focus-app px-4 py-2 border text-xs font-sans font-semibold transition-all rounded-lg ${e...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 126. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 365
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-raised p-6">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 127. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 400
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-raised p-6">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 128. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 408
- **Code:** `<div className="rounded-lg border border-dashed border-surface-border bg-surface-base p-4 text-left"...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 129. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 412
- **Code:** `<div className="rounded-lg border border-dashed border-surface-border bg-surface-base p-4 text-left"...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 130. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 416
- **Code:** `<div className="rounded-lg border border-dashed border-surface-border bg-surface-base p-4 text-left"...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 131. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 457
- **Code:** `<form onSubmit={handleAddInvoice} className="lg:col-span-1 space-y-4 rounded-lg border border-surfac...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 132. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 464
- **Code:** `className="w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-c...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 133. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 475
- **Code:** `className="w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 134. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 486
- **Code:** `className="w-full rounded-lg border border-surface-border bg-surface-raised px-2 py-2 text-xs text-c...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 135. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 495
- **Code:** `className="w-full rounded-lg border border-surface-border bg-surface-raised px-2 py-2 text-xs text-c...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 136. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 504
- **Code:** `className="w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-c...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 137. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 510
- **Code:** `className="w-full rounded-lg bg-brand-cta py-2.5 text-sm font-semibold text-surface-base hover:bg-br...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 138. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 517
- **Code:** `<div className="rounded-lg border border-dashed border-surface-border p-10 text-center text-sm text-...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 139. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 521
- **Code:** `<ul className="divide-y divide-surface-border rounded-lg border border-surface-border bg-surface-bas...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 140. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 551
- **Code:** `className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-content-seco...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 141. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 560
- **Code:** `className="rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emeral...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 142. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 569
- **Code:** `className="rounded-lg px-3 py-1.5 text-xs text-content-muted hover:text-content-secondary"`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 143. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 614
- **Code:** `<input autoFocus type="text" value={formData.client} onChange={e => setFormData({ ...formData, clien...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 144. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 618
- **Code:** `<input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.tar...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 145. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 622
- **Code:** `<button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 h-12 border border-...`
- **Fix:** Use rounded-md (6px) for controls/buttons

### 146. Incorrect Border Radius
- **File:** `src/pages/Freelance.tsx`
- **Line:** 623
- **Code:** `<button type="submit" className="flex-[2] bg-brand-cta hover:bg-brand-cta-hover text-surface-base h-...`
- **Fix:** Use rounded-md (6px) for controls/buttons

### 147. Arbitrary Font Size
- **File:** `src/pages/Freelance.tsx`
- **Line:** 329
- **Code:** `<span className="text-[10px] font-mono tabular-nums text-rose-500 border border-rose-500/20 px-1.5 p...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 148. Arbitrary Font Size
- **File:** `src/pages/Freelance.tsx`
- **Line:** 330
- **Code:** `<span className="text-[10px] font-mono tabular-nums text-emerald-400 border border-emerald-400/20 px...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 149. Arbitrary Font Size
- **File:** `src/pages/Freelance.tsx`
- **Line:** 332
- **Code:** `<span className="text-[10px] font-sans bg-surface-elevated text-content-primary border border-surfac...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 150. Arbitrary Font Size
- **File:** `src/pages/Freelance.tsx`
- **Line:** 410
- **Code:** `<p className="mt-1 text-[11px] text-content-tertiary">Shows after you log payments.</p>`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 151. Arbitrary Font Size
- **File:** `src/pages/Freelance.tsx`
- **Line:** 414
- **Code:** `<p className="mt-1 text-[11px] text-content-tertiary">We&apos;ll estimate federal, state, and SE tax...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 152. Arbitrary Font Size
- **File:** `src/pages/Freelance.tsx`
- **Line:** 418
- **Code:** `<p className="mt-1 text-[11px] text-content-tertiary">Your gross freelance inflow for the period.</p...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 153. Arbitrary Font Size
- **File:** `src/pages/Freelance.tsx`
- **Line:** 528
- **Code:** `className={`text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded border ${`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 154. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 151
- **Code:** `className="flex-1 rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 155. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 166
- **Code:** `className="rounded-lg bg-brand-cta px-4 py-2 text-sm font-semibold text-surface-base hover:bg-brand-...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 156. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 174
- **Code:** `<li key={`${entry.at}-${idx}`} className="rounded-lg border border-surface-border bg-surface-elevate...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 157. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 192
- **Code:** `className="flex items-center gap-2 rounded-lg bg-brand-cta px-4 py-2.5 text-sm font-medium text-surf...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 158. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 200
- **Code:** `<div className="bg-surface-raised rounded-lg border border-surface-border p-6 mb-6">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 159. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 216
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 160. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 225
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 161. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 243
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg pl-7 pr-3 py-2 text-sm fon...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 162. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 257
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg pl-7 pr-3 py-2 text-sm fon...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 163. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 268
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 164. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 282
- **Code:** `className="px-6 py-2 rounded-lg bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 165. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 294
- **Code:** `<div className="relative rounded-lg border border-surface-border border-dashed bg-surface-raised/50 ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 166. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 311
- **Code:** `<div className="bg-surface-raised rounded-lg border border-surface-border border-dashed p-12 text-ce...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 167. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 312
- **Code:** `<div className="w-16 h-16 border border-surface-border rounded-lg flex items-center justify-center m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 168. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 320
- **Code:** `className="px-8 py-3 rounded-lg bg-brand-cta hover:bg-brand-cta-hover active:scale-[0.98] text-surfa...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 169. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 342
- **Code:** `className="bg-surface-elevated rounded-lg border border-surface-border overflow-hidden group hover:b...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 170. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 347
- **Code:** `<div className={`w-10 h-10 rounded-lg border border-surface-border flex items-center justify-center ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 171. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 382
- **Code:** `<div className="flex items-center justify-between bg-surface-base border border-surface-border round...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 172. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 398
- **Code:** `className="flex-1 bg-surface-base border border-surface-border rounded-lg px-3 py-1.5 text-sm font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 173. Incorrect Border Radius
- **File:** `src/pages/Goals.tsx`
- **Line:** 400
- **Code:** `<button type="submit" className="px-3 py-1.5 bg-brand-cta text-surface-base hover:bg-brand-cta-hover...`
- **Fix:** Use rounded-md (6px) for controls/buttons

### 174. Arbitrary Font Size
- **File:** `src/pages/Goals.tsx`
- **Line:** 295
- **Code:** `<div className="absolute -top-2.5 left-4 rounded-full border border-surface-border bg-surface-elevat...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 175. Arbitrary Font Size
- **File:** `src/pages/Goals.tsx`
- **Line:** 308
- **Code:** `<p className="mt-2 text-right text-[11px] text-content-muted">53% complete</p>`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 176. Arbitrary Font Size
- **File:** `src/pages/Goals.tsx`
- **Line:** 356
- **Code:** `<span className="inline-flex items-center text-[9px] font-mono font-bold uppercase tracking-widest t...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 177. Arbitrary Font Size
- **File:** `src/pages/Goals.tsx`
- **Line:** 383
- **Code:** `<span className="text-[10px] font-mono text-content-tertiary uppercase tracking-wider">Needed / mont...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 178. Incorrect Border Radius
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 154
- **Code:** `<div className="flex bg-surface-elevated p-1 rounded-lg border border-surface-border inline-flex">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 179. Incorrect Border Radius
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 206
- **Code:** `<div className={`p-2 border rounded-lg shrink-0 flex items-center justify-center ${`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 180. Incorrect Border Radius
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 218
- **Code:** `<span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg bo...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 181. Incorrect Border Radius
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 248
- **Code:** `<div className="p-12 text-center border border-surface-border rounded-lg bg-surface-raised">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 182. Incorrect Border Radius
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 255
- **Code:** `<div className="p-6 bg-amber-500/5 border border-amber-500/25 rounded-lg relative overflow-hidden">`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 183. Incorrect Border Radius
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 265
- **Code:** `<div key={msg.id} className="p-6 bg-surface-raised border border-surface-border rounded-lg relative ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 184. Incorrect Border Radius
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 285
- **Code:** `<Dialog.Panel className="mx-auto w-full max-w-lg bg-surface-elevated border border-surface-border sh...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 185. Incorrect Border Radius
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 299
- **Code:** `className="w-full bg-surface-base border border-surface-border text-content-primary text-sm rounded-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 186. Incorrect Border Radius
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 310
- **Code:** `className="w-full bg-surface-base border border-surface-border text-content-primary text-sm rounded-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 187. Incorrect Border Radius
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 323
- **Code:** `className="w-full bg-surface-base border border-surface-border text-content-primary text-sm rounded-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 188. Incorrect Border Radius
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 337
- **Code:** `className="w-full bg-surface-base border border-surface-border text-content-primary text-sm font-mon...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 189. Incorrect Border Radius
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 346
- **Code:** `<button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-brand-cta text-surface-base ho...`
- **Fix:** Use rounded-md (6px) for controls/buttons

### 190. Arbitrary Font Size
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 157
- **Code:** `className={`px-6 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors ${`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 191. Arbitrary Font Size
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 165
- **Code:** `className={`px-6 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors flex items-c...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 192. Arbitrary Font Size
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 183
- **Code:** `className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-content-prim...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 193. Arbitrary Font Size
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 217
- **Code:** `<span className="text-[10px] font-mono text-content-tertiary">{ticket.id}</span>`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 194. Arbitrary Font Size
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 218
- **Code:** `<span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg bo...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 195. Arbitrary Font Size
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 225
- **Code:** `<span className="text-[9px] font-mono text-content-muted uppercase tracking-widest">{ticket.departme...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 196. Arbitrary Font Size
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 231
- **Code:** `<div className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest mb-1">{ticket....`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 197. Arbitrary Font Size
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 232
- **Code:** `<div className="text-[10px] font-mono text-content-muted">{ticket.date}</div>`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 198. Arbitrary Font Size
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 259
- **Code:** `<span className="text-[10px] font-mono text-amber-400/80">From admin dashboard</span>`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 199. Arbitrary Font Size
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 271
- **Code:** `<span className="text-[10px] font-mono text-content-tertiary">{msg.date}</span>`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 200. Arbitrary Font Size
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 293
- **Code:** `<label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-wid...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 201. Arbitrary Font Size
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 306
- **Code:** `<label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-wid...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 202. Arbitrary Font Size
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 319
- **Code:** `<label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-wid...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 203. Arbitrary Font Size
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 333
- **Code:** `<label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-wid...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 204. Arbitrary Font Size
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 343
- **Code:** `<button type="button" onClick={() => setIsNewTicketOpen(false)} className="px-4 py-2 text-[10px] fon...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 205. Arbitrary Font Size
- **File:** `src/pages/HelpDesk.tsx`
- **Line:** 346
- **Code:** `<button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-brand-cta text-surface-base ho...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 206. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 182
- **Code:** `className="px-4 py-2 rounded-lg bg-brand-cta hover:bg-brand-cta-hover text-surface-base shadow-sm tr...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 207. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 190
- **Code:** `<div className="bg-surface-raised rounded-lg border border-surface-border py-20 px-6 flex flex-col i...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 208. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 191
- **Code:** `<div className="w-12 h-12 border border-surface-border bg-surface-elevated rounded-lg flex items-cen...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 209. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 202
- **Code:** `className="mt-6 px-6 py-3 rounded-lg bg-brand-cta hover:bg-brand-cta-hover active:scale-[0.98] text-...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 210. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 221
- **Code:** `<div className="bg-surface-elevated rounded-lg border border-surface-border p-5">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 211. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 230
- **Code:** `<div className="bg-surface-elevated rounded-lg border border-surface-border p-5">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 212. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 251
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-elevated p-4">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 213. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 257
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-elevated p-4">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 214. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 263
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-elevated p-4">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 215. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 293
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg h-10 px-3 text-sm font-mon...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 216. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 307
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg h-10 px-3 text-sm font-mon...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 217. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 323
- **Code:** `className="inline-flex items-center gap-2 rounded-lg bg-brand-cta hover:bg-brand-cta-hover text-surf...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 218. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 346
- **Code:** `className="bg-surface-elevated rounded-lg border border-surface-border p-5 flex flex-col relative gr...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 219. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 365
- **Code:** `<Menu.Button className="text-content-tertiary hover:text-content-primary transition-colors p-1 round...`
- **Fix:** Use rounded-md (6px) for controls/buttons

### 220. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 377
- **Code:** `<Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg bg-surface-elevated bo...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 221. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 446
- **Code:** `<Dialog.Panel className="mx-auto max-w-md w-full rounded-lg bg-surface-raised border border-surface-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 222. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 464
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 223. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 481
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg pl-7 pr-3 py-2 text-sm fon...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 224. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 491
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 225. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 509
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 226. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 520
- **Code:** `className="input-date-dark w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 227. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 531
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 228. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 540
- **Code:** `<div className="flex items-center gap-4 bg-surface-base border border-surface-border p-3 rounded-lg"...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 229. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 545
- **Code:** `className="w-4 h-4 rounded-lg border-surface-border text-content-primary focus-app bg-surface-raised...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 230. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 557
- **Code:** `className="w-full rounded-lg bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font-sa...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 231. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 571
- **Code:** `<Dialog.Panel className="mx-auto max-w-sm w-full rounded-lg bg-surface-raised border border-surface-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 232. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 580
- **Code:** `<div className="bg-surface-elevated rounded-lg p-4 border border-surface-border">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 233. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 596
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg pl-7 pr-3 py-2 text-xl fon...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 234. Incorrect Border Radius
- **File:** `src/pages/Income.tsx`
- **Line:** 604
- **Code:** `className="w-full rounded-lg bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font-sa...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 235. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 342
- **Code:** `className={`border-2 border-dashed rounded-lg p-20 text-center transition-all cursor-pointer ${`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 236. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 359
- **Code:** `<div className="grid grid-cols-1 gap-px bg-surface-border border border-surface-border rounded-lg ov...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 237. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 383
- **Code:** `<div className="w-10 h-10 bg-surface-raised border border-surface-border rounded-lg flex items-cente...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 238. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 464
- **Code:** `className="bg-surface-raised border border-surface-border text-xs font-mono font-bold uppercase trac...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 239. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 477
- **Code:** `className={`p-2 transition-all rounded-lg ${selectedId === item.id ? 'text-content-primary bg-conten...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 240. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 484
- **Code:** `className={`p-2 rounded-lg transition-all ${item.status === 'ready' ? 'text-emerald-500 hover:bg-eme...`
- **Fix:** Use rounded-full for badges/pills

### 241. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 490
- **Code:** `className="p-2 text-content-tertiary hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 242. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 571
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 243. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 598
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 244. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 612
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 245. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 630
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 246. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 645
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 247. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 659
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 248. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 676
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 249. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 692
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 250. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 704
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 251. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 732
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 252. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 744
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 253. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 763
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 254. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 780
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 255. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 798
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 256. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 809
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 257. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 817
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 258. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 838
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xl font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 259. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 869
- **Code:** `className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 260. Incorrect Border Radius
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 884
- **Code:** `className="px-10 py-3 bg-brand-cta text-surface-base hover:bg-brand-cta-hover rounded-lg text-[10px]...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 261. Arbitrary Font Size
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 546
- **Code:** `<p className="text-[10px] font-mono text-content-muted uppercase tracking-widest">No Preview Availab...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 262. Arbitrary Font Size
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 842
- **Code:** `<label className="text-[9px] font-mono text-content-tertiary uppercase tracking-[0.2em] block mb-3 f...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 263. Arbitrary Font Size
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 878
- **Code:** `className="text-[10px] font-mono font-bold uppercase tracking-widest text-content-tertiary hover:tex...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 264. Arbitrary Font Size
- **File:** `src/pages/Ingestion.tsx`
- **Line:** 884
- **Code:** `className="px-10 py-3 bg-brand-cta text-surface-base hover:bg-brand-cta-hover rounded-lg text-[10px]...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 265. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 147
- **Code:** `className="inline-flex items-center gap-2 rounded-lg bg-brand-cta px-4 py-2 text-sm font-medium text...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 266. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 156
- **Code:** `<div className="flex items-start gap-3 rounded-lg border border-surface-border bg-surface-raised p-4...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 267. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 167
- **Code:** `className="shrink-0 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 268. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 184
- **Code:** `className={`flex items-start gap-3 rounded-lg border p-3 ${`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 269. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 213
- **Code:** `<div className="flex items-center justify-between rounded-lg border border-surface-border bg-surface...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 270. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 223
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-elevated p-12 text-center">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 271. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 224
- **Code:** `<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-sur...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 272. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 234
- **Code:** `className="inline-flex items-center gap-2 rounded-lg bg-brand-cta px-4 py-2.5 text-sm font-medium te...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 273. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 246
- **Code:** `className="flex items-start justify-between gap-4 rounded-lg border border-surface-border bg-surface...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 274. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 306
- **Code:** `<Dialog.Panel className="w-full max-w-lg rounded-lg border border-surface-border bg-surface-elevated...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 275. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 326
- **Code:** `className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 276. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 338
- **Code:** `className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 277. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 353
- **Code:** `className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 278. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 366
- **Code:** `className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 279. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 374
- **Code:** `className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 280. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 390
- **Code:** `className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 281. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 402
- **Code:** `className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 282. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 411
- **Code:** `className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 283. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 421
- **Code:** `className="focus-app-field w-full resize-none rounded-lg border border-surface-border bg-surface-bas...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 284. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 429
- **Code:** `className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-transparent px-...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 285. Incorrect Border Radius
- **File:** `src/pages/Insurance.tsx`
- **Line:** 435
- **Code:** `className="inline-flex items-center gap-2 rounded-lg bg-brand-cta px-4 py-2 text-sm font-medium text...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 286. Arbitrary Font Size
- **File:** `src/pages/Insurance.tsx`
- **Line:** 197
- **Code:** `<span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 287. Arbitrary Font Size
- **File:** `src/pages/Insurance.tsx`
- **Line:** 251
- **Code:** `<span className="rounded-full border border-surface-border bg-content-primary/[0.04] px-1.5 py-0.5 t...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 288. Arbitrary Font Size
- **File:** `src/pages/Insurance.tsx`
- **Line:** 255
- **Code:** `<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 b...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 289. Arbitrary Font Size
- **File:** `src/pages/Insurance.tsx`
- **Line:** 260
- **Code:** `<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 290. Incorrect Border Radius
- **File:** `src/pages/Investments.tsx`
- **Line:** 97
- **Code:** `<div className="skeleton-shimmer rounded-lg w-10 h-10 shrink-0" />`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 291. Incorrect Border Radius
- **File:** `src/pages/Investments.tsx`
- **Line:** 360
- **Code:** `className="inline-flex items-center gap-2 rounded-lg bg-content-primary px-4 py-2 text-sm font-mediu...`
- **Fix:** Use rounded-md (6px) for controls/buttons

### 292. Incorrect Border Radius
- **File:** `src/pages/Investments.tsx`
- **Line:** 385
- **Code:** `className="mt-8 inline-flex items-center gap-2 rounded-lg bg-content-primary px-8 py-3 text-sm font-...`
- **Fix:** Use rounded-md (6px) for controls/buttons

### 293. Incorrect Border Radius
- **File:** `src/pages/Investments.tsx`
- **Line:** 452
- **Code:** `<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 294. Incorrect Border Radius
- **File:** `src/pages/Investments.tsx`
- **Line:** 567
- **Code:** `className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 295. Incorrect Border Radius
- **File:** `src/pages/Investments.tsx`
- **Line:** 577
- **Code:** `className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 296. Incorrect Border Radius
- **File:** `src/pages/Investments.tsx`
- **Line:** 595
- **Code:** `className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 297. Incorrect Border Radius
- **File:** `src/pages/Investments.tsx`
- **Line:** 613
- **Code:** `className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base py-2 pl-7 ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 298. Incorrect Border Radius
- **File:** `src/pages/Investments.tsx`
- **Line:** 625
- **Code:** `className="focus-app-field w-full resize-none rounded-lg border border-surface-border bg-surface-bas...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 299. Incorrect Border Radius
- **File:** `src/pages/Investments.tsx`
- **Line:** 635
- **Code:** `className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-transparent px-...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 300. Incorrect Border Radius
- **File:** `src/pages/Investments.tsx`
- **Line:** 641
- **Code:** `className="inline-flex items-center gap-2 rounded-lg bg-brand-cta px-4 py-2 text-sm font-medium text...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 301. Arbitrary Font Size
- **File:** `src/pages/Investments.tsx`
- **Line:** 155
- **Code:** `<span className="text-[10px] font-mono uppercase tracking-wider text-content-tertiary">Mix</span>`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 302. Arbitrary Font Size
- **File:** `src/pages/Investments.tsx`
- **Line:** 159
- **Code:** `<span className="text-[10px] text-content-tertiary">invested</span>`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 303. Arbitrary Font Size
- **File:** `src/pages/Investments.tsx`
- **Line:** 213
- **Code:** `<span className="text-[10px] font-mono font-medium uppercase tracking-[0.12em] text-content-tertiary...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 304. Arbitrary Font Size
- **File:** `src/pages/Investments.tsx`
- **Line:** 459
- **Code:** `className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semi...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 305. Arbitrary Font Size
- **File:** `src/pages/Investments.tsx`
- **Line:** 473
- **Code:** `<p className="text-[11px] text-content-tertiary mt-2">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 306. Incorrect Border Radius
- **File:** `src/pages/Landing.tsx`
- **Line:** 432
- **Code:** `<article key={number} className="grid gap-4 rounded-[22px] border border-surface-border-subtle bg-su...`
- **Fix:** Use design system tokens: rounded-md (6px), rounded-xl (12px), rounded-[22px] (panels), or rounded-full (badges)

### 307. Incorrect Border Radius
- **File:** `src/pages/Landing.tsx`
- **Line:** 494
- **Code:** `<div className="relative overflow-hidden rounded-[22px] border border-surface-border bg-surface-rais...`
- **Fix:** Use design system tokens: rounded-md (6px), rounded-xl (12px), rounded-[22px] (panels), or rounded-full (badges)

### 308. Incorrect Border Radius
- **File:** `src/pages/NetWorth.tsx`
- **Line:** 94
- **Code:** `<div className="bg-surface-raised rounded-lg border border-surface-border p-6 relative overflow-hidd...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 309. Incorrect Border Radius
- **File:** `src/pages/NetWorth.tsx`
- **Line:** 105
- **Code:** `<div className="bg-surface-raised rounded-lg border border-surface-border p-6 relative overflow-hidd...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 310. Incorrect Border Radius
- **File:** `src/pages/NetWorth.tsx`
- **Line:** 115
- **Code:** `<div className="bg-surface-raised rounded-lg border border-surface-border p-6 relative overflow-hidd...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 311. Incorrect Border Radius
- **File:** `src/pages/Obligations.tsx`
- **Line:** 571
- **Code:** `<div className="flex items-center gap-3 bg-surface-base border border-surface-border rounded-lg px-3...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 312. Incorrect Border Radius
- **File:** `src/pages/Obligations.tsx`
- **Line:** 735
- **Code:** `<span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-lg ${activeTab === tab.key ? 'bg-conte...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 313. Incorrect Border Radius
- **File:** `src/pages/Obligations.tsx`
- **Line:** 1057
- **Code:** `<Dialog.Panel className="w-full max-w-md rounded-lg border border-surface-border bg-surface-elevated...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 314. Incorrect Border Radius
- **File:** `src/pages/Obligations.tsx`
- **Line:** 1064
- **Code:** `className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 315. Incorrect Border Radius
- **File:** `src/pages/Obligations.tsx`
- **Line:** 1072
- **Code:** `className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 316. Incorrect Border Radius
- **File:** `src/pages/Obligations.tsx`
- **Line:** 1078
- **Code:** `className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 317. Incorrect Border Radius
- **File:** `src/pages/Obligations.tsx`
- **Line:** 1085
- **Code:** `className="input-date-dark w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 318. Incorrect Border Radius
- **File:** `src/pages/Obligations.tsx`
- **Line:** 1091
- **Code:** `className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 319. Incorrect Border Radius
- **File:** `src/pages/Obligations.tsx`
- **Line:** 1168
- **Code:** `<Dialog.Panel className="w-full max-w-md rounded-lg border border-surface-border bg-surface-elevated...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 320. Incorrect Border Radius
- **File:** `src/pages/Obligations.tsx`
- **Line:** 1176
- **Code:** `className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 321. Incorrect Border Radius
- **File:** `src/pages/Obligations.tsx`
- **Line:** 1183
- **Code:** `className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 322. Incorrect Border Radius
- **File:** `src/pages/Obligations.tsx`
- **Line:** 1191
- **Code:** `className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 323. Incorrect Border Radius
- **File:** `src/pages/Obligations.tsx`
- **Line:** 1199
- **Code:** `className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 324. Incorrect Border Radius
- **File:** `src/pages/Obligations.tsx`
- **Line:** 1207
- **Code:** `className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 325. Incorrect Border Radius
- **File:** `src/pages/Obligations.tsx`
- **Line:** 1225
- **Code:** `className="input-date-dark w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 326. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 422
- **Code:** `{urgentCitations.length > 0 && <span className="text-[9px] font-mono font-bold text-[var(--color-sta...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 327. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 619
- **Code:** `<p className="text-[10px] font-mono text-content-tertiary uppercase tracking-wider">Payoff Order — {...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 328. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 632
- **Code:** `<span className="w-5 h-5 bg-content-primary/[0.08] border border-surface-border text-content-primary...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 329. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 634
- **Code:** `<span className="text-[10px] font-mono text-content-muted border border-surface-border px-1.5 py-0.5...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 330. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 641
- **Code:** `<div className="flex justify-between text-[10px] font-mono text-content-muted mt-0.5">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 331. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 648
- **Code:** `className="text-[10px] font-mono text-content-muted hover:text-content-primary transition-colors upp...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 332. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 664
- **Code:** `<p className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest mb-2">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 333. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 683
- **Code:** `<span className="text-[10px] font-mono text-content-primary">■ Principal</span>`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 334. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 684
- **Code:** `<span className="text-[10px] font-mono text-red-400">■ Interest</span>`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 335. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 685
- **Code:** `<span className="text-[10px] font-mono text-content-muted ml-auto">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 336. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 735
- **Code:** `<span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-lg ${activeTab === tab.key ? 'bg-conte...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 337. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 749
- **Code:** `<th className="px-6 py-3 text-[10px] font-mono text-content-tertiary uppercase tracking-wider">Descr...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 338. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 750
- **Code:** `<th className="px-6 py-3 text-[10px] font-mono text-content-tertiary uppercase tracking-wider">Categ...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 339. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 751
- **Code:** `<th className="px-6 py-3 text-[10px] font-mono text-content-tertiary uppercase tracking-wider">Due D...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 340. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 752
- **Code:** `<th className="px-6 py-3 text-[10px] font-mono text-content-tertiary uppercase tracking-wider text-r...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 341. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 753
- **Code:** `<th className="px-6 py-3 text-[10px] font-mono text-content-tertiary uppercase tracking-wider text-r...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 342. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 797
- **Code:** `<span className="ml-2 inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 343. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 816
- **Code:** `<span className="ml-2 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-ambe...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 344. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 821
- **Code:** `<span className="ml-2 inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 345. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 827
- **Code:** `<p className="max-w-xs text-[11px] text-content-tertiary leading-snug">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 346. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 832
- **Code:** `<p className="max-w-xs text-[11px] text-rose-300/90 leading-snug">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 347. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 847
- **Code:** `className="inline-flex items-center gap-1 self-start text-[11px] font-medium text-[var(--color-statu...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 348. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 895
- **Code:** `className="inline-flex items-center gap-1.5 px-2 py-1 text-content-tertiary hover:text-content-secon...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 349. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 909
- **Code:** `className="inline-flex items-center gap-1.5 px-2 py-1 text-content-tertiary hover:text-content-secon...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 350. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 983
- **Code:** `<th className="px-2 py-2 text-[10px] font-mono uppercase tracking-wider text-content-tertiary">Date<...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 351. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 984
- **Code:** `<th className="px-2 py-2 text-[10px] font-mono uppercase tracking-wider text-content-tertiary">Descr...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 352. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 985
- **Code:** `<th className="px-2 py-2 text-[10px] font-mono uppercase tracking-wider text-content-tertiary">Categ...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 353. Arbitrary Font Size
- **File:** `src/pages/Obligations.tsx`
- **Line:** 986
- **Code:** `<th className="px-2 py-2 text-[10px] font-mono uppercase tracking-wider text-content-tertiary text-r...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 354. Incorrect Border Radius
- **File:** `src/pages/Onboarding.tsx`
- **Line:** 471
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-base/80 p-4">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 355. Incorrect Border Radius
- **File:** `src/pages/Pricing.tsx`
- **Line:** 269
- **Code:** `<div className="mt-5 inline-flex items-center gap-1 rounded-lg border border-surface-border-subtle b...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 356. Incorrect Border Radius
- **File:** `src/pages/Reports.tsx`
- **Line:** 171
- **Code:** `<div className="flex bg-surface-raised border border-surface-border rounded-lg p-1">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 357. Incorrect Border Radius
- **File:** `src/pages/Reports.tsx`
- **Line:** 176
- **Code:** `className={`px-3 py-1 text-xs font-sans font-medium rounded-lg transition-colors ${`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 358. Incorrect Border Radius
- **File:** `src/pages/Reports.tsx`
- **Line:** 189
- **Code:** `className="flex items-center gap-2 bg-transparent border border-surface-border text-content-secondar...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 359. Incorrect Border Radius
- **File:** `src/pages/Reports.tsx`
- **Line:** 206
- **Code:** `<div key={card.label} className="bg-surface-elevated border border-surface-border rounded-lg p-5">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 360. Incorrect Border Radius
- **File:** `src/pages/Reports.tsx`
- **Line:** 220
- **Code:** `<div key={label} className="bg-surface-elevated border border-surface-border rounded-lg p-5">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 361. Incorrect Border Radius
- **File:** `src/pages/Reports.tsx`
- **Line:** 290
- **Code:** `<span className="w-2 h-2 shrink-0 rounded-sm" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY...`
- **Fix:** Use rounded-md (6px) instead of rounded-sm

### 362. Incorrect Border Radius
- **File:** `src/pages/Savings.tsx`
- **Line:** 106
- **Code:** `className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-4 py-2.5 text-s...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 363. Incorrect Border Radius
- **File:** `src/pages/Savings.tsx`
- **Line:** 115
- **Code:** `<div className="rounded-lg border border-dashed border-surface-border bg-surface-raised p-8 text-cen...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 364. Incorrect Border Radius
- **File:** `src/pages/Savings.tsx`
- **Line:** 123
- **Code:** `className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-cta px-5 py-2.5 text-sm ...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 365. Incorrect Border Radius
- **File:** `src/pages/Savings.tsx`
- **Line:** 131
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-raised p-6">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 366. Incorrect Border Radius
- **File:** `src/pages/Savings.tsx`
- **Line:** 182
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-raised p-5">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 367. Incorrect Border Radius
- **File:** `src/pages/Savings.tsx`
- **Line:** 188
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-raised p-5">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 368. Incorrect Border Radius
- **File:** `src/pages/Savings.tsx`
- **Line:** 194
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-raised p-5">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 369. Incorrect Border Radius
- **File:** `src/pages/Savings.tsx`
- **Line:** 241
- **Code:** `<p className="text-sm text-content-tertiary text-center py-8 rounded-lg border border-dashed border-...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 370. Arbitrary Font Size
- **File:** `src/pages/Savings.tsx`
- **Line:** 157
- **Code:** `<span className="ml-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10p...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 371. Incorrect Border Radius
- **File:** `src/pages/Settings.tsx`
- **Line:** 189
- **Code:** `<Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-surface-raised border border-surface-border ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 372. Incorrect Border Radius
- **File:** `src/pages/Settings.tsx`
- **Line:** 208
- **Code:** `className="mb-6 w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm tex...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 373. Incorrect Border Radius
- **File:** `src/pages/Settings.tsx`
- **Line:** 240
- **Code:** `<Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-surface-raised border border-surface-border ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 374. Incorrect Border Radius
- **File:** `src/pages/Settings.tsx`
- **Line:** 252
- **Code:** `<div className="mb-5 rounded-lg border border-surface-border bg-surface-base p-3 text-xs text-conten...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 375. Incorrect Border Radius
- **File:** `src/pages/Settings.tsx`
- **Line:** 287
- **Code:** `className="mb-6 w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm tex...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 376. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 234
- **Code:** `className="px-4 py-2 rounded-lg bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 377. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 243
- **Code:** `<div className="flex flex-wrap items-center gap-2 rounded-lg border border-surface-border bg-surface...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 378. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 255
- **Code:** `<div className="rounded-lg border border-brand-cta/25 bg-brand-cta/10 p-4">`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 379. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 274
- **Code:** `<div id="suggested-subscriptions" className="scroll-mt-24 rounded-lg border border-surface-border bg...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 380. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 283
- **Code:** `className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-border...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 381. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 306
- **Code:** `className="shrink-0 rounded-lg bg-brand-cta px-4 py-2 text-xs font-semibold text-surface-base hover:...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 382. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 318
- **Code:** `<div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 383. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 357
- **Code:** `<div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 384. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 405
- **Code:** `<div className="bg-surface-elevated overflow-hidden rounded-lg border border-surface-border p-5">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 385. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 412
- **Code:** `<div className="bg-surface-elevated rounded-lg border border-surface-border p-5">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 386. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 423
- **Code:** `<div className="bg-surface-elevated overflow-hidden rounded-lg border border-surface-border p-5">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 387. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 434
- **Code:** `<div className="bg-surface-raised rounded-lg border border-surface-border p-6 mb-6">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 388. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 452
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 389. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 467
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg pl-7 pr-3 py-2 text-sm fon...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 390. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 477
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 391. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 492
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 392. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 506
- **Code:** `className="px-6 py-2 rounded-lg bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 393. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 516
- **Code:** `<div className="bg-surface-raised rounded-lg border border-surface-border border-dashed p-12 text-ce...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 394. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 517
- **Code:** `<div className="w-16 h-16 border border-surface-border rounded-lg flex items-center justify-center m...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 395. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 527
- **Code:** `className="px-8 py-3 rounded-lg bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 396. Incorrect Border Radius
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 554
- **Code:** `<span className="flex items-center gap-1 text-[9px] font-mono font-bold text-amber-400 border border...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 397. Arbitrary Font Size
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 554
- **Code:** `<span className="flex items-center gap-1 text-[9px] font-mono font-bold text-amber-400 border border...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 398. Arbitrary Font Size
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 573
- **Code:** `return <span className="text-[10px] font-mono text-content-muted">(was ${hike.prev.toFixed(2)})</spa...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 399. Arbitrary Font Size
- **File:** `src/pages/Subscriptions.tsx`
- **Line:** 583
- **Code:** `<p className="text-[10px] text-amber-300 mt-1">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 400. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 253
- **Code:** `<div className="mt-3 inline-flex rounded-lg border border-surface-border bg-surface-raised p-1">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 401. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 286
- **Code:** `className="bg-surface-raised border border-surface-border text-sm font-sans text-content-primary px-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 402. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 292
- **Code:** `<div className="flex bg-surface-raised border border-surface-border rounded-lg p-1">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 403. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 295
- **Code:** `className={`px-3 py-1 text-xs font-sans font-medium rounded-lg transition-colors ${filingStatus === ...`
- **Fix:** Use rounded-full for badges/pills

### 404. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 299
- **Code:** `className={`px-3 py-1 text-xs font-sans font-medium rounded-lg transition-colors ${filingStatus === ...`
- **Fix:** Use rounded-full for badges/pills

### 405. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 307
- **Code:** `<div className="bg-surface-raised border border-surface-border rounded-lg p-4 flex flex-col sm:flex-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 406. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 317
- **Code:** `className="inline-flex items-center justify-center gap-2 rounded-lg border border-surface-border bg-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 407. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 330
- **Code:** `className="rounded-lg border border-surface-border bg-surface-elevated p-4"`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 408. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 344
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-elevated/50 p-4 flex flex-col sm:...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 409. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 371
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg h-10 px-3 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 410. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 386
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg h-10 px-3 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 411. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 402
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg h-10 px-3 text-sm font-mon...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 412. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 413
- **Code:** `className="flex-1 bg-surface-base border border-surface-border rounded-lg h-10 px-3 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 413. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 420
- **Code:** `className="flex-1 bg-surface-base border border-surface-border rounded-lg h-10 px-3 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 414. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 431
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg h-10 px-3 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 415. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 442
- **Code:** `className="w-full bg-surface-base border border-surface-border rounded-lg h-10 px-3 text-sm font-mon...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 416. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 482
- **Code:** `className="bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font-sans font-semibold p...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 417. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 539
- **Code:** `<div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-4 flex items-start gap-3 sha...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 418. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 549
- **Code:** `<span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-72 -translate-x-1/2 r...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 419. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 673
- **Code:** `<button type="button" onClick={() => setShowAddForm(!showAddForm)} className="bg-brand-cta hover:bg-...`
- **Fix:** Use rounded-md (6px) for controls/buttons

### 420. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 679
- **Code:** `<input type="text" placeholder="e.g. Adobe Suite" value={newDeduction.name} onChange={e => setNewDed...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 421. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 683
- **Code:** `<input type="number" placeholder="0.00" value={newDeduction.amount} onChange={e => setNewDeduction({...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 422. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 693
- **Code:** `}} className="bg-emerald-500 text-surface-base h-10 px-4 text-sm font-sans font-semibold rounded-lg ...`
- **Fix:** Use rounded-md (6px) for controls/buttons

### 423. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 718
- **Code:** `<div key={q.label} className={`p-4 rounded-lg border ${q.overdue ? 'bg-surface-raised border-surface...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 424. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 721
- **Code:** `{q.overdue ? <span className="bg-surface-elevated text-content-tertiary text-xs px-2 py-0.5 rounded-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 425. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 729
- **Code:** `<span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 r...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 426. Incorrect Border Radius
- **File:** `src/pages/Taxes.tsx`
- **Line:** 745
- **Code:** `<div className="bg-surface-raised border border-surface-border p-6 rounded-lg space-y-6">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 427. Arbitrary Font Size
- **File:** `src/pages/Taxes.tsx`
- **Line:** 549
- **Code:** `<span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-72 -translate-x-1/2 r...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 428. Arbitrary Font Size
- **File:** `src/pages/Taxes.tsx`
- **Line:** 729
- **Code:** `<span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 r...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 429. Incorrect Border Radius
- **File:** `src/pages/Transactions.tsx`
- **Line:** 12
- **Code:** `'inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transitio...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 430. Incorrect Border Radius
- **File:** `src/pages/Transactions.tsx`
- **Line:** 193
- **Code:** `className="block w-full pl-10 pr-3 py-2 border border-surface-border rounded-lg leading-5 bg-surface...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 431. Incorrect Border Radius
- **File:** `src/pages/Transactions.tsx`
- **Line:** 232
- **Code:** `className="block w-full px-3 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 432. Incorrect Border Radius
- **File:** `src/pages/Transactions.tsx`
- **Line:** 247
- **Code:** `className="block w-full px-3 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 433. Incorrect Border Radius
- **File:** `src/pages/Transactions.tsx`
- **Line:** 266
- **Code:** `className="block w-full px-3 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 434. Incorrect Border Radius
- **File:** `src/pages/Transactions.tsx`
- **Line:** 285
- **Code:** `className="block w-full px-2 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 435. Incorrect Border Radius
- **File:** `src/pages/Transactions.tsx`
- **Line:** 292
- **Code:** `className="block w-full px-2 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 436. Incorrect Border Radius
- **File:** `src/pages/Transactions.tsx`
- **Line:** 307
- **Code:** `className="block w-full px-2 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 437. Incorrect Border Radius
- **File:** `src/pages/Transactions.tsx`
- **Line:** 315
- **Code:** `className="block w-full px-2 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 438. Incorrect Border Radius
- **File:** `src/pages/Transactions.tsx`
- **Line:** 496
- **Code:** `className="rounded-lg border border-surface-border bg-surface-base px-2 py-0.5 text-[9px] font-mono ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 439. Incorrect Border Radius
- **File:** `src/pages/Transactions.tsx`
- **Line:** 536
- **Code:** `className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 440. Incorrect Border Radius
- **File:** `src/pages/Transactions.tsx`
- **Line:** 591
- **Code:** `className="inline-flex max-w-[10rem] truncate text-left text-[10px] font-mono uppercase tracking-wid...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 441. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 180
- **Code:** `extraHeader={<span className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest"...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 442. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 226
- **Code:** `<label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-content-muted mb-2 flex...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 443. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 232
- **Code:** `className="block w-full px-3 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 444. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 241
- **Code:** `<label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-content-muted mb-2 flex...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 445. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 247
- **Code:** `className="block w-full px-3 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 446. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 257
- **Code:** `<label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-content-muted mb-2 flex...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 447. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 266
- **Code:** `className="block w-full px-3 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 448. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 277
- **Code:** `<label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-content-muted mb-2 flex...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 449. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 285
- **Code:** `className="block w-full px-2 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 450. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 292
- **Code:** `className="block w-full px-2 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 451. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 298
- **Code:** `<label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-content-muted mb-2 flex...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 452. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 307
- **Code:** `className="block w-full px-2 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 453. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 315
- **Code:** `className="block w-full px-2 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 454. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 376
- **Code:** `<th scope="col" className="px-6 py-4 text-left text-[10px] font-mono font-bold text-content-muted up...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 455. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 379
- **Code:** `<th scope="col" className="px-6 py-4 text-left text-[10px] font-mono font-bold text-content-muted up...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 456. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 382
- **Code:** `<th scope="col" className="px-6 py-4 text-left text-[10px] font-mono font-bold text-content-muted up...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 457. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 385
- **Code:** `<th scope="col" className="px-6 py-4 text-left text-[10px] font-mono font-bold text-content-muted up...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 458. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 388
- **Code:** `<th scope="col" className="px-6 py-4 text-right text-[10px] font-mono font-bold text-content-muted u...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 459. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 426
- **Code:** `<span className="flex items-center gap-1 text-[8px] bg-rose-500 text-surface-base px-1.5 font-black ...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 460. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 436
- **Code:** `className="inline-flex items-center gap-1 rounded border border-surface-border bg-surface-base px-2 ...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 461. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 451
- **Code:** `className="inline-flex items-center gap-1 rounded border border-surface-border bg-surface-base px-2 ...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 462. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 461
- **Code:** `className="inline-flex items-center gap-1 rounded border border-surface-border bg-surface-base px-2 ...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 463. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 476
- **Code:** `className="inline-flex items-center gap-1 rounded border border-surface-border bg-surface-base px-2 ...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 464. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 486
- **Code:** `<td className="px-6 py-4 whitespace-nowrap text-[10px] font-mono text-content-tertiary uppercase tra...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 465. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 496
- **Code:** `className="rounded-lg border border-surface-border bg-surface-base px-2 py-0.5 text-[9px] font-mono ...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 466. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 536
- **Code:** `className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase ...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 467. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 544
- **Code:** `className="inline-flex items-center w-fit rounded border border-amber-500/30 bg-amber-500/10 px-1.5 ...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 468. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 575
- **Code:** `className="w-full rounded border border-surface-border bg-surface-base px-2 py-1 text-[10px] font-mo...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 469. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 579
- **Code:** `<span className="text-[9px] text-content-muted">Enter to save · Esc cancel</span>`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 470. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 591
- **Code:** `className="inline-flex max-w-[10rem] truncate text-left text-[10px] font-mono uppercase tracking-wid...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 471. Arbitrary Font Size
- **File:** `src/pages/Transactions.tsx`
- **Line:** 613
- **Code:** `<span className="text-[10px] font-mono text-content-muted uppercase tracking-widest">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 472. Incorrect Border Radius
- **File:** `src/pages/settings/BillingPanel.tsx`
- **Line:** 329
- **Code:** `<section className="overflow-hidden rounded-lg border border-surface-border bg-surface-raised shadow...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 473. Incorrect Border Radius
- **File:** `src/pages/settings/BillingPanel.tsx`
- **Line:** 411
- **Code:** `<section className="rounded-lg border border-surface-border bg-surface-raised p-5">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 474. Incorrect Border Radius
- **File:** `src/pages/settings/BillingPanel.tsx`
- **Line:** 437
- **Code:** `<section className="rounded-lg border border-surface-border bg-surface-raised p-5">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 475. Incorrect Border Radius
- **File:** `src/pages/settings/BillingPanel.tsx`
- **Line:** 474
- **Code:** `<section className="rounded-lg border border-surface-border bg-surface-raised p-5">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 476. Incorrect Border Radius
- **File:** `src/pages/settings/BillingPanel.tsx`
- **Line:** 492
- **Code:** `<section className="rounded-lg border border-[var(--color-status-rose-border)] bg-[var(--color-statu...`
- **Fix:** Use rounded-full for badges/pills

### 477. Arbitrary Font Size
- **File:** `src/pages/settings/FeedbackPanel.tsx`
- **Line:** 127
- **Code:** `<div className="flex justify-between text-[10px] font-medium text-content-muted px-0.5">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 478. Incorrect Border Radius
- **File:** `src/pages/settings/FinancialPanel.tsx`
- **Line:** 51
- **Code:** `className="focus-app-field block w-full rounded-lg border border-surface-border bg-surface-raised px...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 479. Incorrect Border Radius
- **File:** `src/pages/settings/FinancialPanel.tsx`
- **Line:** 70
- **Code:** `className="focus-app-field block w-full rounded-lg border border-surface-border bg-surface-raised px...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 480. Incorrect Border Radius
- **File:** `src/pages/settings/FinancialPanel.tsx`
- **Line:** 84
- **Code:** `className="rounded-lg bg-brand-cta px-5 py-2.5 text-sm font-medium text-surface-base hover:bg-brand-...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 481. Incorrect Border Radius
- **File:** `src/pages/settings/HouseholdPanel.tsx`
- **Line:** 24
- **Code:** `<div className="rounded-lg border border-[var(--color-status-amber-border)] bg-[var(--color-status-a...`
- **Fix:** Use rounded-full for badges/pills

### 482. Incorrect Border Radius
- **File:** `src/pages/settings/HouseholdPanel.tsx`
- **Line:** 139
- **Code:** `className="flex-1 rounded-lg border border-surface-border bg-surface-base px-4 py-2.5 text-sm text-c...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 483. Incorrect Border Radius
- **File:** `src/pages/settings/HouseholdPanel.tsx`
- **Line:** 154
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-elevated/50 p-4">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 484. Incorrect Border Radius
- **File:** `src/pages/settings/HouseholdPanel.tsx`
- **Line:** 171
- **Code:** `className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 485. Incorrect Border Radius
- **File:** `src/pages/settings/HouseholdPanel.tsx`
- **Line:** 183
- **Code:** `className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-con...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 486. Incorrect Border Radius
- **File:** `src/pages/settings/HouseholdPanel.tsx`
- **Line:** 197
- **Code:** `className="inline-flex items-center gap-2 rounded-lg bg-brand-cta px-4 py-2 text-xs font-medium text...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 487. Incorrect Border Radius
- **File:** `src/pages/settings/HouseholdPanel.tsx`
- **Line:** 227
- **Code:** `className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-base...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 488. Incorrect Border Radius
- **File:** `src/pages/settings/HouseholdPanel.tsx`
- **Line:** 244
- **Code:** `className="ml-3 p-2 text-content-tertiary hover:text-[var(--color-status-rose-text)] hover:bg-[var(-...`
- **Fix:** Use rounded-full for badges/pills

### 489. Incorrect Border Radius
- **File:** `src/pages/settings/HouseholdPanel.tsx`
- **Line:** 263
- **Code:** `<div className="text-center py-8 rounded-lg border border-dashed border-surface-border bg-surface-ra...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 490. Incorrect Border Radius
- **File:** `src/pages/settings/HouseholdPanel.tsx`
- **Line:** 280
- **Code:** `className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-base...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 491. Incorrect Border Radius
- **File:** `src/pages/settings/HouseholdPanel.tsx`
- **Line:** 330
- **Code:** `className="p-2 text-content-tertiary hover:text-[var(--color-status-rose-text)] hover:bg-[var(--colo...`
- **Fix:** Use rounded-full for badges/pills

### 492. Incorrect Border Radius
- **File:** `src/pages/settings/HouseholdPanel.tsx`
- **Line:** 346
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-elevated/50 p-4">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 493. Arbitrary Font Size
- **File:** `src/pages/settings/HouseholdPanel.tsx`
- **Line:** 142
- **Code:** `<span className="text-[10px] font-mono text-content-muted uppercase tracking-widest">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 494. Arbitrary Font Size
- **File:** `src/pages/settings/HouseholdPanel.tsx`
- **Line:** 305
- **Code:** `className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${ge...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 495. Incorrect Border Radius
- **File:** `src/pages/settings/IntegrationsPanel.tsx`
- **Line:** 17
- **Code:** `className="flex min-h-[10rem] items-center justify-center rounded-lg border border-surface-border bg...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 496. Incorrect Border Radius
- **File:** `src/pages/settings/NotificationsPanel.tsx`
- **Line:** 145
- **Code:** `<div className="mb-6 rounded-lg border border-surface-border bg-surface-base p-4 flex flex-col sm:fl...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 497. Incorrect Border Radius
- **File:** `src/pages/settings/NotificationsPanel.tsx`
- **Line:** 168
- **Code:** `className="inline-flex items-center gap-2 rounded-lg bg-brand-cta px-4 py-2.5 text-sm font-medium te...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 498. Incorrect Border Radius
- **File:** `src/pages/settings/NotificationsPanel.tsx`
- **Line:** 186
- **Code:** `className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-raised ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 499. Incorrect Border Radius
- **File:** `src/pages/settings/NotificationsPanel.tsx`
- **Line:** 205
- **Code:** `className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-status-rose-border)]...`
- **Fix:** Use rounded-full for badges/pills

### 500. Arbitrary Font Size
- **File:** `src/pages/settings/NotificationsPanel.tsx`
- **Line:** 137
- **Code:** `<code className="rounded-md border border-surface-border bg-surface-raised px-1.5 py-0.5 font-mono t...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 501. Incorrect Border Radius
- **File:** `src/pages/settings/PrivacyPanel.tsx`
- **Line:** 193
- **Code:** `<div className="border border-surface-border rounded-lg p-4 bg-surface-elevated/50 flex flex-col sm:...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 502. Incorrect Border Radius
- **File:** `src/pages/settings/PrivacyPanel.tsx`
- **Line:** 218
- **Code:** `<div className="rounded-lg border border-[var(--color-status-rose-border)] bg-[var(--color-status-ro...`
- **Fix:** Use rounded-full for badges/pills

### 503. Incorrect Border Radius
- **File:** `src/pages/settings/PrivacyPanel.tsx`
- **Line:** 226
- **Code:** `className="shrink-0 rounded-lg border border-[var(--color-status-rose-border)] bg-surface-base px-4 ...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 504. Arbitrary Font Size
- **File:** `src/pages/settings/ProfilePanel.tsx`
- **Line:** 384
- **Code:** `<p className="text-[11px] font-medium text-content-tertiary">Your Support ID</p>`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 505. Arbitrary Font Size
- **File:** `src/pages/settings/ProfilePanel.tsx`
- **Line:** 396
- **Code:** `<p className="text-[11px] text-content-muted">Share this with our team if you need help.</p>`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 506. Arbitrary Font Size
- **File:** `src/pages/settings/ProfilePanel.tsx`
- **Line:** 435
- **Code:** `<span className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 w-56 -translate-y-1/2 roun...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 507. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 197
- **Code:** `className="flex items-center gap-1.5 rounded-lg bg-brand-cta px-3 py-1.5 text-xs font-medium text-su...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 508. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 213
- **Code:** `className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 509. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 244
- **Code:** `className="rounded-lg bg-brand-cta px-3 py-1.5 text-xs font-medium text-surface-base hover:bg-brand-...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 510. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 258
- **Code:** `className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-content-seco...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 511. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 283
- **Code:** `className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-s...`
- **Fix:** Use rounded-full for badges/pills

### 512. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 300
- **Code:** `className="rounded-lg border border-surface-border bg-surface-raised px-3 py-1.5 text-xs font-medium...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 513. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 314
- **Code:** `className="rounded-lg bg-brand-cta px-3 py-1.5 text-xs font-medium text-surface-base hover:bg-brand-...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 514. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 336
- **Code:** `className="w-full appearance-none rounded-lg border border-surface-border bg-surface-raised px-3 py-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 515. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 347
- **Code:** `className="flex-1 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs font-m...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 516. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 352
- **Code:** `className="w-full appearance-none rounded-lg border border-surface-border bg-surface-raised px-3 py-...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 517. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 376
- **Code:** `className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-cta px-4 py-2 text-sm font-medium te...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 518. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 387
- **Code:** `<div className="mt-3 rounded-lg border border-surface-border bg-surface-raised p-3">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 519. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 415
- **Code:** `<span className="shrink-0 rounded-lg border border-surface-border bg-content-primary/[0.05] px-2 py-...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 520. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 442
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-base p-4 flex items-center justif...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 521. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 454
- **Code:** `className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-elevate...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 522. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 462
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-base p-4 flex items-center justif...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 523. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 472
- **Code:** `className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-elevate...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 524. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 491
- **Code:** `className="flex shrink-0 items-center gap-2 rounded-lg border border-surface-border bg-surface-eleva...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 525. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 507
- **Code:** `className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-cta px-4 py-2 text-sm font-medium te...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 526. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 515
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-base p-4">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 527. Incorrect Border Radius
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 557
- **Code:** `className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-elevate...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 528. Arbitrary Font Size
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 388
- **Code:** `<p className="text-[11px] font-medium text-content-secondary mb-2">Examples</p>`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 529. Arbitrary Font Size
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 415
- **Code:** `<span className="shrink-0 rounded-lg border border-surface-border bg-content-primary/[0.05] px-2 py-...`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 530. Arbitrary Font Size
- **File:** `src/pages/settings/RulesPanel.tsx`
- **Line:** 526
- **Code:** `<p className="text-[11px] text-content-tertiary mt-0.5">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

### 531. Incorrect Border Radius
- **File:** `src/pages/settings/SecurityPanel.tsx`
- **Line:** 50
- **Code:** `<div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-raised px...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 532. Incorrect Border Radius
- **File:** `src/pages/settings/SecurityPanel.tsx`
- **Line:** 57
- **Code:** `<div className="flex items-start gap-3 rounded-lg border border-[var(--color-status-emerald-border)]...`
- **Fix:** Use rounded-full for badges/pills

### 533. Incorrect Border Radius
- **File:** `src/pages/settings/SecurityPanel.tsx`
- **Line:** 79
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-elevated/50 px-4 py-3">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 534. Incorrect Border Radius
- **File:** `src/pages/settings/SecurityPanel.tsx`
- **Line:** 149
- **Code:** `className="mt-1 focus-app-field block w-full sm:text-sm border-surface-border bg-surface-base text-c...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 535. Incorrect Border Radius
- **File:** `src/pages/settings/SecurityPanel.tsx`
- **Line:** 160
- **Code:** `className="mt-1 focus-app-field block w-full sm:text-sm border-surface-border bg-surface-base text-c...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 536. Incorrect Border Radius
- **File:** `src/pages/settings/SecurityPanel.tsx`
- **Line:** 170
- **Code:** `className="mt-1 focus-app-field block w-full sm:text-sm border-surface-border bg-surface-base text-c...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 537. Incorrect Border Radius
- **File:** `src/pages/settings/SecurityPanel.tsx`
- **Line:** 177
- **Code:** `className="flex items-center gap-2 px-4 py-2 bg-brand-cta text-surface-base hover:bg-brand-cta-hover...`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 538. Incorrect Border Radius
- **File:** `src/pages/settings/SecurityPanel.tsx`
- **Line:** 202
- **Code:** `<div className="flex items-start gap-3 border border-surface-border rounded-lg p-4 bg-surface-elevat...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 539. Incorrect Border Radius
- **File:** `src/pages/settings/SecurityPanel.tsx`
- **Line:** 212
- **Code:** `<div className="flex items-start gap-3 border border-surface-border rounded-lg p-4 bg-surface-elevat...`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 540. Incorrect Border Radius
- **File:** `src/pages/settings/SupportPanel.tsx`
- **Line:** 138
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-base p-3 text-sm">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 541. Incorrect Border Radius
- **File:** `src/pages/settings/SupportPanel.tsx`
- **Line:** 144
- **Code:** `<div className="rounded-lg border border-surface-border bg-surface-base p-3 text-sm">`
- **Fix:** Use rounded-xl (12px) for cards/panels

### 542. Incorrect Border Radius
- **File:** `src/pages/settings/SupportPanel.tsx`
- **Line:** 273
- **Code:** `className={`p-1.5 border rounded-lg shrink-0 ${`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 543. Incorrect Border Radius
- **File:** `src/pages/settings/SupportPanel.tsx`
- **Line:** 293
- **Code:** `className={`rounded-lg border px-1.5 py-0.5 text-xs font-medium ${`
- **Fix:** Use rounded-md (6px), rounded-xl (12px), or rounded-full based on component type

### 544. Arbitrary Font Size
- **File:** `src/pages/settings/SupportPanel.tsx`
- **Line:** 236
- **Code:** `<p className="max-w-md text-right text-[11px] text-content-tertiary leading-relaxed">`
- **Fix:** Use design system typography scale (text-xs, text-sm, text-base, etc.)

---

## Coverage Confirmation

✅ **100% Coverage Achieved**

All pages in the following directories have been audited:
- `src/pages/*.tsx` (37 main pages)
- `src/pages/settings/*.tsx` (12 settings panels)
- `src/pages/admin/` (subdirectories)

**Total Files Audited:** 48

---

## Recommendations

1. **Fix Critical First:** Address all hardcoded colors to ensure theme consistency
2. **Standardize Border Radius:** Apply correct radius tokens based on component type
3. **Use Design Tokens:** Replace arbitrary values with standard spacing/typography tokens
4. **Extract Components:** Identify repeated patterns for component extraction
5. **Add ESLint Rules:** Consider adding custom ESLint rules to prevent future violations
