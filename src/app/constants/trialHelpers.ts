import { supabase } from '../../lib/api/supabase';

export type UserPlan = 'tracker' | 'trial' | 'full_suite';

export interface UserProfile {
  id: string;
  plan: UserPlan;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  trial_expired: boolean;
}

/**
 * Get user's current plan status
 * Returns 'trial' if trial is active, 'full_suite' if paid, 'tracker' otherwise
 */
export async function getUserPlan(userId: string): Promise<UserPlan> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('plan, trial_ends_at, trial_expired')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.error('Failed to fetch user plan:', error);
      return 'tracker';
    }

    // If user is on trial, check if it's still active
    if (profile.plan === 'trial') {
      if (profile.trial_expired) {
        return 'tracker';
      }
      
      const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
      const now = new Date();
      
      if (trialEndsAt && now < trialEndsAt) {
        return 'trial';
      }
      
      // Trial has expired but hasn't been processed by cron yet
      return 'tracker';
    }

    return profile.plan as UserPlan;
  } catch (error) {
    console.error('Error getting user plan:', error);
    return 'tracker';
  }
}

/**
 * Get number of days remaining in trial
 * Returns 0 if not on trial or trial has expired
 */
export async function getTrialDaysRemaining(userId: string): Promise<number> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('trial_ends_at, trial_expired, plan')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return 0;
    }

    // Not on trial or already expired
    if (profile.plan !== 'trial' || profile.trial_expired) {
      return 0;
    }

    const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
    if (!trialEndsAt) {
      return 0;
    }

    const now = new Date();
    const diffTime = trialEndsAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  } catch (error) {
    console.error('Error getting trial days remaining:', error);
    return 0;
  }
}

/**
 * Check if user has access to Full Suite features
 * Returns true for both trial and full_suite users
 */
export async function hasFullSuiteAccess(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId);
  return plan === 'trial' || plan === 'full_suite';
}

/**
 * Get complete user profile with plan info
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, plan, trial_started_at, trial_ends_at, trial_expired')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return null;
    }

    return profile as UserProfile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}
