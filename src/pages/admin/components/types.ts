export interface EnrichedUser {
  id: string;
  email: string;
  last_sign_in_at: string | null;
}

export interface ProfileRow {
  id: string;
  email: string | null;
  is_admin: boolean;
  is_banned: boolean;
  has_completed_onboarding: boolean;
  created_at: string | null;
}

export interface PlaidHealthStats {
  total_items: number;
  distinct_users: number;
  items_with_sync_error: number;
  items_needing_relink: number;
  items_never_synced: number;
  items_stale_24h: number;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  priority: 'Low' | 'Normal' | 'Urgent';
  status: string;
  created_at: string;
  user_id: string;
  userEmail?: string;
}

export interface StripeHealthStats {
  stripe_events_24h: number;
  webhook_errors_24h: number;
  active_subscriptions: number;
  last_webhook_event_type: string | null;
  last_webhook_at: string | null;
}

export interface AdminAuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export interface BillingPaymentRow {
  id: string;
  user_id: string;
  amount_total: number;
  currency: string;
  status: string;
  product_key: string | null;
  created_at: string;
}

export interface BillingStats {
  subscription_counts: Record<string, number>;
  total_revenue_cents: number;
  revenue_30d_cents: number;
  failed_payments_30d: number;
  recent_payments: BillingPaymentRow[];
}

export interface ChurnStats {
  total_canceled: number;
  active_subscriptions: number;
  canceled_30d: number;
  churn_rate: number;
  recent_churns: { email: string | null; canceled_at: string | null }[];
}

export interface UserSubscription {
  plan: string;
  status: string;
}

export interface PlaidItemRow {
  id: string;
  user_id: string;
  userEmail: string;
  institution_name: string | null;
  last_sync_at: string | null;
  last_sync_error: string | null;
  item_login_required: boolean;
  last_webhook_at: string | null;
  created_at: string;
}
