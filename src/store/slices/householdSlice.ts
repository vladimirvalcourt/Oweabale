import type { StateCreator } from 'zustand';
import { toast } from 'sonner';
import { supabase } from '../../lib/api/supabase';
import type { AppState } from '../types';

type StoreSlice<T> = StateCreator<AppState, [['zustand/persist', unknown]], [], T>;

export const createHouseholdSlice: StoreSlice<
  Pick<
    AppState,
    'inviteHouseholdMember' | 'removeHouseholdMember' | 'updateMemberRole' | 'acceptHouseholdInvite'
  >
> = (set, get) => ({
  inviteHouseholdMember: async (email: string, role: 'partner' | 'viewer') => {
    const household = get().currentHousehold;
    if (!household) {
      toast.error('No active household');
      return false;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be signed in');
        return false;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/household-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          householdId: household.id,
          email,
          role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.alreadyExists) {
          toast.warning('This person has already been invited');
        } else {
          toast.error(result.error || 'Failed to send invite');
        }
        return false;
      }

      toast.success(`Invite sent to ${email}`);
      await get().fetchData(undefined, { background: true });
      return true;
    } catch (error) {
      console.error('[inviteHouseholdMember]', error);
      toast.error('Failed to send invite');
      return false;
    }
  },

  removeHouseholdMember: async (memberId: string) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return false;

      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('id', memberId)
        .eq('household_id', get().currentHousehold?.id ?? '');

      if (error) {
        toast.error('Failed to remove member');
        return false;
      }

      set((state) => ({
        householdMembers: state.householdMembers.filter((member) => member.id !== memberId),
      }));

      toast.success('Member removed');
      return true;
    } catch (error) {
      console.error('[removeHouseholdMember]', error);
      toast.error('Failed to remove member');
      return false;
    }
  },

  updateMemberRole: async (memberId: string, role: 'partner' | 'viewer') => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return false;

      const { error } = await supabase
        .from('household_members')
        .update({ role })
        .eq('id', memberId)
        .eq('household_id', get().currentHousehold?.id ?? '');

      if (error) {
        toast.error('Failed to update role');
        return false;
      }

      set((state) => ({
        householdMembers: state.householdMembers.map((member) =>
          member.id === memberId ? { ...member, role } : member,
        ),
      }));

      toast.success('Role updated');
      return true;
    } catch (error) {
      console.error('[updateMemberRole]', error);
      toast.error('Failed to update role');
      return false;
    }
  },

  acceptHouseholdInvite: async (householdId: string) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return false;

      const { error } = await supabase
        .from('household_members')
        .update({
          status: 'accepted',
          user_id: userId,
          joined_at: new Date().toISOString(),
        })
        .eq('household_id', householdId)
        .eq('user_id', userId);

      if (error) {
        toast.error('Failed to accept invite');
        return false;
      }

      toast.success('Welcome to the household!');
      await get().fetchData(undefined, { background: false });
      return true;
    } catch (error) {
      console.error('[acceptHouseholdInvite]', error);
      toast.error('Failed to accept invite');
      return false;
    }
  },
});
