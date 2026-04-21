/**
 * Household and member types for multi-user support
 */

export interface Household {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string | null;
  role: 'owner' | 'partner' | 'viewer';
  invited_email: string | null;
  status: 'pending' | 'accepted';
  joined_at: string | null;
  // Enriched fields from profiles join
  email?: string | null;
  first_name?: string | null;
  avatar_url?: string | null;
}

export type UserRole = 'owner' | 'partner' | 'viewer';
