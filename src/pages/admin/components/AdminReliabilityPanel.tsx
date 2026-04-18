import { Activity, ShieldAlert } from 'lucide-react';
import type { AdminAuditEntry, StripeHealthStats } from './types';

type Props = {
  stripeHealth: StripeHealthStats | null;
  auditFeed: AdminAuditEntry[];
};

export function AdminReliabilityPanel({ stripeHealth, auditFeed }: Props) {
  return (
    <div className="space-y-6">
      <div className="border border-surface-border rounded-lg bg-surface-raised p-5">
        <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4" /> Stripe / Webhook Health
        </h2>
        {!stripeHealth ? (
          <p className="text-xs text-content-muted">No health data yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-surface-border bg-surface-base p-2">
              <p className="text-content-tertiary">Events (24h)</p>
              <p className="text-content-primary font-semibold mt-1">{stripeHealth.stripe_events_24h}</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-base p-2">
              <p className="text-content-tertiary">Webhook errors (24h)</p>
              <p className="text-content-primary font-semibold mt-1">{stripeHealth.webhook_errors_24h}</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-base p-2">
              <p className="text-content-tertiary">Active subscriptions</p>
              <p className="text-content-primary font-semibold mt-1">{stripeHealth.active_subscriptions}</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-base p-2">
              <p className="text-content-tertiary">Last webhook</p>
              <p className="text-content-primary font-semibold mt-1">
                {stripeHealth.last_webhook_at ? new Date(stripeHealth.last_webhook_at).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>
        )}
        {stripeHealth?.last_webhook_event_type && (
          <p className="text-[11px] text-content-tertiary mt-3">
            Last event type:{' '}
            <span className="text-content-secondary">{String(stripeHealth.last_webhook_event_type)}</span>
          </p>
        )}
      </div>

      <div className="border border-surface-border rounded-lg bg-surface-raised p-5">
        <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-4">
          <ShieldAlert className="w-4 h-4" /> Admin Action Audit Feed
        </h2>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {auditFeed.length === 0 && <p className="text-xs text-content-muted">No admin actions logged yet.</p>}
          {auditFeed.map((entry) => (
            <div key={entry.id} className="border border-surface-border rounded-lg p-2 bg-surface-base">
              <p className="text-[11px] text-content-primary font-semibold">{entry.action}</p>
              <p className="text-[10px] text-content-tertiary">{new Date(entry.created_at).toLocaleString()}</p>
              {typeof entry.new_data?.actorEmail !== 'undefined' && (
                <p className="text-[10px] text-content-tertiary mt-1">
                  actor: {String(entry.new_data.actorEmail)}
                </p>
              )}
              {typeof entry.new_data?.requestIp !== 'undefined' && (
                <p className="text-[10px] text-content-tertiary">
                  ip: {String(entry.new_data.requestIp)}
                </p>
              )}
              {typeof entry.new_data?.userAgent !== 'undefined' && (
                <p className="text-[10px] text-content-tertiary truncate" title={String(entry.new_data.userAgent)}>
                  ua: {String(entry.new_data.userAgent)}
                </p>
              )}
              {typeof entry.new_data?.targetUserId !== 'undefined' && (
                <p className="text-[10px] text-content-tertiary mt-1">
                  target: {String(entry.new_data.targetUserId)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
