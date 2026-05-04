# Code Quality & Architecture Audit: Oweable

## Executive Summary

- **Project**: Oweable — React + Vite + Supabase + TailwindCSS v4
- **Languages**: TypeScript/TSX (255 files, ~41.8K LOC in `src/`)
- **Score**: 72/100 — solid architecture with notable hygiene, dependency, and code-size issues
- **Critical Action Items**: Dependency deduplication (`motion` vs `framer-motion`), page-size decomposition, root-level clutter cleanup

---

## 1. Architecture & Structure

### What’s Strong
- **Feature-based slices** in `src/store/slices/` (Zustand pattern) — clean separation
- **Consistent barrel exports** (`index.ts` in components, lib, store, hooks)
- **Zero deep relative imports** — `no-restricted-imports` ESLint rule enforced; everything uses `@/` aliases
- **Lazy-loaded routes** with per-route `Suspense` + `ErrorBoundary` in `App.tsx`
- **Manual Rollup chunking strategy** in `vite.config.ts` — recharts, motion, supabase, etc. isolated
- **PWA + CSP** configured with dev/prod split in `vite.config.ts`

### Concerns
| Issue | Severity | Detail |
|-------|----------|--------|
| Pages are monolithic | **High** | `Obligations.tsx` (1,284 LOC), `Ingestion.tsx` (894), `Dashboard.tsx` (874). Extract sub-components, custom hooks, and utilities. |
| `src/lib/api/services/finance.ts` is 1,071 LOC | **Medium** | Single file handling too many domains (budgets, amortization, categorization, grouping). Split by domain. |
| Store slices intermix async + sync | **Medium** | `dataSyncSlice.ts` (722 LOC) does heavy Supabase orchestration inline. Extract service layer calls. |

---

## 2. Dependencies & Bundle Hygiene

| Issue | Severity | Detail |
|-------|----------|--------|
| **Duplicate animation libs** | **Critical** | Both `motion` (v12.23) and `framer-motion` (v12.38) installed. Code imports from both (`motion/react` and `framer-motion`). Vite manual chunks try to merge them but they’re **different packages**. Pick one, migrate all imports, drop the other. |
| `react-is` listed in deps | **Medium** | Required peer of `styled-components`; not used directly. Verify if transitive or remove. |
| `express` in frontend deps | **Medium** | Server framework in a Vite SPA. Likely accidental or for a tiny local script. Move to devDeps or isolate in `server/` with its own `package.json`. |
| `dotenv` in frontend deps | **Low** | Vite handles env natively. Likely dead weight. |
| `vite-plugin-pwa` audit warning | **High** | `npm audit` reports **4 high, 1 moderate** via `serialize-javascript` / `workbox-build`. Upgrade or pin patched versions. |

### Suggested `package.json` Cleanup
```
# Remove
- framer-motion  (keep motion)
- express        (move to server/package.json)
- dotenv         (Vite handles this)
- react-is       (if not direct usage)
```

---

## 3. TypeScript & Type Safety

| Metric | Value | Grade |
|--------|-------|-------|
| `any` annotations | ~17 explicit `: any` | B |
| `any` in type positions | 92 total matches | B- |
| `no-explicit-any` | `warn` only | — |

- **No `strict` checked in `tsconfig.json`** — verify it’s enabled. Without strict null checks, many Supabase `.single()` return paths are unsafe.
- `supabase.ts` (auto-generated types?) is 1,202 LOC — if generated, ensure it’s in `.gitattributes` as `linguist-generated`.

---

## 4. Console Noise

| Type | Count | Notes |
|------|-------|-------|
| `console.log` | 59 | Should be stripped from production. ESLint only warns. |
| `console.warn` | 45 | Acceptable for dev, but some may leak in prod. |
| `console.error` | 103 | Often in catch blocks; ensure they’re reported to Sentry, not just logged. |

**Recommendation**: Tighten ESLint to `error` on `no-console`, and provide a wrapped logger that no-ops in production.

---

## 5. Repository Hygiene

