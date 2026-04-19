/** Best-effort gig / platform label from merchant or transaction name. */
export function suggestPlatformFromMerchant(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('uber')) return 'Uber';
  if (n.includes('lyft')) return 'Lyft';
  if (n.includes('doordash') || n.includes('door dash')) return 'DoorDash';
  if (n.includes('grubhub')) return 'Grubhub';
  if (n.includes('instacart')) return 'Instacart';
  if (n.includes('stripe')) return 'Stripe';
  if (n.includes('upwork')) return 'Upwork';
  if (n.includes('fiverr')) return 'Fiverr';
  if (n.includes('taskrabbit')) return 'Taskrabbit';
  if (n.includes('amazon flex') || n.includes('amazonflex')) return 'Amazon Flex';
  return '';
}
