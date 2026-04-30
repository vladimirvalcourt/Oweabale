import type { StateCreator } from 'zustand';
import type { AppState, TabType } from '@/types';

type StoreSlice<T> = StateCreator<AppState, [['zustand/persist', unknown]], [], T>;

export const createUiSlice: StoreSlice<
  Pick<
    AppState,
    | 'addNotification'
    | 'markNotificationsRead'
    | 'clearNotifications'
    | 'isQuickAddOpen'
    | 'quickAddTab'
    | 'openQuickAdd'
    | 'closeQuickAdd'
  >
> = (set) => ({
  addNotification: (note) =>
    set((state) => ({
      notifications: [
        { ...note, id: crypto.randomUUID(), timestamp: new Date().toISOString(), read: false },
        ...state.notifications,
      ].slice(0, 50),
    })),
  markNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
    })),
  clearNotifications: () => set({ notifications: [] }),
  isQuickAddOpen: false,
  quickAddTab: 'obligation',
  openQuickAdd: (tab: TabType = 'obligation') => set({ isQuickAddOpen: true, quickAddTab: tab }),
  closeQuickAdd: () => set({ isQuickAddOpen: false }),
});
