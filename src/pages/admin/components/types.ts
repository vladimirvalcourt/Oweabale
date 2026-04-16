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
