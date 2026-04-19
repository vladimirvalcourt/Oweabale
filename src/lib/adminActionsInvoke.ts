/**
 * Supabase `functions.invoke` often returns a generic message on non-2xx; the Edge Function
 * body usually includes `{ error: string }` with the real reason.
 */
export function getAdminActionErrorMessage(result: {
  data: unknown;
  error: { message?: string } | null;
}): string {
  const d = result.data;
  if (
    d &&
    typeof d === 'object' &&
    'error' in d &&
    typeof (d as { error?: unknown }).error === 'string'
  ) {
    return (d as { error: string }).error;
  }
  return result.error?.message ?? 'Request failed';
}
