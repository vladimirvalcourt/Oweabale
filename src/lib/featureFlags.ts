/**
 * Set `VITE_PLAID_LINK_UI_ENABLED=true` in `.env` when Plaid bank linking is ready for users.
 * When unset or false, Settings → Integrations shows a coming-soon state (no Plaid Link).
 */
export function isPlaidLinkUiEnabled(): boolean {
  return import.meta.env.VITE_PLAID_LINK_UI_ENABLED === 'true';
}
