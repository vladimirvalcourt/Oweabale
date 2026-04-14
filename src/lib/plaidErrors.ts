/** User-facing copy for Plaid / Edge Function failures (shared by hooks and tests). */
export function normalizePlaidFlowErrorMessage(message: string): string {
  if (/non-2xx|status code/i.test(message)) {
    return 'Bank linking service is temporarily unavailable. Please retry in a moment.';
  }
  if (/unauthorized|missing authorization/i.test(message)) {
    return 'Your session expired. Refresh the page and sign in again.';
  }
  return message;
}
