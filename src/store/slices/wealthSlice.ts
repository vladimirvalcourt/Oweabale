import type { StateCreator } from 'zustand';
import { toast } from 'sonner';
import { supabase } from '@/lib/api/supabase';
import type { AppState } from '@/types';

type StoreSlice<T> = StateCreator<AppState, [['zustand/persist', unknown]], [], T>;

export const createWealthSlice: StoreSlice<
  Pick<
    AppState,
    | 'updateCreditScore'
    | 'addCreditFix'
    | 'updateCreditFix'
    | 'deleteCreditFix'
    | 'addAsset'
    | 'editAsset'
    | 'deleteAsset'
  >
> = (set) => ({
  addAsset: async (asset) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      let newId = crypto.randomUUID();
      if (userId) {
        const { data, error } = await supabase
          .from('assets')
          .insert({
            user_id: userId,
            name: asset.name,
            value: asset.value,
            type: asset.type,
            appreciation_rate: asset.appreciationRate ?? null,
            purchase_price: asset.purchasePrice ?? null,
            purchase_date: asset.purchaseDate ?? null,
          })
          .select('id')
          .single();
        if (error) {
          toast.error('Failed to save asset.');
          return false;
        }
        if (data?.id) newId = data.id;
      }
      set((state) => ({ assets: [...state.assets, { ...asset, id: newId }] }));
      return true;
    } catch (error) {
      console.error('[addAsset]', error);
      toast.error('Failed to save asset.');
      return false;
    }
  },

  editAsset: async (id, asset) => {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (userId) {
      const updates: Record<string, unknown> = {};
      if (asset.name !== undefined) updates.name = asset.name;
      if (asset.value !== undefined) updates.value = asset.value;
      if (asset.type !== undefined) updates.type = asset.type;
      if (asset.appreciationRate !== undefined) updates.appreciation_rate = asset.appreciationRate;
      if (asset.purchasePrice !== undefined) updates.purchase_price = asset.purchasePrice;
      if (asset.purchaseDate !== undefined) updates.purchase_date = asset.purchaseDate;
      const { error } = await supabase.from('assets').update(updates).eq('id', id).eq('user_id', userId);
      if (error) {
        toast.error('Failed to update asset.');
        return;
      }
    }
    set((state) => ({ assets: state.assets.map((item) => (item.id === id ? { ...item, ...asset } : item)) }));
  },

  deleteAsset: async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (userId) {
        const { error } = await supabase.from('assets').delete().eq('id', id).eq('user_id', userId);
        if (error) {
          toast.error('Failed to delete asset.');
          return false;
        }
      }
      set((state) => ({ assets: state.assets.filter((asset) => asset.id !== id) }));
      return true;
    } catch (error) {
      console.error('[deleteAsset]', error);
      toast.error('Failed to delete asset.');
      return false;
    }
  },

  updateCreditScore: async (score) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const now = new Date().toISOString();
    if (userId) {
      await supabase.from('profiles').update({ credit_score: score, credit_last_updated: now }).eq('id', userId);
    }
    set((state) => ({ credit: { ...state.credit, score, lastUpdated: now } }));
  },

  addCreditFix: async (fix) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    let newId = crypto.randomUUID();
    if (userId) {
      const { item: item_type, ...rest } = fix;
      const { data, error } = await supabase.from('credit_fixes').insert({ ...rest, item_type, user_id: userId }).select('id').single();
      if (error) {
        toast.error('Failed to save credit fix');
        return;
      }
      if (data?.id) newId = data.id;
    }
    set((state) => ({ credit: { ...state.credit, fixes: [...state.credit.fixes, { ...fix, id: newId }] } }));
  },

  updateCreditFix: async (id, updates) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const { item: item_type, ...dbUpdates } = updates as Record<string, unknown>;
      const payload = item_type !== undefined ? { ...dbUpdates, item_type } : dbUpdates;
      await supabase.from('credit_fixes').update(payload).eq('id', id).eq('user_id', userId);
    }
    set((state) => ({
      credit: {
        ...state.credit,
        fixes: state.credit.fixes.map((fix) => (fix.id === id ? { ...fix, ...updates } : fix)),
      },
    }));
  },

  deleteCreditFix: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from('credit_fixes').delete().eq('id', id).eq('user_id', userId);
    }
    set((state) => ({ credit: { ...state.credit, fixes: state.credit.fixes.filter((fix) => fix.id !== id) } }));
  },
});
