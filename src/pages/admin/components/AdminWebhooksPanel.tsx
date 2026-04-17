import { Zap } from 'lucide-react';

interface Props {
  webhooks: Array<{
    id: string;
    stripe_event_id: string;
    event_type: string;
    processed_at: string;
  }>;
}

function getEventColor(eventType: string): string {
  if (
    eventType === 'payment_intent.succeeded' ||
    eventType === 'invoice.paid' ||
    eventType === 'customer.subscription.created'
  ) {
    return 'bg-green-400';
  }
  if (
    eventType === 'customer.subscription.updated' ||
    eventType === 'customer.subscription.deleted'
  ) {
    return 'bg-amber-400';
  }
  if (eventType.includes('failed') || eventType.includes('error')) {
    return 'bg-rose-400';
  }
  return 'bg-content-tertiary';
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminWebhooksPanel({ webhooks }: Props) {
  return (
    <div className="border border-surface-border rounded-sm bg-surface-raised p-5">
      <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4" /> Stripe Webhooks
      </h2>

      {webhooks.length === 0 ? (
        <p className="text-[11px] text-content-tertiary">No webhook events recorded.</p>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-content-tertiary border-b border-surface-border">
                <th className="text-left pb-1.5 font-medium">Event Type</th>
                <th className="text-left pb-1.5 font-medium">Event ID</th>
                <th className="text-left pb-1.5 font-medium">Processed At</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((wh) => (
                <tr key={wh.id} className="border-b border-surface-border/50 last:border-0">
                  <td className="py-1.5 pr-3 text-content-secondary">
                    <span
                      className={`w-1.5 h-1.5 rounded-full inline-block mr-1 ${getEventColor(wh.event_type)}`}
                    />
                    {wh.event_type}
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-content-tertiary">
                    {wh.stripe_event_id.slice(0, 24)}
                  </td>
                  <td className="py-1.5 text-content-tertiary whitespace-nowrap">
                    {formatDateTime(wh.processed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
