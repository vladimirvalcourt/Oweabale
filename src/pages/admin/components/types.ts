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
  updated_at?: string;
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

export interface AdminFeedbackEntry {
  id: string;
  user_id: string;
  type: string;
  rating: number | null;
  message: string;
  created_at: string;
  userEmail: string;
}

export interface AdminBroadcastRow {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'error';
  created_at: string;
}

export interface AdminChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  mode: 'advisor' | 'academy';
  created_at: string;
  userEmail: string;
}

export interface AdminAiLearningProfile {
  user_id: string;
  familiarity_level: 'beginner' | 'intermediate' | 'advanced';
  preferred_style: 'plain_language' | 'step_by_step' | 'concise';
  topics_covered: string[];
  recent_focus: string[];
  total_lessons: number;
  total_messages: number;
  updated_at: string;
  userEmail: string;
}

export interface AdminInvestmentAccount {
  id: string;
  user_id: string;
  name: string;
  type: string;
  institution: string | null;
  balance: number;
  last_updated: string;
  userEmail: string;
}

export interface AdminInsurancePolicy {
  id: string;
  user_id: string;
  type: string;
  provider: string;
  premium: number;
  frequency: string;
  status: string;
  updated_at: string;
  userEmail: string;
}

export interface AdminPendingIngestion {
  id: string;
  user_id: string;
  type: string;
  status: string | null;
  source: string | null;
  created_at: string;
  storage_path: string | null;
  userEmail: string;
}

export interface AdminCaptureSession {
  id: string;
  user_id: string;
  status: 'idle' | 'pending' | 'active' | 'completed' | 'error';
  uploaded_file_url: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  userEmail: string;
}
