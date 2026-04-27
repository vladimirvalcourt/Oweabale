import type { StateCreator } from 'zustand';
import type { AppState } from '../types';

export type StoreSlice<T> = StateCreator<AppState, [['zustand/persist', unknown]], [], T>;

export function isFullSuiteRlsDenied(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  const message = String((error as { message?: string }).message || '').toLowerCase();
  return code === '42501' || message.includes('row-level security');
}
