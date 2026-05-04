import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type CategorizationRule, type CategorizationExclusion } from '@/lib/api/services/categorizationRules';
import { type FinancialAlertPrefs } from '@/lib/api/services/financialAlertPrefs';
import { initialData } from './initialState';
import { createAccountSlice } from './slices/accountSlice';
import { createCategorizationSlice } from './slices/categorizationSlice';
import { createDataSyncSlice } from './slices/dataSyncSlice';
import { createEarningsSlice } from './slices/earningsSlice';
import { createIngestionSlice } from './slices/ingestionSlice';
import { createObligationsSlice } from './slices/obligationsSlice';
import { createPlaidSlice } from './slices/plaidSlice';
import { createPlanningSlice } from './slices/planningSlice';
import { createRecordsSlice } from './slices/recordsSlice';
import { createUiSlice } from './slices/uiSlice';
import { createWealthSlice } from './slices/wealthSlice';
import type { AppState } from './types';
export type { CategorizationRule, CategorizationExclusion };
export type { FinancialAlertPrefs };
export type * from './types';

export const useStore = create<AppState>()(
  persist(
    (set, get, store) => ({
      ...initialData,
      ...createUiSlice(set, get, store),
      ...createAccountSlice(set, get, store),
      ...createPlaidSlice(set, get, store),
      ...createRecordsSlice(set, get, store),
      ...createObligationsSlice(set, get, store),
      ...createPlanningSlice(set, get, store),
      ...createEarningsSlice(set, get, store),
      ...createCategorizationSlice(set, get, store),
      ...createWealthSlice(set, get, store),
      ...createIngestionSlice(set, get, store),
      ...createDataSyncSlice(set, get, store),

    }),
    {
      name: 'oweable-store-persistence',
      // Safe sessionStorage wrapper — if the browser quota is exceeded (5 MB)
      // the write is silently skipped so fetchData never crashes.
      storage: createJSONStorage(() => ({
        getItem: (key: string) => {
          try { return sessionStorage.getItem(key); } catch { return null; }
        },
        setItem: (key: string, value: string) => {
          try { sessionStorage.setItem(key, value); } catch { /* quota exceeded — skip, app still works */ }
        },
        removeItem: (key: string) => {
          try { sessionStorage.removeItem(key); } catch { /* ignore */ }
        },
      })),
      // Persist ONLY the tiny identity shell needed to render the UI before
      // fetchData() completes. Financial data (bills, debts, transactions, etc.)
      // is always re-fetched from Supabase on every authenticated session.
      // Categories are excluded — they are re-fetched quickly and excluding
      // them keeps the persisted payload well under the 5 MB sessionStorage quota.
      partialize: (state) => ({
        user: {
          id: state.user.id,
          firstName: state.user.firstName,
          lastName: state.user.lastName,
          email: state.user.email,
          avatar: state.user.avatar,
          theme: state.user.theme,
          isAdmin: state.user.isAdmin,
        },
      }),
      merge: (persisted, current) => {
        const c = current as AppState;
        if (!persisted || typeof persisted !== 'object') return c;
        const p = persisted as Partial<AppState>;
        const pu = p.user;
        if (!pu) return { ...c, ...p } as AppState;
        const { hasCompletedOnboarding: _ignored, ...userRest } = pu as typeof c.user & {
          hasCompletedOnboarding?: boolean;
        };
        return {
          ...c,
          ...p,
          user: {
            ...c.user,
            ...userRest,
            hasCompletedOnboarding: c.user.hasCompletedOnboarding,
          },
        };
      },
    }
  )
);
