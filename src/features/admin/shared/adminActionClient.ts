import { supabase } from '../../../lib/api/supabase';
import { getAdminActionErrorMessage } from '../../../lib/api/adminActions';

export async function invokeAdminAction<T>(body: Record<string, unknown>): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not signed in');

  const result = await supabase.functions.invoke('admin-actions', {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (result.error) throw new Error(getAdminActionErrorMessage(result));
  return result.data as T;
}