| Issue | Severity | Detail |
|-------|----------|--------|
| **61 top-level artifacts** | **High** | Root is cluttered with 45 `.md`, 11 `.sql`, `.html`, `.js`, `.sh` files. Move to `docs/`, `scripts/db/`, or archive. Root should contain only build/config files and README. |
| **Duplicate `.md` audit docs** | **Medium** | `SECURITY_AUDIT.md`, `SECURITY_AUDIT_REPORT.md`, `SECURITY_AUDIT_SUMMARY.md`, `AI_SECURITY_AUDIT_REPORT.md` — consolidate or archive. |
| **`.env` in repo root** | **Medium** | Contains real secrets (Supabase anon key, DB password, Sentry token). It is `.gitignore`d correctly, but still a local security hazard if the repo is copied/shared. Add `.env` to `.gitignore` with a comment, and move secrets to `.env.local` (already ignored). |
| **`.DS_Store` everywhere** | **Low** | `.gitignore` covers it, but files are committed in multiple directories. Run `git rm --cached **/.DS_Store` + add to global ignore. |
| **SQL migration files** | **Medium** | `ALL_MIGRATIONS.sql`, `ENSURE_ALL_TABLES.sql`, `COMPLETE_DB_SETUP.sql` appear redundant. Single source of truth should be `supabase/migrations/`. |

---

## 6. Patterns & Reusability

### Positive
- **Zustand slices** with `persist` and `partialize` — well-configured sessionStorage guard
- **Two-phase data loading** (critical → background) in `dataSyncSlice.ts` — good UX pattern
- **Custom hooks** for domain logic (`useQuickAddOCR`, `usePlaidFlow`, `useDataSync`)
- **Guard components** (`AuthGuard`, `ProPlanGuard`, `DeviceGuard`, `AdminGuard`) — clean RBAC separation

### Negative
- **`App.tsx` is 255 LOC** — routing + redirect logic + helper components in one file. Extract route config and redirect helpers.
- **Multiple inline date helpers** (`startOfLocalDay`, `parseLocalDate`, `addDays`, `daysUntil`) repeated across pages. Consolidate into `src/lib/utils/dates.ts`.
- **`formatCurrency` redefined inline** in `Dashboard.tsx` (lines 89–99) alongside the imported `formatCurrency` from utils — risk of drift.
- **Supabase client timeout wrapper** duplicates AbortController logic that could be a shared fetch interceptor.

---

## 7. Testing

| Metric | Value |
|--------|-------|
| Test files | 2 (`budgetPeriods.test.ts`, `finance.test.ts`, `useStore.test.ts`) |
| Test runner | Vitest |
| Coverage | Very low (3 test files for 255 source files) |

**Gap**: No component tests, no E2E, no store slice tests. `src/` contains 255 files; tests should be ~5–10% of that count minimum.

---

## 8. Performance Configuration

- **Chunk budget** raised to 1,400 KB due to PDF.js worker — acceptable tradeoff, but document it
- **CSS code-splitting enabled**
- **`modulePreload.polyfill: false`** — good for modern browsers
- **Deferred analytics + web vitals** in `main.tsx` — solid pattern
- **PWA precache** excludes heavy libs (charts, PDF, motion) — correct

---

## Priority Action Plan

### Immediate (this week)
1. **Pick one animation library** — migrate all `framer-motion` imports to `motion/react` (or vice versa), remove the other from `package.json`, run `npm audit fix`.
2. **Archive root-level docs/SQL** — move all `.md` and `.sql` not essential for CI into `docs/archive/` and `scripts/db/`.
3. **Split `Obligations.tsx`** — extract table, filters, calculator, and chart into sub-components.

### Short-term (next sprint)
4. **Extract shared date/currency helpers** — deduplicate inline `formatCurrency`, `addDays`, etc.
5. **Move `express` out of frontend deps** — isolate `server/` with its own `package.json`.
6. **Add component + store tests** — aim for 10% file coverage.
7. **Consolidate security audit docs** — keep one canonical file, archive the rest.

### Medium-term
8. **Enable `strict` in `tsconfig.json`** and fix resulting errors.
9. **Add `linguist-generated` for `supabase.ts`** in `.gitattributes`.
10. **Create a shared `logger.ts`** that respects `import.meta.env.PROD`.

---

## Files to Review First

1. `src/pages/Obligations.tsx` (1,284 LOC)
2. `src/lib/api/services/finance.ts` (1,071 LOC)
3. `src/pages/Ingestion.tsx` (894 LOC)
4. `src/pages/Dashboard.tsx` (874 LOC)
5. `src/store/slices/dataSyncSlice.ts` (722 LOC)
6. `src/App.tsx` (255 LOC — route bloat)
7. `package.json` (dependency cleanup)
8. Root directory (clutter cleanup)
